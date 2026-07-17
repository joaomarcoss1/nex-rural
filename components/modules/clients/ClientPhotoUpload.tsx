"use client";

export function ClientPhotoUpload({ onFile }: { onFile?: (file: File) => void }) {
  return <label className="block rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm font-bold text-stone-700">Foto do cliente<input className="mt-2 block w-full" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile?.(file); }} /></label>;
}
