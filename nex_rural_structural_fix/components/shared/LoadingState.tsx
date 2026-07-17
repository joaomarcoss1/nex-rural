export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm font-black text-stone-600 shadow-sm">{label}</div>;
}
