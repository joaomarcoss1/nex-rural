import { NextRequest, NextResponse } from "next/server";
import { requireInternalActor } from "@/lib/security/api-auth";

export const runtime = "nodejs";

type VariableMapEntry = {
  source?: string;
  source_entity?: string;
  field?: string;
  source_field?: string;
  label?: string;
  required?: boolean;
  default_value?: string;
  manual_value?: string;
};

const allowedSources = new Set(["client", "cliente", "spouse", "conjuge", "cônjuge", "property", "imovel", "imóvel", "service", "servico", "serviço", "company", "empresa", "system", "sistema", "manual"]);

function normalizeSource(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeEntry(raw: unknown, variable: string): VariableMapEntry {
  const row = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const source = normalizeSource(row.source ?? row.source_entity ?? "manual");
  const safeSource = allowedSources.has(source) ? source : "manual";
  const field = String(row.field ?? row.source_field ?? variable).trim().slice(0, 120);
  return {
    source: safeSource,
    source_entity: safeSource,
    field,
    source_field: field,
    label: String(row.label ?? variable).trim().slice(0, 160),
    required: Boolean(row.required),
    default_value: row.default_value === undefined ? undefined : String(row.default_value).slice(0, 500),
    manual_value: row.manual_value === undefined ? undefined : String(row.manual_value).slice(0, 500)
  };
}

function sanitizeVariableMap(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const result: Record<string, VariableMapEntry> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const variable = key.replace(/[{}]/g, "").trim();
    if (!/^[a-zA-Z0-9_.:-]{1,80}$/.test(variable)) return null;
    result[variable] = normalizeEntry(value, variable);
  }
  return result;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { admin, actor } = await requireInternalActor(request);
    const body = await request.json().catch(() => null);
    const variableMap = sanitizeVariableMap(body?.variable_map);
    if (!variableMap) return NextResponse.json({ error: "Mapeamento de variáveis inválido." }, { status: 400 });

    let query = admin.from("document_templates").select("id,company_id,name,variables").eq("id", id);
    if (actor.role !== "admin_master_global") query = query.eq("company_id", actor.company_id);
    const { data: template, error: templateError } = await query.single();
    if (templateError || !template) return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });

    const { data: updated, error: updateError } = await admin
      .from("document_templates")
      .update({ variable_map: variableMap, updated_by: actor.id, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", template.company_id)
      .select("id,name,category,file_type,original_filename,variables,variable_map,status,is_fillable,updated_at")
      .single();
    if (updateError || !updated) throw updateError || new Error("Não foi possível salvar o mapeamento.");

    await admin.from("audit_logs").insert({
      company_id: template.company_id,
      user_id: actor.id,
      user_role: actor.role,
      action: "document_template_variable_map_update",
      entity: "document_templates",
      entity_id: id,
      record_table: "document_templates",
      record_id: id,
      new_value: { variables: Object.keys(variableMap) },
      user_agent: request.headers.get("user-agent")
    });

    return NextResponse.json({ ok: true, template: updated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao salvar mapeamento." }, { status: 400 });
  }
}
