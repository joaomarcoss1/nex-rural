"use client";

export type RelationOption = {
  id: string;
  label: string;
  description?: string;
};

export function RelationSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecione",
  disabled = false
}: {
  label: string;
  value: string;
  options: RelationOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-stone-700">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-forest outline-none transition focus:border-leaf disabled:cursor-not-allowed disabled:bg-stone-100"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.description ? `${option.label} — ${option.description}` : option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
