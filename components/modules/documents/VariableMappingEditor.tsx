"use client";

import { RelationSelect } from "@/components/shared/RelationSelect";

type VariableMapping = {
  variable: string;
  source_entity: string;
  source_field: string;
  required?: boolean;
};

const sourceOptions = ["Cliente", "Cônjuge", "Imóvel", "Serviço", "Empresa", "Sistema", "Manual"].map((item) => ({ id: item, label: item }));

export function VariableMappingEditor({ mappings = [], onChange }: { mappings?: VariableMapping[]; onChange?: (mappings: VariableMapping[]) => void }) {
  return (
    <div className="space-y-3">
      {mappings.map((mapping, index) => (
        <div key={mapping.variable} className="grid gap-3 rounded-xl border border-stone-200 bg-white p-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <div>
            <p className="text-xs font-black uppercase text-stone-500">Variável</p>
            <p className="font-mono text-sm font-bold text-forest">{`{{${mapping.variable}}}`}</p>
          </div>
          <RelationSelect
            label="Origem"
            value={mapping.source_entity}
            options={sourceOptions}
            onChange={(value) => {
              const next = mappings.slice();
              next[index] = { ...mapping, source_entity: value };
              onChange?.(next);
            }}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-stone-700">Campo</span>
            <input
              value={mapping.source_field}
              onChange={(event) => {
                const next = mappings.slice();
                next[index] = { ...mapping, source_field: event.target.value };
                onChange?.(next);
              }}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-forest outline-none focus:border-leaf"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-bold text-stone-700">
            <input
              type="checkbox"
              checked={Boolean(mapping.required)}
              onChange={(event) => {
                const next = mappings.slice();
                next[index] = { ...mapping, required: event.target.checked };
                onChange?.(next);
              }}
            />
            Obrigatório
          </label>
        </div>
      ))}
    </div>
  );
}
