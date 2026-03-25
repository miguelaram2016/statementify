import type { Transaction } from "@/lib/pdfParser";

/**
 * Generate a QIF (Quicken Interchange Format) file from transactions.
 * QIF is a line-based format used by Quicken and other finance apps.
 */
export function generateQIF(transactions: Transaction[]): string {
  const lines: string[] = [];

  lines.push("!Type:Bank");

  const sorted = [...transactions].sort((a, b) => (a.date > b.date ? 1 : -1));

  for (const tx of sorted) {
    const [year, month, day] = tx.date.split("-");
    const dateStr = `${month}/${day}/${year}`;
    const amountStr = tx.amount.toFixed(2);
    const desc = tx.description.replace(/\n/g, " ").substring(0, 64);

    lines.push(`D${dateStr}`);
    lines.push(`T${amountStr}`);
    lines.push(`P${desc}`);
    lines.push(`M${desc}`);
    lines.push("^");
  }

  return lines.join("\n");
}

export function downloadQIF(transactions: Transaction[], filename = "transactions") {
  const content = generateQIF(transactions);
  const blob = new Blob([content], { type: "application/qif" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.qif`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
