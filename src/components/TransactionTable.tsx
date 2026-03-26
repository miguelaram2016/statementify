"use client";

import React, { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import type { Transaction } from "@/lib/pdfParser";

interface TransactionTableProps {
  transactions: Transaction[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function TransactionTable({ transactions }: TransactionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ getValue }) => <span className="font-mono text-sm font-medium text-[var(--foreground)]">{formatDate(getValue<string>())}</span>,
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ getValue }) => <span className="leading-relaxed text-[var(--foreground)]">{getValue<string>()}</span>,
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ getValue }) => {
          const amount = getValue<number>();
          return (
            <span className={`inline-flex rounded-full px-2.5 py-1 font-mono text-sm font-semibold ${amount < 0 ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--success-soft)] text-[var(--success)]"}`}>
              {formatCurrency(amount)}
            </span>
          );
        },
      },
      {
        accessorKey: "balance",
        header: "Balance",
        cell: ({ getValue }) => {
          const balance = getValue<number | undefined>();
          if (balance === undefined) return <span className="text-[var(--muted-foreground)]">—</span>;
          return <span className="font-mono text-sm text-[var(--muted-foreground)]">{formatCurrency(balance)}</span>;
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--muted)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[var(--muted-foreground)]">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="mb-1 text-lg font-semibold text-[var(--foreground)]">No transactions found</h3>
        <p className="max-w-xs text-sm leading-7 text-[var(--muted-foreground)]">
          We couldn&apos;t extract any transactions from this PDF. Try a different statement layout or re-run with a cleaner scan.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto p-2 md:p-3">
      <table className="w-full min-w-[720px] overflow-hidden rounded-[24px] bg-white text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-[var(--border)] bg-[var(--muted)]">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1.5">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() && (
                      <span className="text-[var(--accent)]">{header.column.getIsSorted() === "asc" ? "↑" : "↓"}</span>
                    )}
                    {!header.column.getIsSorted() && <span className="text-[10px] opacity-30">↕</span>}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, index) => (
            <tr
              key={row.id}
              className={`border-b border-[var(--border)]/60 transition-colors hover:bg-slate-50 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/45"}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 align-top">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
