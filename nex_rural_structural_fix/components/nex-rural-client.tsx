"use client";

import dynamic from "next/dynamic";

const NexRuralAppDynamic = dynamic(() => import("./nex-rural-app").then((module) => module.NexRuralApp), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ec] px-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-black uppercase tracking-wide text-stone-400">Nex Rural</p>
        <h1 className="mt-1 text-xl font-black text-[#163b2c]">Carregando painel...</h1>
        <p className="mt-2 text-sm font-semibold text-stone-500">Preparando módulos da empresa, cliente e portal.</p>
      </div>
    </main>
  )
});

export function NexRuralClient({ portalOnly = false }: { portalOnly?: boolean }) {
  return <NexRuralAppDynamic portalOnly={portalOnly} />;
}
