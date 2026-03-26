"use client";

import { useEffect, useMemo, useState } from "react";
import { type Transaction } from "@/lib/pdfParser";

interface Props {
  transactions: Transaction[];
  accountType: "credit_card" | "checking";
  onUpdate: (txns: Transaction[], accountType: "credit_card" | "checking") => void;
  onBack: () => void;
  onExport: () => void;
}

type EditableField = "date" | "description" | "amount";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

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

  const summaryCards = useMemo(
    () => [
      { label: "Transactions", value: rows.length.toLocaleString() },
      { label: "Net total", value: formatCurrency(net), tone: net >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]" },
      { label: "Date range", value: dateRange },
    ],
    [dateRange, net, rows.length]
  );

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Review + refine</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-[var(--foreground)]">Check the extracted transactions before export</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
            Fix anything that looks off. OCR and parser guesses are useful, but finance data deserves a quick human pass.
          </p>
        </div>
        <div className="surface-soft rounded-2xl px-4 py-3">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Account type</label>
          <select
            value={type}
            onChange={(event) => handleTypeChange(event.target.value as "credit_card" | "checking")}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          >
            <option value="credit_card">Credit card</option>
            <option value="checking">Checking / savings</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {summaryCards.map((item) => (
          <div key={item.label} className="surface-soft rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{item.label}</p>
            <p className={`mt-2 text-base font-semibold ${item.tone ?? "text-[var(--foreground)]"}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {showCheckingWarning && (
        <div className="mt-5 rounded-2xl border border-[var(--warning)]/18 bg-[var(--warning-soft)] p-4 text-sm leading-7 text-[var(--warning)]">
          All transactions are positive. For checking and savings accounts, withdrawals usually need to be negative. If this is actually a card statement, switch the account type above.
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-[24px] border border-[var(--border)] bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Description</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Amount</th>
              <th className="w-14 px-4 py-3" aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((transaction, index) => (
              <tr key={`${transaction.date}-${transaction.description}-${index}`} className="border-t border-[var(--border)]/80 hover:bg-slate-50/80">
                <td className="px-3 py-2">
                  <input
                    value={transaction.date}
                    onChange={(event) => updateRow(index, "date", event.target.value)}
                    className="w-full rounded-xl border border-transparent bg-transparent px-3 py-2 font-medium text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--accent-soft)]/40"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={transaction.description}
                    onChange={(event) => updateRow(index, "description", event.target.value)}
                    className="w-full rounded-xl border border-transparent bg-transparent px-3 py-2 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--accent-soft)]/40"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={transaction.amount}
                    onChange={(event) => updateRow(index, "amount", Number.parseFloat(event.target.value) || 0)}
                    className={`w-full rounded-xl border border-transparent bg-transparent px-3 py-2 text-right font-semibold outline-none transition focus:border-[var(--accent)] focus:bg-[var(--accent-soft)]/40 ${
                      transaction.amount < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"
                    }`}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => deleteRow(index)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
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
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)]"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Add row
      </button>

      <div className="mt-8 flex flex-wrap gap-3">
        <button onClick={onBack} className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]">
          ← Back
        </button>
        <button
          onClick={handleApplyAndExport}
          className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-strong)]"
        >
          Continue to export
        </button>
      </div>
    </div>
  );
}
