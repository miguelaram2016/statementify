import { NextRequest, NextResponse } from "next/server";
import { parseTransactionsFromText } from "@/lib/pdfParser";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 15 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    if (file.size === 0 || file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDF must be between 1 byte and 15 MB" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json({ error: "Invalid PDF file" }, { status: 400 });
    }

    // Do not log filenames, document text, transaction details, or exception stacks.
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    const rawText = data.text || "";
    const transactions = parseTransactionsFromText(rawText);

    return NextResponse.json({
      transactions,
      count: transactions.length,
      rawLength: rawText.length,
    });
  } catch {
    // Parser/library exceptions may contain document text or other private metadata.
    return NextResponse.json({ error: "Could not process this PDF" }, { status: 500 });
  }
}
