import type { Transaction } from "@/lib/pdfParser";

/**
 * Generate a simplified OFX/QFX file from transactions.
 * Uses OFX 2.0 / SGML format.
 */
export function generateOFX(transactions: Transaction[]): string {
  const lines: string[] = [];

  lines.push("OFXHEADER:100");
  lines.push("DATA:OFXSGML");
  lines.push("VERSION:200");
  lines.push("ENCODING:UTF-8");
  lines.push("CHARSET:1252");
  lines.push("");

  lines.push("<OFX>");
  lines.push("  <BANKMSGSRSV1>");
  lines.push("    <STMTTRNRS>");
  lines.push("      <TRNUID>0");
  lines.push("      <STATUS>");
  lines.push("        <CODE>0");
  lines.push("        <SEVERITY>INFO");
  lines.push("      </STATUS>");
  lines.push("      <STMTTRS>");
  lines.push("        <BANKTRANLIST>");

  const sorted = [...transactions].sort((a, b) => (a.date > b.date ? 1 : -1));

  for (const tx of sorted) {
    const dateStr = tx.date.replace(/-/g, "");
    const trnType = tx.amount < 0 ? "DEBIT" : "CREDIT";
    const trnAmt = Math.abs(tx.amount).toFixed(2);
    const name = tx.description.replace(/[<>&"]/g, "").substring(0, 64);
    const memo = tx.description.replace(/[<>&"]/g, "").substring(0, 255);

    lines.push("          <STMTTRN>");
    lines.push(`            <TRNTYPE>${trnType}</TRNTYPE>`);
    lines.push(`            <DTPOSTED>${dateStr}</DTPOSTED>`);
    lines.push(`            <TRNAMT>${trnAmt}</TRNAMT>`);
    lines.push(`            <NAME>${name}</NAME>`);
    lines.push(`            <MEMO>${memo}</MEMO>`);
    lines.push("          </STMTTRN>");
  }

  lines.push("        </BANKTRANLIST>");
  lines.push("      </STMTTRS>");
  lines.push("    </STMTTRNRS>");
  lines.push("  </BANKMSGSRSV1>");
  lines.push("</OFX>");

  return lines.join("\n");
}

export function downloadOFX(transactions: Transaction[], filename = "transactions") {
  const content = generateOFX(transactions);
  const blob = new Blob([content], { type: "application/x-ofx" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.ofx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
