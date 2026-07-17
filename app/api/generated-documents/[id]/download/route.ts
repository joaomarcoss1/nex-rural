import { NextRequest, NextResponse } from "next/server";
import { GENERATED_DOCUMENT_BUCKET } from "@/lib/env";
import { requireInternalActor } from "@/lib/security/api-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { admin, actor } = await requireInternalActor(request);
    let documentQuery = admin
      .from("generated_documents")
      .select("id,company_id,storage_path,title,output_type")
      .eq("id", id);
    if (actor.role !== "admin_master_global") documentQuery = documentQuery.eq("company_id", actor.company_id);
    const { data: document, error } = await documentQuery.single();
    if (error || !document) return NextResponse.json({ error: "Documento nao encontrado." }, { status: 404 });
    if (!document.storage_path) return NextResponse.json({ error: "Arquivo do documento nao localizado." }, { status: 404 });

    const signed = await admin.storage.from(GENERATED_DOCUMENT_BUCKET).createSignedUrl(String(document.storage_path), 5 * 60);
    if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error("Nao foi possivel gerar link seguro.");

    await admin.from("audit_logs").insert({
      company_id: document.company_id,
      user_id: actor.id,
      user_role: actor.role,
      action: "generated_document_download",
      entity: "generated_documents",
      entity_id: id,
      record_table: "generated_documents",
      record_id: id,
      user_agent: request.headers.get("user-agent")
    });

    return NextResponse.json({ ok: true, url: signed.data.signedUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha no download do documento gerado." }, { status: 400 });
  }
}
