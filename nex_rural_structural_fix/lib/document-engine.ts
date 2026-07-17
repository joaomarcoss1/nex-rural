import PizZip from "pizzip";

export type TemplateVariable = {
  key: string;
  token: string;
};

export type VariableMapEntry = {
  source?: string;
  field?: string;
  source_entity?: string;
  source_field?: string;
  label?: string;
  required?: boolean;
  default_value?: string;
  manual_value?: string;
};

export type MissingTemplateValue = {
  variable: string;
  label: string;
  reason: string;
  source?: string;
  field?: string;
};

export type ResolveTemplateDataResult = {
  data: Record<string, string>;
  missingRequired: MissingTemplateValue[];
  missingOptional: MissingTemplateValue[];
  warnings: Array<{ variable: string; message: string }>;
  /** Compatibilidade com fluxos antigos: contém apenas campos obrigatórios sem valor. */
  missing: MissingTemplateValue[];
};

export type ResolveTemplateDataInput = {
  template?: Record<string, unknown> | null;
  variableMap?: Record<string, VariableMapEntry> | null;
  client?: Record<string, unknown> | null;
  spouse?: Record<string, unknown> | null;
  property?: Record<string, unknown> | null;
  service?: Record<string, unknown> | null;
  company?: Record<string, unknown> | null;
  manualValues?: Record<string, string> | null;
};

const VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_.:-]+)\s*\}\}/g;

export function extractDocxVariables(input: Buffer | ArrayBuffer | Uint8Array): TemplateVariable[] {
  const zip = new PizZip(input as ArrayBuffer);
  const found = new Set<string>();
  const fileNames = Object.keys(zip.files).filter((name) => name.startsWith("word/") && name.endsWith(".xml"));

  for (const name of fileNames) {
    const file = zip.file(name);
    if (!file) continue;
    const xml = file.asText();
    const compactText = xml
      .replace(/<w:tab\/>/g, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    for (const match of Array.from(compactText.matchAll(VARIABLE_REGEX))) {
      if (match[1]) found.add(match[1].trim());
    }
    for (const match of Array.from(xml.matchAll(VARIABLE_REGEX))) {
      if (match[1]) found.add(match[1].trim());
    }
  }

  return Array.from(found)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({ key, token: `{{${key}}}` }));
}

export function defaultVariableMap(keys: string[]) {
  const map: Record<string, VariableMapEntry> = {};
  for (const key of keys) {
    const label = toHumanLabel(key);
    const [source_entity, source_field] = inferSourceField(key);
    map[key] = { source: source_entity, field: source_field, source_entity, source_field, label, required: /nome|cpf|matricula|imovel|proprietario|fazenda/i.test(key) };
  }
  return map;
}

function toHumanLabel(key: string) {
  return key.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferSourceField(key: string): [string, string] {
  const normalized = key.toLowerCase();
  if (normalized.startsWith("cliente_")) return ["Cliente", normalized.replace(/^cliente_/, "")];
  if (normalized.startsWith("conjuge_")) return ["Cônjuge", normalized.replace(/^conjuge_/, "")];
  if (normalized.startsWith("spouse_")) return ["Cônjuge", normalized];
  if (normalized.startsWith("imovel_")) return ["Imóvel", normalized.replace(/^imovel_/, "")];
  if (normalized.startsWith("servico_")) return ["Serviço", normalized.replace(/^servico_/, "")];
  if (normalized.startsWith("empresa_")) return ["Empresa", normalized.replace(/^empresa_/, "")];

  const aliases: Record<string, [string, string]> = {
    nome_proprietario: ["Cliente", "full_name"],
    proprietario: ["Cliente", "full_name"],
    cpf_proprietario: ["Cliente", "cpf_cnpj"],
    documento_proprietario: ["Cliente", "cpf_cnpj"],
    fazenda: ["Imóvel", "name"],
    propriedade: ["Imóvel", "name"],
    cidade_imovel: ["Imóvel", "municipality"],
    municipio_imovel: ["Imóvel", "municipality"],
    municipio: ["Imóvel", "municipality"],
    matricula: ["Imóvel", "registry_number"],
    area_total: ["Imóvel", "measured_area"],
    company_name: ["Empresa", "name"],
    data_atual: ["Sistema", "data_atual"],
    ano_atual: ["Sistema", "ano_atual"],
    data_extenso: ["Sistema", "data_extenso"]
  };

  return aliases[normalized] || ["Manual", normalized];
}

export function formatDateBR(value?: string | Date | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

export function formatDateLongBR(value?: string | Date | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s.-]+/g, "_");
}

function pick(row: Record<string, unknown> | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return "";
}

const fieldAliases: Record<string, string[]> = {
  full_name: ["full_name", "name", "client_name", "nome", "nome_completo"],
  name: ["name", "full_name", "trade_name", "property_name", "nome"],
  cpf_cnpj: ["cpf_cnpj", "document", "cpf", "cnpj", "cpf_proprietario"],
  rg: ["rg", "identity_document", "identidade"],
  phone: ["phone", "telefone"],
  whatsapp: ["whatsapp", "phone"],
  email: ["email"],
  address: ["address", "endereco"],
  city: ["city", "municipality", "municipio", "cidade"],
  state: ["state", "uf"],
  spouse_full_name: ["spouse_full_name", "spouse_name", "conjuge_nome"],
  spouse_cpf: ["spouse_cpf", "conjuge_cpf"],
  spouse_rg: ["spouse_rg", "conjuge_rg"],
  spouse_phone: ["spouse_phone", "conjuge_telefone"],
  spouse_email: ["spouse_email", "conjuge_email"],
  registration_number: ["registration_number", "registry_number", "matricula", "imovel_matricula"],
  registry_number: ["registry_number", "registration_number", "matricula", "imovel_matricula"],
  municipality: ["municipality", "city", "municipio", "cidade", "imovel_municipio"],
  measured_area: ["measured_area", "area_total", "declared_area", "area", "imovel_area"],
  car_number: ["car_number", "car", "imovel_car"],
  ccir_number: ["ccir_number", "ccir", "imovel_ccir"],
  itr_number: ["itr_number", "itr", "imovel_itr"],
  cib_nirf: ["cib_nirf", "nirf", "cib", "imovel_cib_nirf"],
  service_type: ["service_type", "type", "title", "servico_tipo"],
  status: ["status", "servico_status"],
  created_at: ["created_at", "start_date", "servico_data"],
  trade_name: ["trade_name", "name", "company_name", "empresa_nome"],
  cnpj: ["cnpj", "cpf_cnpj", "document", "empresa_cnpj"]
};

function readMappedField(row: Record<string, unknown> | null | undefined, field: string) {
  if (!row || !field) return "";
  const normalized = normalizeKey(field);
  const aliases = fieldAliases[normalized] || fieldAliases[field] || [field, normalized];
  const directKeys = Array.from(new Set([field, normalized, ...aliases]));
  return pick(row, directKeys);
}

function sourceRow(sourceEntity: string | undefined, input: ResolveTemplateDataInput) {
  const source = normalizeKey(sourceEntity || "");
  if (["cliente", "client"].includes(source)) return input.client;
  if (["conjuge", "conjuge", "spouse"].includes(source)) return input.spouse || input.client;
  if (["imovel", "imóvel", "property", "rural_property"].map(normalizeKey).includes(source)) return input.property;
  if (["servico", "serviço", "service"].map(normalizeKey).includes(source)) return input.service;
  if (["empresa", "company"].includes(source)) return input.company;
  return null;
}

function systemValue(field: string) {
  const normalized = normalizeKey(field);
  if (normalized === "data_atual") return formatDateBR(new Date());
  if (normalized === "ano_atual") return String(new Date().getFullYear());
  if (normalized === "data_extenso") return formatDateLongBR(new Date());
  return "";
}

function parseJsonRecord(value: unknown): Record<string, VariableMapEntry> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parseJsonRecord(parsed);
    } catch {
      return {};
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, VariableMapEntry>;
  return {};
}

function parseVariables(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

export function buildDocumentData({
  company,
  client,
  property,
  service
}: {
  company?: Record<string, unknown> | null;
  client?: Record<string, unknown> | null;
  property?: Record<string, unknown> | null;
  service?: Record<string, unknown> | null;
}) {
  return {
    cliente_nome: pick(client, ["full_name", "name", "client_name"]),
    cliente_cpf: pick(client, ["cpf_cnpj", "document", "cpf", "cnpj"]),
    cliente_rg: pick(client, ["rg", "identity_document"]),
    cliente_telefone: pick(client, ["phone", "telefone"]),
    cliente_whatsapp: pick(client, ["whatsapp", "phone"]),
    cliente_email: pick(client, ["email"]),
    cliente_endereco: pick(client, ["address", "endereco"]),
    cliente_cidade: pick(client, ["city", "municipality"]),
    cliente_uf: pick(client, ["state", "uf"]),

    conjuge_nome: pick(client, ["spouse_full_name", "spouse_name"]),
    conjuge_cpf: pick(client, ["spouse_cpf"]),
    conjuge_rg: pick(client, ["spouse_rg"]),
    conjuge_telefone: pick(client, ["spouse_phone"]),
    conjuge_email: pick(client, ["spouse_email"]),

    imovel_nome: pick(property, ["name", "property_name"]),
    imovel_matricula: pick(property, ["registration_number", "registry_number", "matricula"]),
    imovel_municipio: pick(property, ["municipality", "city", "municipio"]),
    imovel_uf: pick(property, ["state", "uf"]),
    imovel_area: pick(property, ["measured_area", "area_total", "declared_area"]),
    imovel_car: pick(property, ["car", "car_number"]),
    imovel_ccir: pick(property, ["ccir", "ccir_number"]),
    imovel_itr: pick(property, ["itr", "itr_number"]),
    imovel_cib_nirf: pick(property, ["cib_nirf", "nirf", "cib"]),

    municipio: pick(property, ["municipality", "city", "municipio"]) || pick(client, ["city", "municipality"]),
    matricula: pick(property, ["registration_number", "registry_number", "matricula"]),
    area_total: pick(property, ["measured_area", "area_total", "declared_area"]),

    servico_tipo: pick(service, ["service_type", "type", "title"]),
    servico_status: pick(service, ["status"]),
    servico_data: formatDateBR(pick(service, ["created_at", "start_date"])),

    empresa_nome: pick(company, ["trade_name", "name", "company_name"]),
    empresa_cnpj: pick(company, ["cnpj", "cpf_cnpj", "document"]),
    empresa_telefone: pick(company, ["phone", "whatsapp"]),
    empresa_email: pick(company, ["email"]),
    company_name: pick(company, ["trade_name", "name", "company_name"]),

    data_atual: formatDateBR(new Date()),
    ano_atual: String(new Date().getFullYear()),
    data_extenso: formatDateLongBR(new Date())
  };
}

export function resolveTemplateData(input: ResolveTemplateDataInput): ResolveTemplateDataResult {
  const templateVariables = parseVariables(input.template?.variables);
  const variableMap = input.variableMap || parseJsonRecord(input.template?.variable_map);
  const standardData = buildDocumentData(input);
  const keys = templateVariables.length > 0 ? templateVariables : Object.keys(variableMap);
  const data: Record<string, string> = { ...standardData };
  const missingRequired: MissingTemplateValue[] = [];
  const missingOptional: MissingTemplateValue[] = [];
  const warnings: Array<{ variable: string; message: string }> = [];

  for (const key of keys) {
    const mapEntry = variableMap[key] || variableMap[`{{${key}}}`] || defaultVariableMap([key])[key];
    let value = "";
    const sourceLabel = mapEntry?.source_entity || mapEntry?.source || "Manual";
    const fieldLabel = mapEntry?.source_field || mapEntry?.field || key;
    const normalizedSource = normalizeKey(sourceLabel || "");

    if (Object.prototype.hasOwnProperty.call(standardData, key)) {
      value = String(standardData[key as keyof typeof standardData] ?? "");
    }

    if (!value && mapEntry) {
      if (normalizedSource === "sistema" || normalizedSource === "system") {
        value = systemValue(fieldLabel || key);
      } else if (normalizedSource === "manual") {
        value = String(input.manualValues?.[key] ?? mapEntry.manual_value ?? mapEntry.default_value ?? "");
      } else {
        value = readMappedField(sourceRow(sourceLabel, input), fieldLabel);
      }
    }

    data[key] = value;
    const empty = !value || value.trim() === "";
    if (empty) {
      const entry: MissingTemplateValue = {
        variable: key,
        label: mapEntry?.label || toHumanLabel(key),
        source: sourceLabel,
        field: fieldLabel,
        reason: normalizedSource === "manual" ? "Valor manual nao informado" : "Campo nao preenchido"
      };
      if (mapEntry?.required) {
        missingRequired.push(entry);
      } else {
        missingOptional.push(entry);
        warnings.push({ variable: key, message: `${entry.label} está vazio, mas foi marcado como opcional.` });
      }
    }
  }

  return { data, missingRequired, missingOptional, warnings, missing: missingRequired };
}

export function missingVariables(keys: string[], data: Record<string, unknown>) {
  return keys.filter((key) => data[key] === undefined || data[key] === null || String(data[key]).trim() === "");
}
