"use client";

export function GeoPropertySelector({ children }: { children?: React.ReactNode }) {
  return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">{children ?? "Selecione cliente e imóvel antes de qualquer ação geotécnica."}</div>;
}
