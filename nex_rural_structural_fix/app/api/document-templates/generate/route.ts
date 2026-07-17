import Docxtemplater from "docxtemplater";
import { NextRequest, NextResponse } from "next/server";
import PizZip from "pizzip";
import { DOCUMENT_TEMPLATE_BUCKET, GENERATED_DOCUMENT_BUCKET } from "@/lib/env";
import { resolveTemplateData } from "@/lib/document-engine";
import { cleanStoragePart, requireInternalActor } from "@/lib/security/api-auth";

export const runtime = "nodejs";

type DbResult<T> = PromiseLike<{ data: T | null; error: unknown }>;

async function maybeSingle<T>(query: DbResult<T>) {
  const result = await query;
  return result.data ?? null;
}

export async function POST(request: NextRequest) {
  let generatedStoragePath = "";
  try {
    const { admin, actor } = await requireInternalActor(request);
    const body = await request.json().catch(() => null);
    const templateId = String(body?.template_id || "");
    const clientId = String(body?.client_id || "");
    const propertyId = body?.property_id ? String(body.property_id) : "";
    const serviceId = body?.service_id ? String(body.service_id) : "";
    const checklistId = body?.checklist_id ? String(body.checklist_id) : "";
    const generatedChecklistItemId = body?.generated_checklist_item_id ? String(body.generated_checklist_item_id) : "";
    const allowIncomplete = Boolean(body?.allow_incomplete);
    const manualValues = body?.manual_values && typeof body.manual_values === "object" ? body.manual_values as Record<string, string> : {};
    if (!templateId || !clientId) return NextResponse.json({ error: "Informe modelo e cliente." }, { status: 400 });

    let templateQuery = admin
      .from("document_templates")
      .select("*")
      .eq("id", templateId);
    if (actor.role !== "admin_master_global") templateQuery = templateQuery.eq("company_id", actor.company_id);
    const { data: template, error: templateError } = await templateQuery.single();
    if (templateError || !template) return NextResponse.json({ error: "Modelo nao encontrado." }, { status: 404 });
    const companyId = String(template.company_id || actor.company_id);
    if (String(template.file_type || "").toLowerCase() !== "docx" || !template.storage_path) {
      return NextResponse.json({ error: "Este modelo nao possui arquivo DOCX preenchivel." }, { status: 400 });
    }

    const [company, client, property, service] = await Promise.all([
      maybeSingle(admin.from("companies").select("*").eq("id", companyId).limit(1).maybeSingle()),
      maybeSingle(admin.from("clients").select("*").eq("company_id", companyId).eq("id", clientId).limit(1).maybeSingle()),
      propertyId ? maybeSingle(admin.from("rural_properties").select("*").eq("company_id", companyId).eq("id", propertyId).limit(1).maybeSingle()) : Promise.resolve(null),
      serviceId ? maybeSingle(admin.from("services").select("*").eq("company_id", companyId).eq("id", serviceId).limit(1).maybeSingle()) : Promise.resolve(null)
    ]);
    if (!client) return NextResponse.json({ error: "Cliente nao encontrado na empresa." }, { status: 404 });

    const resolved = resolveTemplateData({ template, client, property, service, company, manualValues });
    if (resolved.missingRequired.length && !allowIncomplete) {
      return NextResponse.json(
        {
          ok: false,
          requires_confirmation: true,
          missing: resolved.missingRequired.map((item) => item.variable),
          missing_details: resolved.missingRequired,
          missing_required: resolved.missingRequired,
          missing_optional: resolved.missingOptional,
          warnings: resolved.warnings,
          message: `Campos obrigatórios sem dados: ${resolved.missingRequired.map((item) => `{{${item.variable}}}`).join(", ")}`
        },
        { status: 409 }
      );
    }

    const download = await admin.storage.from(DOCUMENT_TEMPLATE_BUCKET).download(String(template.storage_path));
    if (download.error || !download.data) throw download.error || new Error("Nao foi possivel baixar o modelo DOCX.");
    const zip = new PizZip(Buffer.from(await download.data.arrayBuffer()));
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => ""
    });
    doc.render(resolved.data);
    const output = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });

    const clientRecord = client as Record<string, unknown>;
    const clientName = String(clientRecord.full_name || clientRecord.name || "cliente");
    const title = String(body?.title || `${template.name} - ${clientName}`);
    const fileName = `${cleanStoragePart(title)}-${Date.now()}.docx`;
    generatedStoragePath = [companyId, "clients", clientId, "generated", fileName].join("/");
    const upload = await admin.storage.from(GENERATED_DOCUMENT_BUCKET).upload(generatedStoragePath, output, {
      upsert: false,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    if (upload.error) throw upload.error;

    const { data: generated, error: generatedError } = await admin
      .from("generated_documents")
      .insert({
        company_id: companyId,
        template_id: templateId,
        client_id: clientId,
        property_id: propertyId || null,
        service_id: serviceId || null,
        checklist_id: checklistId || null,
        title,
        output_type: "docx",
        storage_path: generatedStoragePath,
        public_url: null,
        portal_visible: false,
        status: "Gerado",
        generated_by: actor.id,
        generated_at: new Date().toISOString(),
        generation_metadata: {
          manual_values: manualValues,
          missing_required: resolved.missingRequired,
          missing_optional: resolved.missingOptional,
          warnings: resolved.warnings
        }
      })
      .select("id,title,output_type,status,portal_visible,generated_at")
      .single();
    if (generatedError) throw generatedError;

    if (generatedChecklistItemId) {
      await admin.from("generated_document_checklist_items").insert({
        company_id: companyId,
        generated_document_id: generated.id,
        generated_checklist_id: checklistId || null,
        generated_checklist_item_id: generatedChecklistItemId
      });
    }

    await admin.from("audit_logs").insert({
      company_id: companyId,
      user_id: actor.id,
      user_role: actor.role,
      action: "generated_document_create",
      entity: "generated_documents",
      entity_id: generated.id,
      record_table: "generated_documents",
      record_id: generated.id,
      new_value: { title, template_id: templateId, client_id: clientId, missing_required: resolved.missingRequired.map((item) => item.variable), missing_optional: resolved.missingOptional.map((item) => item.variable) }
    });

    return NextResponse.json({
      ok: true,
      generated_document: generated,
      download_url: `/api/generated-documents/${generated.id}/download`,
      missing: resolved.missingRequired,
      missing_required: resolved.missingRequired,
      missing_optional: resolved.missingOptional,
      warnings: resolved.warnings
    });
  } catch (err) {
    // Evita documento órfão no Storage quando a gravação no banco falha.
    try {
      if (generatedStoragePath) {
        const { admin } = await requireInternalActor(request);
        await admin.storage.from(GENERATED_DOCUMENT_BUCKET).remove([generatedStoragePath]);
      }
    } catch {
      // Não bloquear a resposta original.
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao gerar documento." }, { status: 400 });
  }
}
