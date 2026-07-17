import { NextRequest, NextResponse } from "next/server";
import { requireInternalActor } from "@/lib/security/api-auth";

export const runtime = "nodejs";

function scopeCompany(actor: any, query: any) {
  return actor.role === "admin_master_global" ? query : query.eq("company_id", actor.company_id);
}

export async function POST(request: NextRequest) {
  try {
    const { admin, actor } = await requireInternalActor(request);
    const body = await request.json().catch(() => null);
    const templateId = String(body?.template_id || "");
    const clientId = String(body?.client_id || "");
    const propertyId = body?.property_id ? String(body.property_id) : null;
    const serviceId = body?.service_id ? String(body.service_id) : null;
    if (!templateId || !clientId) return NextResponse.json({ error: "Modelo de checklist e cliente sao obrigatorios." }, { status: 400 });

    let templateQuery = admin.from("checklist_templates").select("*").eq("id", templateId);
    templateQuery = scopeCompany(actor, templateQuery);
    const { data: template, error: templateError } = await templateQuery.single();
    if (templateError || !template) return NextResponse.json({ error: "Checklist nao encontrado." }, { status: 404 });
    const companyId = template.company_id || actor.company_id;

    const { data: client } = await admin.from("clients").select("id,company_id,full_name,name").eq("company_id", companyId).eq("id", clientId).single();
    if (!client) return NextResponse.json({ error: "Cliente nao encontrado na empresa do checklist." }, { status: 404 });

    if (propertyId) {
      const { data: property } = await admin.from("rural_properties").select("id").eq("company_id", companyId).eq("client_id", clientId).eq("id", propertyId).maybeSingle();
      if (!property) return NextResponse.json({ error: "Imovel nao pertence ao cliente selecionado." }, { status: 403 });
    }
    if (serviceId) {
      const { data: service } = await admin.from("services").select("id").eq("company_id", companyId).eq("client_id", clientId).eq("id", serviceId).maybeSingle();
      if (!service) return NextResponse.json({ error: "Servico nao pertence ao cliente selecionado." }, { status: 403 });
    }

    const { data: items, error: itemsError } = await admin.from("checklist_template_items").select("*").eq("company_id", companyId).eq("template_id", templateId).eq("active", true).order("sort_order");
    if (itemsError) throw itemsError;
    if (!items?.length) return NextResponse.json({ error: "Checklist sem itens cadastrados." }, { status: 400 });

    const { data: checklist, error } = await admin.from("generated_checklists").insert({
      company_id: companyId,
      template_id: templateId,
      client_id: clientId,
      property_id: propertyId,
      service_id: serviceId,
      title: String(body?.title || `${template.name} - ${client.full_name || client.name || "cliente"}`),
      status: "Em andamento",
      progress_percent: 0,
      visible_on_portal: false,
      created_by: actor.id
    }).select().single();
    if (error || !checklist) throw error || new Error("Falha ao gerar checklist.");

    const payload = items.map((item, index) => ({
      company_id: companyId,
      generated_checklist_id: checklist.id,
      template_item_id: item.id,
      document_name: item.document_name,
      description: item.description,
      required: item.required,
      status: item.visible_to_client ? "Solicitado ao cliente" : "Pendente",
      requested_at: item.visible_to_client ? new Date().toISOString() : null,
      responsible_type: item.who_provides || "Cliente",
      client_id: clientId,
      property_id: propertyId,
      service_id: serviceId,
      linked_template_id: item.linked_template_id || null,
      visible_to_client: item.visible_to_client ?? true,
      portal_instruction: item.portal_instruction,
      internal_notes: item.internal_instruction,
      sort_order: item.sort_order ?? index + 1
    }));
    const inserted = await admin.from("generated_checklist_items").insert(payload).select();
    if (inserted.error) throw inserted.error;
    await admin.from("audit_logs").insert({
      company_id: companyId,
      user_id: actor.id,
      user_role: actor.role,
      action: "generated_checklist_create",
      entity: "generated_checklists",
      entity_id: checklist.id,
      record_table: "generated_checklists",
      record_id: checklist.id,
      new_value: { template_id: templateId, client_id: clientId, item_count: payload.length },
      user_agent: request.headers.get("user-agent")
    });

    return NextResponse.json({ ok: true, checklist, items: inserted.data ?? [], visible_count: payload.filter((item) => item.visible_to_client).length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao gerar checklist." }, { status: 400 });
  }
}
