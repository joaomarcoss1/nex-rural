import { DOCUMENT_BUCKET, backendMissingMessage, isDemoMode } from "@/lib/env";
import { supabase } from "@/lib/supabase/client";

export type BackendRecord = Record<string, unknown> & {
  id?: string;
  company_id?: string | null;
  client_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type QueryFilters = Record<string, string | number | boolean | null | undefined>;

const allowedDocumentExtensions = new Set(["pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx", "csv", "kml", "kmz", "geojson", "json"]);
const maxDocumentBytes = 50 * 1024 * 1024;
const tablesWithDeletedAt = new Set([
  "clients",
  "leads",
  "rural_properties",
  "services",
  "protocols",
  "pending_items",
  "documents",
  "service_tasks",
  "inspections",
  "calendar_events",
  "financial_entries",
  "messages",
  "property_dossiers",
  "checklist_templates",
  "checklist_template_items",
  "generated_checklists",
  "generated_checklist_items",
  "checklist_item_documents",
  "checklist_sources",
  "document_templates",
  "tags",
  "client_tags",
  "client_spouses",
  "client_exports",
  "workflow_templates",
  "workflow_template_versions",
  "workflow_stages",
  "workflow_transitions",
  "workflow_instances",
  "workflow_instance_stages",
  "workflow_tasks",
  "workflow_task_participants",
  "workflow_task_checklists",
  "workflow_task_subtasks",
  "workflow_task_comments",
  "workflow_task_attachments",
  "workflow_task_dependencies",
  "workflow_task_approvals",
  "workflow_task_tags",
  "workflow_task_tag_links",
  "workflow_task_time_entries",
  "workflow_teams",
  "workflow_team_members",
  "workflow_notifications",
  "workflow_notification_preferences",
  "workflow_automation_rules",
  "workflow_automation_executions",
  "workflow_activity_logs",
]);
const tablesWithUpdatedAt = new Set([
  "companies",
  "company_units",
  "user_profiles",
  "clients",
  "leads",
  "rural_properties",
  "service_types",
  "services",
  "checklist_items",
  "service_checklists",
  "protocols",
  "pending_items",
  "documents",
  "service_tasks",
  "inspections",
  "calendar_events",
  "financial_entries",
  "messages",
  "property_dossiers",
  "property_maps",
  "geo_files",
  "property_neighbors",
  "property_vertices",
  "field_equipment",
  "equipment_movements",
  "registry_records",
  "registry_requirements",
  "due_diligence_cases",
  "due_diligence_checklist_items",
  "ownership_chain",
  "property_certificates",
  "official_checks",
  "rural_calendar_alerts",
  "commercial_templates",
  "generated_commercial_documents",
  "aged_producer_registrations",
  "aged_property_registrations",
  "aged_livestock_exploitations",
  "iterma_cases",
  "rural_contracts",
  "roles",
  "client_portal_access",
  "document_library_items",
  "official_templates",
  "due_diligence_risks",
  "aged_gta_records",
  "car_records",
  "ccir_records",
  "itr_records",
  "sigef_records",
  "cib_nirf_records",
  "technical_area_comparisons",
  "reports",
  "checklist_templates",
  "checklist_template_items",
  "generated_checklists",
  "generated_checklist_items",
  "checklist_item_documents",
  "checklist_sources",
  "document_templates",
  "tags",
  "client_tags",
  "client_spouses",
  "client_exports",
  "workflow_templates",
  "workflow_template_versions",
  "workflow_stages",
  "workflow_transitions",
  "workflow_instances",
  "workflow_instance_stages",
  "workflow_tasks",
  "workflow_task_participants",
  "workflow_task_checklists",
  "workflow_task_subtasks",
  "workflow_task_comments",
  "workflow_task_attachments",
  "workflow_task_dependencies",
  "workflow_task_approvals",
  "workflow_task_tags",
  "workflow_task_tag_links",
  "workflow_task_time_entries",
  "workflow_teams",
  "workflow_team_members",
  "workflow_notifications",
  "workflow_notification_preferences",
  "workflow_automation_rules",
  "workflow_automation_executions",
  "workflow_activity_logs",
]);


function staffAccessToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("nex-rural-staff-access-token-v1") || "";
}

async function staffCrud<T extends BackendRecord>(input: { operation: "list" | "create" | "update" | "delete" | "soft_delete"; table: string; id?: string; record?: unknown; patch?: unknown; filters?: QueryFilters }) {
  const token = staffAccessToken();
  if (!token) return null;
  const response = await fetch("/api/access/crud", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Operação não autorizada para funcionário.");
  return data as { rows?: T[]; record?: T; ok?: boolean };
}

function ensureBackend() {
  if (!isDemoMode && !supabase) throw new Error(backendMissingMessage);
}

function demoKey(table: string) {
  return `nex-rural-demo-v2-${table}`;
}

function readDemo<T extends BackendRecord>(table: string, fallback: T[] = []) {
  if (!isDemoMode || typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(demoKey(table));
  return value ? (JSON.parse(value) as T[]) : fallback;
}

function writeDemo<T extends BackendRecord>(table: string, rows: T[]) {
  if (isDemoMode && typeof window !== "undefined") {
    window.localStorage.setItem(demoKey(table), JSON.stringify(rows));
  }
}

function matchesFilters(row: BackendRecord, filters: QueryFilters) {
  return Object.entries(filters).every(([key, value]) => value === undefined || value === null || row[key] === value);
}

export async function listRecords<T extends BackendRecord>(table: string, filters: QueryFilters = {}, fallback: T[] = []) {
  if (isDemoMode) {
    return readDemo<T>(table, fallback).filter((row) => !row.deleted_at && matchesFilters(row, filters));
  }

  const staffResult = await staffCrud<T>({ operation: "list", table, filters });
  if (staffResult?.rows) return staffResult.rows;

  ensureBackend();
  let query = supabase!.from(table).select("*");
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) query = query.eq(key, value);
  });
  if (tablesWithDeletedAt.has(table) && !filters.deleted_at) query = query.is("deleted_at", null);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function createRecord<T extends BackendRecord>(table: string, record: T, fallback: T[] = []) {
  const now = new Date().toISOString();
  if (isDemoMode) {
    const rows = readDemo<T>(table, fallback);
    const next = { id: record.id ?? `${table}-${Date.now()}`, ...record, created_at: now, updated_at: now } as T;
    writeDemo(table, [next, ...rows]);
    return next;
  }

  const staffResult = await staffCrud<T>({ operation: "create", table, record });
  if (staffResult?.record) return staffResult.record;

  ensureBackend();
  const payload = { ...record, id: undefined };
  const { data, error } = await supabase!.from(table).insert(payload).select().single();
  if (error) throw error;
  return data as T;
}

export async function updateRecord<T extends BackendRecord>(table: string, id: string, patch: Partial<T>, fallback: T[] = []) {
  const now = new Date().toISOString();
  if (isDemoMode) {
    const rows = readDemo<T>(table, fallback);
    const next = rows.map((row) => (row.id === id ? ({ ...row, ...patch, updated_at: now } as T) : row));
    writeDemo(table, next);
    return next.find((row) => row.id === id) ?? null;
  }

  const staffResult = await staffCrud<T>({ operation: "update", table, id, patch });
  if (staffResult?.record) return staffResult.record;

  ensureBackend();
  const updatePayload = (tablesWithUpdatedAt.has(table) ? { ...patch, updated_at: now } : patch) as Record<string, unknown>;
  const { data, error } = await supabase!.from(table).update(updatePayload).eq("id", id).select().single();
  if (error) throw error;
  return data as T;
}

export async function deleteRecord(table: string, id: string, fallback: BackendRecord[] = []) {
  if (isDemoMode) {
    writeDemo(
      table,
      readDemo(table, fallback).filter((row) => row.id !== id)
    );
    return;
  }

  const staffResult = await staffCrud({ operation: "delete", table, id });
  if (staffResult?.ok) return;

  ensureBackend();
  const { error } = await supabase!.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function softDeleteRecord(table: string, id: string, fallback: BackendRecord[] = []) {
  if (!isDemoMode) {
    const staffResult = await staffCrud({ operation: "soft_delete", table, id });
    if (staffResult?.ok) return null;
  }
  return updateRecord(table, id, { deleted_at: new Date().toISOString() }, fallback);
}

function extensionFor(file: File) {
  const suffix = file.name.split(".").pop();
  return suffix ? suffix.toLowerCase() : "";
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadDocumentFile(input: {
  file: File;
  companyId: string;
  clientId?: string;
  propertyId?: string;
  serviceId?: string;
  protocolId?: string;
  pendingItemId?: string;
  category: string;
  uploadedBy?: string;
  visibleOnPortal?: boolean;
}) {
  const extension = extensionFor(input.file);
  if (!allowedDocumentExtensions.has(extension)) throw new Error("Formato de arquivo nao permitido.");
  if (input.file.size > maxDocumentBytes) throw new Error("Arquivo acima do limite de 50 MB.");

  const version = 1;
  const cleanName = input.file.name.replace(/[^\w.\-]+/g, "_");
  const storagePath = [
    input.companyId,
    input.clientId ?? "sem-cliente",
    input.propertyId ?? "sem-imovel",
    input.serviceId ?? "sem-servico",
    input.category.replace(/[^\w\-]+/g, "_"),
    `v${version}`,
    `${Date.now()}-${cleanName}`
  ].join("/");

  const base = {
    company_id: input.companyId,
    client_id: input.clientId || null,
    property_id: input.propertyId || null,
    service_id: input.serviceId || null,
    protocol_id: input.protocolId || null,
    pending_item_id: input.pendingItemId || null,
    name: input.file.name,
    original_name: input.file.name,
    mime_type: input.file.type || "application/octet-stream",
    extension,
    size: input.file.size,
    category: input.category,
    storage_path: storagePath,
    version,
    status: "Recebido",
    visible_on_portal: Boolean(input.visibleOnPortal),
    uploaded_by: input.uploadedBy || null
  };

  if (isDemoMode) {
    return createRecord("documents", { ...base, data_url: await fileToDataUrl(input.file) });
  }

  ensureBackend();
  const upload = await supabase!.storage.from(DOCUMENT_BUCKET).upload(storagePath, input.file, { upsert: false });
  if (upload.error) throw upload.error;
  const { data, error } = await supabase!.from("documents").insert(base).select().single();
  if (error) throw error;
  return data as BackendRecord;
}

export async function downloadDocumentFile(document: BackendRecord) {
  if (isDemoMode && typeof document.data_url === "string") {
    return document.data_url;
  }

  ensureBackend();
  const { data, error } = await supabase!.storage.from(DOCUMENT_BUCKET).createSignedUrl(String(document.storage_path), 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function auditAction(input: {
  companyId?: string;
  userId?: string;
  userRole?: string;
  action: string;
  entity?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  const row = {
    company_id: input.companyId || null,
    user_id: input.userId || null,
    user_role: input.userRole || null,
    action: input.action,
    entity: input.entity || null,
    record_table: input.entity || null,
    entity_id: input.entityId || null,
    record_id: input.entityId || null,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    user_agent: typeof navigator === "undefined" ? null : navigator.userAgent
  };

  try {
    if (isDemoMode) {
      await createRecord("audit_logs", row);
      return;
    }
    ensureBackend();
    const { error } = await supabase!.from("audit_logs").insert(row);
    if (error) throw error;
  } catch (error) {
    console.warn("[Nex Rural] Auditoria nao registrada", error);
  }
}
