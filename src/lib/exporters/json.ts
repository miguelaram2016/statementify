import type { Transaction } from "@/lib/pdfParser";

export function downloadJSON(transactions: Transaction[], filename = "transactions") {
  const json = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: transactions.length,
      transactions,
    },
    null,
    2
  );
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
