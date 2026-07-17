"use client";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-black text-forest">{title}</h3>
        <p className="mt-2 text-sm font-semibold text-stone-600">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-black text-stone-700">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-forest px-4 py-2 text-sm font-black text-white">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
