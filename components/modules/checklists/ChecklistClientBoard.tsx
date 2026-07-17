"use client";

export function ChecklistClientBoard({ children }: { children?: React.ReactNode }) {
  return <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">{children ?? "Itens solicitados ao cliente e ações de validação."}</div>;
}
