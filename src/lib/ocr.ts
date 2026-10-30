import Tesseract from "tesseract.js";
import { parseTransactionsFromText, type Transaction } from "./pdfParser";

const DEFAULT_PDFJS_VERSION = "3.11.174";
const pdfJsCdnBase = process.env.NEXT_PUBLIC_PDFJS_CDN_BASE?.trim() || `https://cdn.jsdelivr.net/npm/pdfjs-dist@${DEFAULT_PDFJS_VERSION}/build`;
const PDFJS_CDN_URL = `${pdfJsCdnBase}/pdf.min.js`;
const PDFJS_WORKER_CDN_URL = `${pdfJsCdnBase}/pdf.worker.min.js`;

interface PdfJsTextItem {
  str?: string;
  hasEOL?: boolean;
}

interface PdfJsLib {
  getDocument(src: { data: ArrayBuffer }): PdfDocumentLoadingTask;
  GlobalWorkerOptions: { workerSrc: string };
}
interface PdfDocumentLoadingTask {
  promise: Promise<PdfDocumentProxy>;
}
interface PdfDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPage>;
  destroy(): Promise<void>;
}
interface PdfPage {
  getViewport(opts: { scale: number }): { width: number; height: number };
  render(opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): { promise: Promise<void> };
  getTextContent(): Promise<{ items: PdfJsTextItem[] }>;
  cleanup(): boolean;
}

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
  }
}

export interface ProcessedDocumentResult {
  transactions: Transaction[];
  rawText: string;
  method: "text" | "ocr";
  textLength: number;
  pageCount: number;
  ocrPages: number;
}

/**
 * Loads pdf.js lazily in the browser.
 *
 * We keep this dynamic because the library depends on browser globals and would
 * otherwise break server-side rendering in Next.js. The worker path is also set
 * here so the rest of the pipeline can stay focused on extraction logic.
 */
function loadPdfJs(): Promise<PdfJsLib> {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }

    const script = document.createElement("script");
    script.src = PDFJS_CDN_URL;
    script.onload = () => {
      const pdfjsLib = window.pdfjsLib;
      if (!pdfjsLib) {
        reject(new Error("pdfjsLib not found on window after script load"));
        return;
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN_URL;
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error(`Failed to load pdfjs-dist from ${PDFJS_CDN_URL}`));
    document.head.appendChild(script);
  });
}

function loadPdf(file: File): Promise<PdfDocumentProxy> {
  return loadPdfJs().then(async (pdfjsLib) => {
    const arrayBuffer = await file.arrayBuffer();
    return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  });
}

/**
 * Reads a PDF's embedded text layer page by page.
 *
 * This is the fast path and should win whenever the statement is a normal,
 * digitally generated PDF. We preserve line breaks loosely because the parser
 * relies on line structure to find dates, descriptions, and money values.
 */
async function extractEmbeddedText(
  pdf: PdfDocumentProxy,
  onProgress?: (status: string, page?: number, total?: number) => void
): Promise<string[]> {
  const chunks: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    onProgress?.(`Reading embedded text (${pageNumber}/${pdf.numPages})…`, pageNumber, pdf.numPages);
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => (item.str ?? "") + (item.hasEOL ? "\n" : " "))
      .join("")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    chunks.push(pageText);
  }

  return chunks;
}

/**
 * Render and recognize just one page at a time. A single Tesseract worker is
 * reused for the document, avoiding a new WASM engine and an entire page-canvas
 * collection for each scanned statement.
 */
async function ocrPdfPages(
  pdf: PdfDocumentProxy,
  pageNumbers: number[],
  onProgress?: (status: string, page?: number, total?: number) => void
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  let activePage = 0;
  let worker: Awaited<ReturnType<typeof Tesseract.createWorker>> | null = null;

  try {
    for (const pageNumber of pageNumbers) {
      activePage = pageNumber;
      onProgress?.(`Rendering page ${pageNumber}/${pdf.numPages} for OCR…`, pageNumber, pdf.numPages);
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");

      try {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not create canvas context for OCR rendering.");

        await page.render({ canvasContext: context, viewport }).promise;

        if (!worker) {
          onProgress?.("Initializing OCR engine…", pageNumber, pdf.numPages);
          worker = await Tesseract.createWorker("eng", 1, {
            logger: (message) => {
              if (message.status === "recognizing text") {
                onProgress?.(`Scanning page ${activePage}/${pdf.numPages}…`, activePage, pdf.numPages);
              }
            },
          });
        }

        const result = await worker.recognize(canvas);
        results.set(pageNumber, result.data.text);
      } finally {
        // Returning canvas dimensions to zero releases its large pixel buffer.
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    }
  } finally {
    // Terminate even if OCR fails midway; no worker survives the document.
    await worker?.terminate();
  }

  return results;
}

/**
 * Decides whether the embedded text result is trustworthy enough to skip OCR.
 *
 * Statement PDFs often include a technically valid text layer that is still too
 * sparse or too mangled to parse. We fallback when the text is obviously thin or
 * when it contains too little numeric structure to represent transaction rows.
 */
function shouldFallbackToOcr(rawText: string, transactions: Transaction[]): boolean {
  const normalizedLength = rawText.replace(/\s+/g, "").length;
  if (normalizedLength < 120) return true;
  if (transactions.length > 0) return false;

  const digits = (rawText.match(/\d/g) || []).length;
  const moneyLike = (rawText.match(/[\d,]+\.\d{2}/g) || []).length;

  return digits < 40 || moneyLike < 3 || normalizedLength < 500;
}

/**
 * End-to-end document pipeline for one statement PDF.
 *
 * Order matters:
 * 1. load the PDF
 * 2. try embedded text first
 * 3. parse transactions from that text
 * 4. only then fallback to OCR when the fast path looks unreliable
 */
export async function processStatementFile(
  file: File,
  onProgress?: (status: string, page?: number, total?: number) => void
): Promise<ProcessedDocumentResult> {
  onProgress?.("Loading PDF…");
  const pdf = await loadPdf(file);

  try {
    onProgress?.("Trying embedded text first…");
    const embeddedPages = await extractEmbeddedText(pdf, onProgress);
    const embeddedText = embeddedPages.join("\n\n").trim();
    const embeddedTransactions = embeddedText ? parseTransactionsFromText(embeddedText) : [];
    const fullFallback = shouldFallbackToOcr(embeddedText, embeddedTransactions);

    // Even when most pages have usable text, a scanned page can be nearly
    // empty. OCR only those sparse pages so mixed PDFs do not lose transactions.
    const sparsePages = embeddedPages
      .map((text, index) => ({ page: index + 1, length: text.replace(/\s+/g, "").length }))
      .filter(({ length }) => length < 120)
      .map(({ page }) => page);
    const pagesToOcr = fullFallback
      ? Array.from({ length: pdf.numPages }, (_, index) => index + 1)
      : sparsePages;

    if (pagesToOcr.length === 0) {
      return {
        transactions: embeddedTransactions,
        rawText: embeddedText,
        method: "text",
        textLength: embeddedText.length,
        pageCount: pdf.numPages,
        ocrPages: 0,
      };
    }

    onProgress?.(
      fullFallback
        ? "Text layer was not usable. Falling back to OCR…"
        : `Scanning ${pagesToOcr.length} page(s) without usable text…`
    );
    const ocrPages = await ocrPdfPages(pdf, pagesToOcr, onProgress);

    // Keep the original order and the embedded text from pages not scanned.
    // If OCR cannot read a particular page, retain any existing text instead.
    const combinedText = embeddedPages
      .map((text, index) => {
        const recognized = ocrPages.get(index + 1)?.trim() || "";
        return recognized.length >= 20 ? recognized : text;
      })
      .join("\n\n")
      .trim();

    if (combinedText.length < 20) {
      throw new Error("Could not extract readable text from this PDF.");
    }

    const transactions = parseTransactionsFromText(combinedText);

    // A noisy OCR result should never erase transactions already extracted
    // successfully from the embedded text layer.
    if (transactions.length < embeddedTransactions.length) {
      return {
        transactions: embeddedTransactions,
        rawText: embeddedText,
        method: "text",
        textLength: embeddedText.length,
        pageCount: pdf.numPages,
        ocrPages: pagesToOcr.length,
      };
    }

    return {
      transactions,
      rawText: combinedText,
      method: "ocr",
      textLength: combinedText.length,
      pageCount: pdf.numPages,
      ocrPages: pagesToOcr.length,
    };
  } finally {
    // Release pdf.js buffers and worker on success and on failure.
    await pdf.destroy();
  }
}
