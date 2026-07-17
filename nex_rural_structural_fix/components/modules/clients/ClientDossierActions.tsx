"use client";

export function ClientDossierActions({ onGenerate }: { onGenerate?: () => void }) {
  return <button type="button" onClick={onGenerate} className="rounded-lg bg-[#163b2c] px-4 py-2 text-sm font-black text-white">Gerar dossiê com prévia</button>;
}
