"use client";

export function ClientDossierPreview({ missing = [] }: { missing?: string[] }) {
  return <div className="rounded-xl border border-stone-200 bg-white p-4"><h3 className="font-black text-[#163b2c]">Prévia do dossiê</h3>{missing.length ? <p className="mt-2 text-sm font-semibold text-amber-700">Campos faltantes: {missing.join(", ")}</p> : <p className="mt-2 text-sm font-semibold text-stone-500">Revise cliente, imóveis, documentos e pendências antes de gerar.</p>}</div>;
}
