import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type AccessActorType = "client" | "staff";

export type AccessTokenPayload = {
  sid?: string;
  company_id: string;
  company_code?: string | null;
  actor_type: AccessActorType;
  actor_id: string;
  role?: string | null;
  full_name?: string | null;
  exp: number;
};

export const STAFF_ROLE_PERMISSIONS: Record<string, string[]> = {
  gestor: ["clients.read", "clients.write", "properties.read", "documents.read", "documents.write", "checklists.manage", "workflow.read", "workflow.write", "workflow.manage", "geo.read", "reports.read"],
  tecnico: ["clients.read", "properties.read", "geo.read", "geo.write", "documents.read", "documents.write", "workflow.read", "workflow.write"],
  topografo: ["properties.read", "geo.read", "geo.write", "documents.read", "workflow.read", "workflow.write"],
  agrimensor: ["properties.read", "geo.read", "geo.write", "reports.geo", "workflow.read", "workflow.write"],
  administrativo: ["clients.read", "clients.write", "documents.read", "documents.write", "checklists.manage", "workflow.read", "workflow.write"],
  financeiro: ["clients.read", "financial.read", "financial.write", "reports.financial", "workflow.read"],
  atendente: ["clients.read", "clients.write", "documents.read", "checklists.read", "workflow.read", "workflow.write"],
  analista_documental: ["documents.read", "documents.write", "checklists.manage", "templates.generate", "workflow.read", "workflow.write"],
  cartorio: ["documents.read", "documents.write", "checklists.read", "services.read", "workflow.read", "workflow.write"],
  geo: ["properties.read", "geo.read", "geo.write", "workflow.read", "workflow.write"]
};

const companyScopedTables = new Set([
  "clients", "leads", "rural_properties", "services", "protocols", "pending_items", "documents", "geo_files", "property_vertices", "property_neighbors", "field_equipment", "equipment_movements", "inspections", "registry_records", "registry_requirements", "property_certificates", "official_checks", "document_library_items", "checklist_templates", "checklist_template_items", "generated_checklists", "generated_checklist_items", "checklist_item_documents", "checklist_sources", "document_templates", "generated_documents", "template_variables", "tags", "client_tags", "client_spouses", "client_exports", "official_templates", "commercial_templates", "generated_commercial_documents", "due_diligence_cases", "due_diligence_risks", "ownership_chain", "financial_entries", "aged_producer_registrations", "aged_property_registrations", "aged_livestock_exploitations", "aged_gta_records", "iterma_cases", "rural_contracts", "car_records", "ccir_records", "itr_records", "sigef_records", "cib_nirf_records", "technical_area_comparisons", "reports", "report_exports", "workflow_statuses", "workflow_templates", "workflow_template_versions", "workflow_stages", "workflow_transitions", "workflow_instances", "workflow_instance_stages", "workflow_tasks", "workflow_task_participants", "workflow_task_checklists", "workflow_task_subtasks", "workflow_task_comments", "workflow_task_attachments", "workflow_task_dependencies", "workflow_task_approvals", "workflow_task_tags", "workflow_task_tag_links", "workflow_task_time_entries", "workflow_teams", "workflow_team_members", "workflow_notifications", "workflow_notification_preferences", "workflow_automation_rules", "workflow_automation_executions", "workflow_activity_logs", "audit_logs", "staff_profiles"
]);

const readOnlyByPermission: Record<string, string[]> = {
  "clients.read": ["clients"],
  "properties.read": ["rural_properties", "property_vertices", "property_neighbors", "property_certificates"],
  "documents.read": ["documents", "document_templates", "generated_documents", "document_library_items", "template_variables"],
  "checklists.read": ["checklist_templates", "checklist_template_items", "generated_checklists", "generated_checklist_items", "checklist_item_documents"],
  "geo.read": ["geo_files", "property_vertices", "property_neighbors", "technical_area_comparisons"],
  "financial.read": ["financial_entries"],
  "reports.read": ["reports", "report_exports"],
  "reports.geo": ["reports", "report_exports", "technical_area_comparisons"],
  "workflow.read": ["workflow_statuses", "workflow_templates", "workflow_template_versions", "workflow_stages", "workflow_transitions", "workflow_instances", "workflow_instance_stages", "workflow_tasks", "workflow_task_participants", "workflow_task_checklists", "workflow_task_subtasks", "workflow_task_comments", "workflow_task_attachments", "workflow_task_dependencies", "workflow_task_approvals", "workflow_task_tags", "workflow_task_tag_links", "workflow_task_time_entries", "workflow_teams", "workflow_team_members", "workflow_notifications", "workflow_notification_preferences", "workflow_automation_rules", "workflow_automation_executions", "workflow_activity_logs"]
};

const writeByPermission: Record<string, string[]> = {
  "clients.write": ["clients", "leads", "client_tags", "client_spouses", "client_exports"],
  "documents.write": ["documents", "document_templates", "generated_documents", "document_library_items", "template_variables"],
  "checklists.manage": ["checklist_templates", "checklist_template_items", "generated_checklists", "generated_checklist_items", "checklist_item_documents", "checklist_sources"],
  "geo.write": ["geo_files", "property_vertices", "property_neighbors", "technical_area_comparisons", "reports", "report_exports"],
  "financial.write": ["financial_entries"],
  "templates.generate": ["document_templates", "generated_documents", "template_variables"],
  "workflow.write": ["workflow_tasks", "workflow_task_participants", "workflow_task_checklists", "workflow_task_subtasks", "workflow_task_comments", "workflow_task_attachments", "workflow_task_dependencies", "workflow_task_approvals", "workflow_task_tags", "workflow_task_tag_links", "workflow_task_time_entries", "workflow_notifications", "workflow_activity_logs"],
  "workflow.manage": ["workflow_statuses", "workflow_templates", "workflow_template_versions", "workflow_stages", "workflow_transitions", "workflow_instances", "workflow_instance_stages", "workflow_teams", "workflow_team_members", "workflow_notification_preferences", "workflow_automation_rules", "workflow_automation_executions"]
};

function secret() {
  const value = process.env.ACCESS_SESSION_SECRET || process.env.PORTAL_SESSION_SECRET || process.env.BOOTSTRAP_SECRET;
  if (!value || value.length < 24) throw new Error("Configure ACCESS_SESSION_SECRET com pelo menos 24 caracteres.");
  return value;
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(data: string) {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createAccessToken(payload: Omit<AccessTokenPayload, "exp">, ttlSeconds = 60 * 60 * 8) {
  const body: AccessTokenPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const data = base64url(JSON.stringify(body));
  return `${data}.${sign(data)}`;
}

export function verifyAccessToken(token: string) {
  const [data, signature] = token.split(".");
  if (!data || !signature) throw new Error("Sessão inválida.");
  const expected = sign(data);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) throw new Error("Sessão inválida.");
  const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as AccessTokenPayload;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Sessão expirada.");
  return payload;
}

export function readBearer(headers: Headers) {
  return headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
}

export function normalizeCpf(cpf: string) {
  return String(cpf || "").replace(/\D/g, "");
}

export function isValidCpf(cpfInput: string) {
  const cpf = normalizeCpf(cpfInput);
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice - 1; i += 1) sum += Number(cpf[i]) * (slice - i);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  return calc(10) === Number(cpf[9]) && calc(11) === Number(cpf[10]);
}

export function normalizeName(name: string) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function isCompleteName(name: string) {
  return normalizeName(name).split(" ").filter(Boolean).length >= 2;
}

export function choiceToken(input: { actor_type: AccessActorType; actor_id: string; company_id: string; role?: string | null }) {
  return createAccessToken({ actor_type: input.actor_type, actor_id: input.actor_id, company_id: input.company_id, role: input.role || null, sid: crypto.randomUUID() }, 10 * 60);
}

export function verifyChoiceToken(token: string, expectedType: AccessActorType) {
  const payload = verifyAccessToken(token);
  if (payload.actor_type !== expectedType) throw new Error("Escolha inválida.");
  return payload;
}

export async function createAccessSession(input: {
  companyId: string;
  actorType: AccessActorType;
  actorId: string;
  role?: string | null;
  fullName?: string | null;
  companyCode?: string | null;
  ip?: string;
  userAgent?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const sid = crypto.randomUUID();
  const token = createAccessToken({ sid, company_id: input.companyId, actor_type: input.actorType, actor_id: input.actorId, role: input.role || null, full_name: input.fullName || null, company_code: input.companyCode || null });
  if (admin) {
    await admin.from("access_sessions").insert({
      id: sid,
      company_id: input.companyId,
      actor_type: input.actorType,
      actor_id: input.actorId,
      role: input.role || null,
      session_token_hash: hashToken(token),
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      ip_address: input.ip || null,
      user_agent: input.userAgent || null
    }).then(() => undefined, () => undefined);
  }
  return token;
}

export async function requireAccessActor(request: NextRequest | Request, expectedType?: AccessActorType) {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");
  const token = readBearer(request.headers);
  if (!token) throw new Error("Sessão obrigatória.");
  const payload = verifyAccessToken(token);
  if (expectedType && payload.actor_type !== expectedType) throw new Error("Sessão sem permissão.");
  if (payload.sid) {
    const { data: session } = await admin.from("access_sessions").select("id,revoked_at,expires_at").eq("id", payload.sid).eq("session_token_hash", hashToken(token)).maybeSingle();
    if (session?.revoked_at) throw new Error("Sessão revogada.");
    if (session?.expires_at && new Date(String(session.expires_at)).getTime() < Date.now()) throw new Error("Sessão expirada.");
    await admin.from("access_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", payload.sid).then(() => undefined, () => undefined);
  }
  return { admin, actor: payload, token };
}

export function permissionsForRole(role?: string | null) {
  return STAFF_ROLE_PERMISSIONS[String(role || "").toLowerCase()] || [];
}

function tablesFromPermissionMap(map: Record<string, string[]>, permissions: string[]) {
  const tables = new Set<string>();
  for (const permission of permissions) (map[permission] || []).forEach((table) => tables.add(table));
  return tables;
}

export function canStaffAccessTable(role: string | null | undefined, table: string, write = false) {
  const permissions = permissionsForRole(role);
  if (permissions.includes("*") || role === "gestor") return true;
  const readTables = tablesFromPermissionMap(readOnlyByPermission, permissions);
  const writeTables = tablesFromPermissionMap(writeByPermission, permissions);
  if (write) return writeTables.has(table);
  return readTables.has(table) || writeTables.has(table);
}

export function isCompanyScopedTable(table: string) {
  return companyScopedTables.has(table);
}

export function sanitizeStaffProfile(row: Record<string, any>, company?: Record<string, any> | null) {
  return {
    id: `staff-${row.id}`,
    staff_id: row.id,
    email: row.email || `${row.id}@staff.nexrural.local`,
    full_name: row.full_name,
    role: row.role,
    company_id: row.company_id,
    company_code: company?.company_code || null,
    company_status: company?.status || null,
    active: row.active !== false,
    access_type: "staff"
  };
}
