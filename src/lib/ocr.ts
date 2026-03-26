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
}
interface PdfPage {
  getViewport(opts: { scale: number }): { width: number; height: number };
  render(opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): { promise: Promise<void> };
  getTextContent(): Promise<{ items: PdfJsTextItem[] }>;
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
): Promise<string> {
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

  return chunks.join("\n\n").trim();
}

/**
 * Renders each PDF page onto a canvas so Tesseract can OCR it.
 *
 * The scale of 2 is a compromise: sharper than 1x for OCR accuracy without
 * exploding memory usage too badly on multi-page statements.
 */
async function renderPdfToImages(
  pdf: PdfDocumentProxy,
  onProgress?: (page: number, total: number) => void
): Promise<HTMLCanvasElement[]> {
  const canvases: HTMLCanvasElement[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    onProgress?.(pageNumber, pdf.numPages);

    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create canvas context for OCR rendering.");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    canvases.push(canvas);
  }

  return canvases;
}

/**
 * OCRs pre-rendered canvases one page at a time.
 *
 * We intentionally keep this sequential. Running multiple OCR jobs in parallel
 * can blow up memory on real-world laptops and often feels slower overall.
 */
async function ocrCanvases(
  canvases: HTMLCanvasElement[],
  onProgress?: (page: number, total: number, status: string) => void
): Promise<string> {
  const texts: string[] = [];

  for (let i = 0; i < canvases.length; i++) {
    onProgress?.(i + 1, canvases.length, "Initializing OCR engine…");

    const result = await Tesseract.recognize(canvases[i], "eng", {
      logger: (message) => {
        if (message.status === "recognizing text") {
          onProgress?.(i + 1, canvases.length, `Scanning page ${i + 1}/${canvases.length}…`);
        }
      },
    });

    texts.push(result.data.text);
  }

  return texts.join("\n").trim();
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

  onProgress?.("Trying embedded text first…");
  const embeddedText = await extractEmbeddedText(pdf, onProgress);
  const embeddedTransactions = embeddedText ? parseTransactionsFromText(embeddedText) : [];

  console.log("[pipeline] Embedded text length:", embeddedText.length);
  console.log("[pipeline] Embedded text transactions:", embeddedTransactions.length);

  if (!shouldFallbackToOcr(embeddedText, embeddedTransactions)) {
    return {
      transactions: embeddedTransactions,
      rawText: embeddedText,
      method: "text",
      textLength: embeddedText.length,
    };
  }

  onProgress?.("No usable text layer found. Falling back to OCR…");
  const canvases = await renderPdfToImages(pdf, (page, total) => {
    onProgress?.(`Rendering page ${page}/${total} for OCR…`, page, total);
  });

  const ocrText = await ocrCanvases(canvases, (page, total, status) => onProgress?.(status, page, total));
  if (!ocrText || ocrText.trim().length < 20) {
    throw new Error("Could not extract readable text from this PDF.");
  }

  const ocrTransactions = parseTransactionsFromText(ocrText);

  console.log("[pipeline] OCR text length:", ocrText.length);
  console.log("[pipeline] OCR transactions:", ocrTransactions.length);

  return {
    transactions: ocrTransactions,
    rawText: ocrText,
    method: "ocr",
    textLength: ocrText.length,
  };
}
