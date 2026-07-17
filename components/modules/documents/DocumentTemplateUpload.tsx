"use client";

export function DocumentTemplateUpload({ onFile }: { onFile?: (file: File) => void }) {
  return (
    <label className="block rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm font-bold text-stone-700">
      Enviar modelo DOCX
      <input type="file" accept=".docx" className="mt-2 block w-full text-sm" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile?.(file); }} />
    </label>
  );
}
