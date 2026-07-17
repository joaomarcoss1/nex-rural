import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { DOCUMENT_TEMPLATE_BUCKET } from "@/lib/env";
import { defaultVariableMap, extractDocxVariables } from "@/lib/document-engine";
import { cleanStoragePart, requireInternalActor } from "@/lib/security/api-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let storagePath = "";
  try {
    const { admin, actor } = await requireInternalActor(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo DOCX obrigatorio." }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".docx")) return NextResponse.json({ error: "Envie um arquivo .docx." }, { status: 400 });
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Modelo acima do limite de 20MB." }, { status: 413 });

    const name = String(form.get("name") || file.name.replace(/\.docx$/i, "")).trim();
    const category = String(form.get("category") || "Modelo da empresa").trim();
    const description = String(form.get("description") || "Modelo DOCX enviado pela empresa para preenchimento automatico.").trim();
    if (!name) return NextResponse.json({ error: "Nome do modelo obrigatorio." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const variables = extractDocxVariables(buffer).map((item) => item.key);
    const variableMap = defaultVariableMap(variables);
    const templateId = randomUUID();
    storagePath = [String(actor.company_id), "templates", templateId, `${Date.now()}-${cleanStoragePart(file.name)}`].join("/");

    const upload = await admin.storage.from(DOCUMENT_TEMPLATE_BUCKET).upload(storagePath, buffer, {
      upsert: false,
      contentType: file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    if (upload.error) throw upload.error;

    const { data: template, error: insertError } = await admin
      .from("document_templates")
      .insert({
        id: templateId,
        company_id: actor.company_id,
        name,
        category,
        description,
        file_type: "docx",
        original_filename: file.name,
        storage_path: storagePath,
        public_url: null,
        variables,
        variable_map: variableMap,
        status: "Ativo",
        is_fillable: true,
        source_type: "Modelo da empresa",
        created_by: actor.id,
        updated_by: actor.id
      })
      .select("id,company_id,name,category,description,file_type,original_filename,variables,variable_map,status,is_fillable,source_type,created_at,updated_at")
      .single();
    if (insertError || !template) throw insertError || new Error("Nao foi possivel criar o modelo.");

    await admin.from("audit_logs").insert({
      company_id: actor.company_id,
      user_id: actor.id,
      user_role: actor.role,
      action: "document_template_upload",
      entity: "document_templates",
      entity_id: template.id,
      record_table: "document_templates",
      record_id: template.id,
      new_value: { name, variables, original_filename: file.name }
    });

    return NextResponse.json({ ok: true, template, variables, variable_map: variableMap });
  } catch (err) {
    try {
      if (storagePath) {
        const { admin } = await requireInternalActor(request);
        await admin.storage.from(DOCUMENT_TEMPLATE_BUCKET).remove([storagePath]);
      }
    } catch {
      // Mantém o erro original.
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao enviar modelo DOCX." }, { status: 400 });
  }
}
