"use client";

import type { ReactNode } from "react";

export type ResponsiveRow = Record<string, unknown>;

function cell(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
}

export function ResponsiveDataTable({
  rows,
  columns,
  labels = {},
  actions
}: {
  rows: ResponsiveRow[];
  columns: string[];
  labels?: Record<string, string>;
  actions?: (row: ResponsiveRow) => ReactNode;
}) {
  if (!rows.length) {
    return <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm font-semibold text-stone-600">Nenhum registro encontrado.</div>;
  }

  return (
    <div>
      <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white md:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              {columns.map((column) => <th key={column} className="px-3 py-3 font-black">{labels[column] || column}</th>)}
              {actions && <th className="px-3 py-3 font-black">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((row, index) => (
              <tr key={String(row.id || index)} className="transition hover:bg-stone-50">
                {columns.map((column) => <td key={column} className="truncate px-3 py-3 font-semibold text-stone-700" title={cell(row[column])}>{cell(row[column])}</td>)}
                {actions && <td className="px-3 py-3">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">
        {rows.map((row, index) => (
          <article key={String(row.id || index)} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="grid gap-2">
              {columns.map((column) => (
                <div key={column} className="flex justify-between gap-4 text-sm">
                  <span className="font-black text-stone-500">{labels[column] || column}</span>
                  <span className="text-right font-semibold text-stone-800">{cell(row[column])}</span>
                </div>
              ))}
            </div>
            {actions && <div className="mt-3 border-t border-stone-100 pt-3">{actions(row)}</div>}
          </article>
        ))}
      </div>
    </div>
  );
}
