import { NextRequest, NextResponse } from "next/server";
import { DOCUMENT_TEMPLATE_BUCKET } from "@/lib/env";
import { defaultVariableMap, extractDocxVariables } from "@/lib/document-engine";
import { requireInternalActor } from "@/lib/security/api-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { admin, actor } = await requireInternalActor(request);
    const body = await request.json().catch(() => null);
    const templateId = String(body?.template_id || "");
    if (!templateId) return NextResponse.json({ error: "Modelo obrigatorio." }, { status: 400 });

    const { data: template, error } = await admin.from("document_templates").select("*").eq("company_id", actor.company_id).eq("id", templateId).single();
    if (error || !template) return NextResponse.json({ error: "Modelo nao encontrado." }, { status: 404 });
    if (!template.storage_path) return NextResponse.json({ error: "Modelo sem arquivo DOCX vinculado." }, { status: 400 });

    const download = await admin.storage.from(DOCUMENT_TEMPLATE_BUCKET).download(String(template.storage_path));
    if (download.error || !download.data) throw download.error || new Error("Nao foi possivel baixar o modelo.");
    const variables = extractDocxVariables(Buffer.from(await download.data.arrayBuffer())).map((item) => item.key);
    const variableMap = defaultVariableMap(variables);

    const { data: updated, error: updateError } = await admin
      .from("document_templates")
      .update({ variables, variable_map: { ...variableMap, ...(template.variable_map || {}) }, updated_by: actor.id, updated_at: new Date().toISOString() })
      .eq("company_id", actor.company_id)
      .eq("id", templateId)
      .select()
      .single();
    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, template: updated, variables, variable_map: updated.variable_map });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao analisar DOCX." }, { status: 400 });
  }
}
