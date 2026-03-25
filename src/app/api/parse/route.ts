import { NextRequest, NextResponse } from "next/server";
import { parseTransactionsFromText } from "@/lib/pdfParser";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    console.log("[api/parse] Processing file:", file.name, file.size, "bytes");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("[api/parse] Buffer created, size:", buffer.length);

    // Use pdf-parse v1.1.1 (pure Node.js, no DOMMatrix)
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    const rawText = data.text || "";
    console.log("[api/parse] Text extracted, length:", rawText.length, "chars");
    console.log("[api/parse] Raw text sample:", rawText.substring(0, 300));

    const transactions = parseTransactionsFromText(rawText);
    console.log("[api/parse] Transactions parsed:", transactions.length);

    return NextResponse.json({
      transactions,
      count: transactions.length,
      rawLength: rawText.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/parse] ERROR:", message);
    console.error("[api/parse] Stack:", error instanceof Error ? error.stack : String(error));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
