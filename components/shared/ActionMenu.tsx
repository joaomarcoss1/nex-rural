"use client";

import { MoreHorizontal } from "lucide-react";
import { useState } from "react";

export type ActionMenuItem = {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  tone?: "default" | "danger" | "success";
};

export function ActionMenu({ primary = [], more = [] }: { primary?: ActionMenuItem[]; more?: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex flex-wrap items-center gap-2">
      {primary.map((item) => (
        <button
          key={item.label}
          type="button"
          disabled={item.disabled}
          onClick={item.onClick}
          className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-black text-forest shadow-sm transition hover:border-leaf disabled:cursor-not-allowed disabled:opacity-50"
        >
          {item.label}
        </button>
      ))}
      {more.length > 0 && (
        <button
          type="button"
          aria-label="Mais ações"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg border border-stone-200 bg-white p-2 text-forest shadow-sm transition hover:border-leaf"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
      {open && (
        <div className="absolute right-0 top-10 z-30 min-w-44 overflow-hidden rounded-xl border border-stone-200 bg-white p-1 shadow-xl">
          {more.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={async () => {
                setOpen(false);
                await item.onClick();
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-black transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 ${item.tone === "danger" ? "text-red-700" : item.tone === "success" ? "text-emerald-700" : "text-forest"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
