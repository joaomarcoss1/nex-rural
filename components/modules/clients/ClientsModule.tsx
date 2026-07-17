"use client";

import { ClientTabs } from "./ClientTabs";

export function ClientsModule() {
  return <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"><h2 className="mb-3 font-black text-[#163b2c]">Clientes</h2><ClientTabs /></section>;
}
