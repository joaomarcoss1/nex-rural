"use client";

export function GenerateDocumentWizard({ children }: { children?: React.ReactNode }) {
  return <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">{children ?? <p className="text-sm font-semibold text-stone-600">Wizard de geração DOCX integrado ao módulo principal.</p>}</div>;
}
