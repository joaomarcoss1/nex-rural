export type ToastTone = "green" | "red" | "amber" | "blue";

export function toastClassName(tone: ToastTone = "blue") {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tone === "red") return "border-red-200 bg-red-50 text-red-900";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-sky-200 bg-sky-50 text-sky-900";
}
