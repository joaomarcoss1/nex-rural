"use client";

import { FileSignature } from "lucide-react";

export function DocumentEngineModule() {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <FileSignature className="h-5 w-5 text-[#163b2c]" />
        <div>
          <h2 className="font-black text-[#163b2c]">Motor DOCX real</h2>
          <p className="text-sm font-semibold text-stone-500">Upload, mapeamento visual, geração de DOCX e liberação no portal são orquestrados no painel principal.</p>
        </div>
      </div>
    </section>
  );
}
