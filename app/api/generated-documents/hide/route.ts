import { NextRequest, NextResponse } from "next/server";
import { requireInternalActor } from "@/lib/security/api-auth";

export const runtime = "nodejs";

function scopedDocumentQuery(admin: any, actor: any, id: string) {
  let query = admin.from("generated_documents").select("id,company_id,title,portal_visible,status").eq("id", id);
  if (actor.role !== "admin_master_global") query = query.eq("company_id", actor.company_id);
  return query.single();
}

export async function POST(request: NextRequest) {
  try {
    const { admin, actor } = await requireInternalActor(request);
    const body = await request.json().catch(() => null);
    const id = String(body?.id || body?.generated_document_id || "");
    if (!id) return NextResponse.json({ error: "Documento gerado obrigatorio." }, { status: 400 });

    const { data: existing, error: readError } = await scopedDocumentQuery(admin, actor, id);
    if (readError || !existing) return NextResponse.json({ error: "Documento gerado nao encontrado ou sem permissao." }, { status: 404 });

    const { data, error } = await admin
      .from("generated_documents")
      .update({ portal_visible: false, status: "Gerado", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", existing.company_id)
      .select("id,title,output_type,status,portal_visible,released_to_portal_at,generated_at")
      .single();
    if (error) throw error;

    await admin.from("audit_logs").insert({
      company_id: existing.company_id,
      user_id: actor.id,
      user_role: actor.role,
      action: "generated_document_hide",
      entity: "generated_documents",
      entity_id: id,
      record_table: "generated_documents",
      record_id: id,
      new_value: { portal_visible: false, operated_as_admin_master: actor.role === "admin_master_global" },
      user_agent: request.headers.get("user-agent")
    });
    return NextResponse.json({ ok: true, generated_document: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao ocultar documento." }, { status: 400 });
  }
}
