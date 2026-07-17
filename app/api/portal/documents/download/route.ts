import { NextRequest, NextResponse } from "next/server";
import { DOCUMENT_BUCKET } from "@/lib/env";
import { readBearerToken, verifyPortalToken } from "@/lib/security/portal-token";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY nao configurada." }, { status: 500 });

  try {
    const portal = verifyPortalToken(readBearerToken(request.headers));
    const body = await request.json().catch(() => null);
    const documentId = String(body?.document_id || "");
    if (!documentId) return NextResponse.json({ error: "Documento obrigatorio." }, { status: 400 });

    const { data: document, error } = await admin
      .from("documents")
      .select("id,company_id,client_id,storage_path,visible_on_portal,uploaded_by")
      .eq("id", documentId)
      .eq("company_id", portal.company_id)
      .eq("client_id", portal.client_id)
      .single();
    if (error || !document) return NextResponse.json({ error: "Documento nao encontrado." }, { status: 404 });

    const ownUpload = document.uploaded_by === `portal-${portal.client_id}`;
    if (!document.visible_on_portal && !ownUpload) return NextResponse.json({ error: "Documento nao liberado no portal." }, { status: 403 });

    const signed = await admin.storage.from(DOCUMENT_BUCKET).createSignedUrl(String(document.storage_path), 5 * 60);
    if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error("Nao foi possivel gerar link seguro.");

    await admin.from("audit_logs").insert({
      company_id: portal.company_id,
      user_id: null,
      user_role: "cliente",
      action: "portal_document_download",
      entity: "documents",
      entity_id: document.id,
      record_table: "documents",
      record_id: document.id,
      user_agent: request.headers.get("user-agent")
    });

    return NextResponse.json({ ok: true, url: signed.data.signedUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha no download." }, { status: 400 });
  }
}
