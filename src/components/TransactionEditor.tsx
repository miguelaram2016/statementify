"use client";

import { useEffect, useState } from "react";
import { type Transaction } from "@/lib/pdfParser";

interface Props {
  transactions: Transaction[];
  accountType: "credit_card" | "checking";
  onUpdate: (txns: Transaction[], accountType: "credit_card" | "checking") => void;
  onBack: () => void;
  onExport: () => void;
}

type EditableField = "date" | "description" | "amount";

export default function TransactionEditor({ transactions, accountType, onUpdate, onBack, onExport }: Props) {
  const [rows, setRows] = useState<Transaction[]>(transactions);
  const [type, setType] = useState<"credit_card" | "checking">(accountType);

  useEffect(() => {
    setRows(transactions);
  }, [transactions]);

  useEffect(() => {
    setType(accountType);
  }, [accountType]);

  function updateRow(index: number, field: EditableField, value: string | number) {
    const newRows = [...rows];
    const currentRow = newRows[index];

    if (field === "amount") {
      newRows[index] = { ...currentRow, amount: typeof value === "number" ? value : currentRow.amount };
    } else if (field === "date") {
      newRows[index] = { ...currentRow, date: String(value) };
    } else {
      newRows[index] = { ...currentRow, description: String(value) };
    }

    setRows(newRows);
    onUpdate(newRows, type);
  }

  function deleteRow(index: number) {
    const newRows = rows.filter((_, rowIndex) => rowIndex !== index);
    setRows(newRows);
    onUpdate(newRows, type);
  }

  function addRow() {
    const newRow: Transaction = {
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: 0,
      accountType: type,
    };
    const nextRows = [...rows, newRow];
    setRows(nextRows);
    onUpdate(nextRows, type);
  }

  function handleTypeChange(newType: "credit_card" | "checking") {
    setType(newType);
    onUpdate(rows, newType);
  }

  function handleApplyAndExport() {
    onUpdate(rows, type);
    onExport();
  }

  const net = rows.reduce((sum, transaction) => sum + transaction.amount, 0);
  const dateRange = rows.length > 0 ? `${rows[0].date} – ${rows[rows.length - 1].date}` : "–";
  const allPositive = rows.length > 0 && rows.every((transaction) => transaction.amount > 0);
  const showCheckingWarning = type === "checking" && allPositive;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Review transactions</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Fix anything that looks off before exporting. OCR and parser guesses are helpful, not magic.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--muted-foreground)]">Account type:</span>
          <select
            value={type}
            onChange={(event) => handleTypeChange(event.target.value as "credit_card" | "checking")}
            className="rounded border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-sm focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="credit_card">Credit card</option>
            <option value="checking">Checking / savings</option>
          </select>
        </div>
      </div>

      <p className="mb-1 text-sm text-[var(--muted-foreground)]">
        {rows.length} transactions · Net:{" "}
        <span className={net >= 0 ? "text-green-400" : "text-red-400"}>${net.toFixed(2)}</span> · {dateRange}
      </p>

      {showCheckingWarning && (
        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
          All transactions are positive. For checking and savings accounts, withdrawals usually need to be negative. If this is actually a card statement, switch the account type above.
        </div>
      )}

      <div className="mb-6 overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--muted)]">
            <tr>
              <th className="p-2 text-left text-xs font-medium text-[var(--muted-foreground)]">Date</th>
              <th className="p-2 text-left text-xs font-medium text-[var(--muted-foreground)]">Description</th>
              <th className="p-2 text-right text-xs font-medium text-[var(--muted-foreground)]">Amount</th>
              <th className="w-10 p-2" aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((transaction, index) => (
              <tr key={`${transaction.date}-${transaction.description}-${index}`} className="border-t border-[var(--border)]">
                <td className="p-1">
                  <input
                    value={transaction.date}
                    onChange={(event) => updateRow(index, "date", event.target.value)}
                    className="w-full border-b border-[var(--border)] bg-transparent px-2 py-1 outline-none focus:border-[var(--accent)]"
                  />
                </td>
                <td className="p-1">
                  <input
                    value={transaction.description}
                    onChange={(event) => updateRow(index, "description", event.target.value)}
                    className="w-full border-b border-[var(--border)] bg-transparent px-2 py-1 outline-none focus:border-[var(--accent)]"
                  />
                </td>
                <td className="p-1">
                  <input
                    type="number"
                    step="0.01"
                    value={transaction.amount}
                    onChange={(event) => updateRow(index, "amount", Number.parseFloat(event.target.value) || 0)}
                    className={`w-full border-b border-[var(--border)] bg-transparent px-2 py-1 text-right outline-none focus:border-[var(--accent)] ${
                      transaction.amount < 0 ? "text-green-400" : "text-red-400"
                    }`}
                  />
                </td>
                <td className="p-1 text-center">
                  <button
                    onClick={() => deleteRow(index)}
                    className="flex h-6 w-6 items-center justify-center rounded text-xs text-red-400 transition-colors hover:bg-red-400/10 hover:text-red-300"
                    aria-label={`Delete row ${index + 1}`}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addRow}
        className="mb-6 flex items-center gap-1.5 rounded px-2 py-1 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]/80"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Add row
      </button>

      <div className="flex gap-3">
        <button onClick={onBack} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--muted)]">
          ← Back
        </button>
        <button onClick={handleApplyAndExport} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90">
          Continue to export
        </button>
      </div>
    </div>
  );
}
