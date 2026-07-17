import { NextRequest, NextResponse } from "next/server";
import { readBearerToken, verifyPortalToken } from "@/lib/security/portal-token";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function sanitizePortalClient(row: Record<string, unknown>) {
  return {
    id: row.id,
    full_name: row.full_name || row.name,
    cpf_cnpj: row.cpf_cnpj || row.document,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    city: row.city,
    state: row.state,
    status: row.status,
    portal_enabled: row.portal_enabled
  };
}

function sanitizePortalProperty(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name || row.property_name,
    municipality: row.municipality || row.city,
    state: row.state,
    measured_area: row.measured_area || row.area_total,
    declared_area: row.declared_area,
    registry_number: row.registry_number || row.registration_number,
    car: row.car || row.car_number,
    ccir: row.ccir || row.ccir_number,
    documental_status: row.documental_status || row.status
  };
}

function sanitizePortalService(row: Record<string, unknown>) {
  return {
    id: row.id,
    service_type: row.service_type || row.type || row.title,
    status: row.status,
    priority: row.priority,
    expected_end_date: row.expected_end_date,
    progress_percent: row.progress_percent
  };
}

function sanitizePortalPendingItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    due_date: row.due_date,
    priority: row.priority,
    status: row.status,
    description: row.description,
    portal_instruction: row.portal_instruction
  };
}

function sanitizePortalDocument(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name || row.original_name,
    category: row.category,
    status: row.status,
    version: row.version,
    mime_type: row.mime_type,
    extension: row.extension,
    size: row.size,
    created_at: row.created_at,
    can_download: Boolean(row.storage_path),
    download_endpoint: `/api/portal/documents/${row.id}/download`
  };
}

function sanitizePortalFinancialEntry(row: Record<string, unknown>) {
  return {
    id: row.id,
    entry_type: row.entry_type,
    description: row.description,
    amount: row.amount,
    due_date: row.due_date,
    status: row.status
  };
}

function sanitizePortalContract(row: Record<string, unknown>) {
  return {
    id: row.id,
    contract_type: row.contract_type,
    title: row.title,
    status: row.status,
    signed_at: row.signed_at,
    expires_at: row.expires_at
  };
}

function sanitizePortalReport(row: Record<string, unknown>) {
  return {
    id: row.id,
    report_type: row.report_type,
    title: row.title,
    status: row.status,
    generated_at: row.generated_at,
    summary: row.summary
  };
}

function sanitizePortalCertificate(row: Record<string, unknown>) {
  return {
    id: row.id,
    certificate_type: row.certificate_type,
    agency: row.agency,
    status: row.status,
    issued_at: row.issued_at,
    expires_at: row.expires_at
  };
}

function sanitizePortalGeneratedChecklist(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title || row.name,
    status: row.status,
    progress_percent: row.progress_percent,
    created_at: row.created_at
  };
}

function sanitizePortalGeneratedChecklistItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    generated_checklist_id: row.generated_checklist_id,
    document_name: row.document_name,
    description: row.description,
    required: row.required,
    due_date: row.due_date,
    status: row.status,
    portal_instruction: row.portal_instruction,
    rejection_reason: row.rejection_reason
  };
}

function sanitizePortalGeneratedDocument(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    output_type: row.output_type,
    status: row.status,
    generated_at: row.generated_at,
    released_to_portal_at: row.released_to_portal_at,
    can_download: Boolean(row.storage_path),
    download_endpoint: `/api/portal/generated-documents/${row.id}/download`
  };
}

function sanitizePortalGeoFile(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    file_type: row.file_type,
    category: row.category,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at
  };
}

export async function GET(request: NextRequest) {
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY nao configurada." }, { status: 500 });

  try {
    const token = readBearerToken(request.headers);
    const portal = verifyPortalToken(token);

    const [clientResult, propertyResult, serviceResult, pendingResult, documentResult, generatedDocumentResult, financeResult, contractResult, reportResult, certificateResult, checklistResult] = await Promise.all([
      admin.from("clients").select("id,full_name,name,cpf_cnpj,document,phone,whatsapp,email,city,state,status,portal_enabled").eq("company_id", portal.company_id).eq("id", portal.client_id).limit(1),
      admin.from("rural_properties").select("id,name,property_name,municipality,city,state,measured_area,declared_area,registry_number,registration_number,car,car_number,ccir,ccir_number,documental_status,status").eq("company_id", portal.company_id).eq("client_id", portal.client_id),
      admin.from("services").select("id,service_type,type,title,status,priority,expected_end_date,progress_percent").eq("company_id", portal.company_id).eq("client_id", portal.client_id),
      admin.from("pending_items").select("id,title,category,due_date,priority,status,description,portal_instruction").eq("company_id", portal.company_id).eq("client_id", portal.client_id).eq("visible_on_portal", true),
      admin.from("documents").select("id,name,original_name,category,status,version,mime_type,extension,size,created_at,storage_path,visible_on_portal,uploaded_by").eq("company_id", portal.company_id).eq("client_id", portal.client_id).eq("visible_on_portal", true),
      admin.from("generated_documents").select("id,title,output_type,status,generated_at,released_to_portal_at,storage_path").eq("company_id", portal.company_id).eq("client_id", portal.client_id).eq("portal_visible", true),
      admin.from("financial_entries").select("id,entry_type,description,amount,due_date,status").eq("company_id", portal.company_id).eq("client_id", portal.client_id).eq("visible_on_portal", true),
      admin.from("rural_contracts").select("id,contract_type,title,status,signed_at,expires_at").eq("company_id", portal.company_id).eq("client_id", portal.client_id).eq("visible_on_portal", true),
      admin.from("reports").select("id,report_type,title,status,generated_at,summary").eq("company_id", portal.company_id).eq("client_id", portal.client_id).eq("visible_on_portal", true),
      admin.from("property_certificates").select("id,certificate_type,agency,status,issued_at,expires_at").eq("company_id", portal.company_id).eq("client_id", portal.client_id).eq("visible_on_portal", true),
      admin.from("generated_checklists").select("id,title,name,status,progress_percent,created_at").eq("company_id", portal.company_id).eq("client_id", portal.client_id).eq("visible_on_portal", true)
    ]);

    const errors = [clientResult, propertyResult, serviceResult, pendingResult, documentResult, generatedDocumentResult, financeResult, contractResult, reportResult, certificateResult, checklistResult]
      .map((result) => result.error?.message)
      .filter(Boolean);
    if (errors.length) return NextResponse.json({ error: errors[0] }, { status: 400 });

    const portalChecklists = checklistResult.data ?? [];
    const checklistIds = portalChecklists.map((row) => row.id).filter(Boolean);
    const checklistItems = checklistIds.length > 0
      ? await admin.from("generated_checklist_items").select("id,generated_checklist_id,document_name,description,required,due_date,status,portal_instruction,rejection_reason").in("generated_checklist_id", checklistIds).eq("visible_to_client", true)
      : { data: [], error: null };
    if (checklistItems.error) return NextResponse.json({ error: checklistItems.error.message }, { status: 400 });

    const properties = propertyResult.data ?? [];
    const propertyIds = properties.map((row) => row.id).filter(Boolean);
    const geoFiles = propertyIds.length > 0
      ? await admin.from("geo_files").select("id,name,file_type,category,status,notes,created_at").eq("company_id", portal.company_id).eq("visible_on_portal", true).in("property_id", propertyIds)
      : { data: [], error: null };
    if (geoFiles.error) return NextResponse.json({ error: geoFiles.error.message }, { status: 400 });

    return NextResponse.json({
      ok: true,
      rows: {
        clients: (clientResult.data ?? []).map(sanitizePortalClient),
        rural_properties: properties.map(sanitizePortalProperty),
        services: (serviceResult.data ?? []).map(sanitizePortalService),
        pending_items: (pendingResult.data ?? []).map(sanitizePortalPendingItem),
        documents: (documentResult.data ?? []).map(sanitizePortalDocument),
        generated_documents: (generatedDocumentResult.data ?? []).map(sanitizePortalGeneratedDocument),
        financial_entries: (financeResult.data ?? []).map(sanitizePortalFinancialEntry),
        rural_contracts: (contractResult.data ?? []).map(sanitizePortalContract),
        reports: (reportResult.data ?? []).map(sanitizePortalReport),
        property_certificates: (certificateResult.data ?? []).map(sanitizePortalCertificate),
        generated_checklists: portalChecklists.map(sanitizePortalGeneratedChecklist),
        generated_checklist_items: (checklistItems.data ?? []).map(sanitizePortalGeneratedChecklistItem),
        geo_files: (geoFiles.data ?? []).map(sanitizePortalGeoFile)
      }
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sessao do portal invalida." }, { status: 401 });
  }
}
