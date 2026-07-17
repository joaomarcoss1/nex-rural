import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
      <h3 className="text-lg font-black text-forest">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-stone-600">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
