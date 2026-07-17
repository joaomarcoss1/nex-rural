import { NextRequest, NextResponse } from "next/server";
import { canStaffAccessTable, isCompanyScopedTable, requireAccessActor } from "@/lib/security/access";

export const runtime = "nodejs";

const defaultTables = [
  "companies", "staff_profiles", "clients", "leads", "rural_properties", "services", "protocols", "pending_items", "documents", "geo_files", "property_vertices", "property_neighbors", "field_equipment", "equipment_movements", "inspections", "registry_records", "registry_requirements", "property_certificates", "official_checks", "document_library_items", "checklist_templates", "checklist_template_items", "generated_checklists", "generated_checklist_items", "checklist_item_documents", "checklist_sources", "document_templates", "generated_documents", "template_variables", "tags", "client_tags", "client_spouses", "client_exports", "due_diligence_cases", "due_diligence_risks", "ownership_chain", "financial_entries", "aged_producer_registrations", "aged_property_registrations", "aged_livestock_exploitations", "aged_gta_records", "iterma_cases", "rural_contracts", "car_records", "ccir_records", "itr_records", "sigef_records", "cib_nirf_records", "technical_area_comparisons", "reports", "report_exports", "workflow_statuses", "workflow_templates", "workflow_template_versions", "workflow_stages", "workflow_transitions", "workflow_instances", "workflow_instance_stages", "workflow_tasks", "workflow_task_participants", "workflow_task_checklists", "workflow_task_subtasks", "workflow_task_comments", "workflow_task_attachments", "workflow_task_dependencies", "workflow_task_approvals", "workflow_task_tags", "workflow_task_tag_links", "workflow_task_time_entries", "workflow_teams", "workflow_team_members", "workflow_notifications", "workflow_notification_preferences", "workflow_automation_rules", "workflow_automation_executions", "workflow_activity_logs", "audit_logs"
];

export async function GET(request: NextRequest) {
  try {
    const { admin, actor } = await requireAccessActor(request, "staff");
    const tablesParam = request.nextUrl.searchParams.get("tables");
    const requested = tablesParam ? tablesParam.split(",").map((item) => item.trim()).filter(Boolean) : defaultTables;
    const rows: Record<string, unknown[]> = {};
    const denied: string[] = [];
    for (const table of requested) {
      if (!canStaffAccessTable(actor.role, table, false)) {
        denied.push(table);
        continue;
      }
      let query = admin.from(table).select("*").limit(500);
      if (isCompanyScopedTable(table)) query = query.eq("company_id", actor.company_id);
      if (["clients", "rural_properties", "documents", "checklist_templates", "checklist_template_items", "generated_checklists", "generated_checklist_items", "document_templates", "generated_documents", "pending_items", "financial_entries", "workflow_templates", "workflow_stages", "workflow_instances", "workflow_tasks", "workflow_task_checklists", "workflow_task_subtasks", "workflow_task_comments", "workflow_task_attachments", "workflow_task_dependencies", "workflow_task_approvals", "workflow_teams", "workflow_notifications", "workflow_activity_logs"].includes(table)) {
        query = query.is("deleted_at", null);
      }
      const { data, error } = await query;
      if (!error) rows[table] = data || [];
    }
    return NextResponse.json({ ok: true, rows, denied });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao carregar dados do funcionário." }, { status: 401 });
  }
}
