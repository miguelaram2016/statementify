import type { Transaction } from "@/lib/pdfParser";
import Papa from "papaparse";

export function exportToCSV(transactions: Transaction[], filename = "transactions"): string {
  const data = transactions.map((tx) => ({
    Date: tx.date,
    Description: tx.description,
    Amount: tx.amount.toFixed(2),
    Balance: tx.balance !== undefined ? tx.balance.toFixed(2) : "",
  }));

  const csv = Papa.unparse(data);
  return csv;
}

export function downloadCSV(transactions: Transaction[], filename = "transactions") {
  const csv = exportToCSV(transactions, filename);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
