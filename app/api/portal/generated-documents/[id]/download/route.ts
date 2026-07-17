import { NextRequest, NextResponse } from "next/server";
import { GENERATED_DOCUMENT_BUCKET } from "@/lib/env";
import { readBearerToken, verifyPortalToken } from "@/lib/security/portal-token";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY nao configurada." }, { status: 500 });

  try {
    const { id } = await context.params;
    const portal = verifyPortalToken(readBearerToken(request.headers));
    const { data: document, error } = await admin
      .from("generated_documents")
      .select("id,company_id,client_id,storage_path,portal_visible,deleted_at,title")
      .eq("id", id)
      .eq("company_id", portal.company_id)
      .eq("client_id", portal.client_id)
      .eq("portal_visible", true)
      .is("deleted_at", null)
      .single();
    if (error || !document) return NextResponse.json({ error: "Documento não liberado para este cliente." }, { status: 404 });
    if (!document.storage_path) return NextResponse.json({ error: "Arquivo do documento não localizado." }, { status: 404 });

    const signed = await admin.storage.from(GENERATED_DOCUMENT_BUCKET).createSignedUrl(String(document.storage_path), 5 * 60);
    if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error("Não foi possível gerar link seguro.");

    await admin.from("audit_logs").insert({
      company_id: portal.company_id,
      user_id: null,
      user_role: "cliente",
      action: "portal_generated_document_download",
      entity: "generated_documents",
      entity_id: id,
      record_table: "generated_documents",
      record_id: id,
      user_agent: request.headers.get("user-agent")
    });

    return NextResponse.json({ ok: true, url: signed.data.signedUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha no download do documento." }, { status: 400 });
  }
}
