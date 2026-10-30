import type { Transaction } from "@/lib/pdfParser";
import writeExcelFile from "write-excel-file/browser";

type CellValue = string | number | null;

/**
 * Keep the original four-column export layout. Descriptions (including strings
 * starting with "=") stay text, never spreadsheet formulas.
 */
export function buildExcelRows(transactions: Transaction[]): CellValue[][] {
  return [
    ["Date", "Description", "Amount", "Balance"],
    ...transactions.map((tx): CellValue[] => [
      tx.date,
      tx.description,
      tx.amount,
      tx.balance ?? null,
    ]),
  ];
}

export async function downloadExcel(transactions: Transaction[], filename = "transactions"): Promise<void> {
  const rows = buildExcelRows(transactions);
  await writeExcelFile(rows, {
    sheet: "Transactions",
    columns: [{ width: 12 }, { width: 50 }, { width: 14 }, { width: 14 }],
    stickyRowsCount: 1,
  }).toFile(`${filename}.xlsx`);
}
