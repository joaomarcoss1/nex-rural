"use client";

export function ChecklistBuilder({ children }: { children?: React.ReactNode }) {
  return <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"><h2 className="font-black text-[#163b2c]">Checklist Builder</h2>{children ?? <p className="mt-1 text-sm font-semibold text-stone-500">Criação guiada de checklists com itens, portal e modelos DOCX vinculados.</p>}</section>;
}
