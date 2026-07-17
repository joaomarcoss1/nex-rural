"use client";

export function DocumentViewer({ title = "Documento", description = "Baixe o arquivo para visualizar com formatação completa." }: { title?: string; description?: string }) {
  return <div className="rounded-xl border border-stone-200 bg-white p-4"><h3 className="font-black text-[#163b2c]">{title}</h3><p className="text-sm font-semibold text-stone-500">{description}</p></div>;
}
