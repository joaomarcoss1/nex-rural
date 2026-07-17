"use client";

export function PortalSanitizedDashboard({ children }: { children?: React.ReactNode }) {
  return <main className="space-y-4">{children ?? <PortalDocuments />}</main>;
}

function PortalDocuments() {
  return <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"><h2 className="font-black text-[#163b2c]">Portal seguro</h2><p className="text-sm font-semibold text-stone-500">Somente dados liberados ao cliente.</p></section>;
}
