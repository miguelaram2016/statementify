import type { Transaction } from "@/lib/pdfParser";
import * as XLSX from "xlsx";

export function downloadExcel(transactions: Transaction[], filename = "transactions") {
  const data = transactions.map((tx) => ({
    Date: tx.date,
    Description: tx.description,
    Amount: tx.amount,
    Balance: tx.balance ?? null,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

  // Auto-width columns
  const cols = [
    { wch: 12 },
    { wch: 50 },
    { wch: 14 },
    { wch: 14 },
  ];
  worksheet["!cols"] = cols;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
