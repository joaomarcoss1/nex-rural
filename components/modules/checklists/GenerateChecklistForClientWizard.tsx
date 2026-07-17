"use client";

export function GenerateChecklistForClientWizard({ children }: { children?: React.ReactNode }) {
  return <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">{children ?? "Selecione checklist, cliente, imóvel/serviço e confirme os itens."}</div>;
}
