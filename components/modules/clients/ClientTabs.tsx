"use client";

export function ClientTabs({ tabs = ["Dados", "Contato", "Cônjuge", "Imóveis", "Documentos", "Dossiê"] }: { tabs?: string[] }) {
  return <div className="flex flex-wrap gap-2">{tabs.map((tab) => <span key={tab} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-black text-[#163b2c]">{tab}</span>)}</div>;
}
