import { NextRequest, NextResponse } from "next/server";
import { requireInternalActor } from "@/lib/security/api-auth";

const allowed = new Set(["Pendente", "Solicitado ao cliente", "Recebido", "Em análise", "Em analise", "Validado", "Recusado", "Não aplicável", "Nao aplicavel", "Vencido"]);

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { admin, actor } = await requireInternalActor(request);
    const body = await request.json().catch(() => null);
    const id = String(body?.id || "");
    const status = String(body?.status || "");
    if (!id || !allowed.has(status)) return NextResponse.json({ error: "Item e status validos sao obrigatorios." }, { status: 400 });
    if (status === "Recusado" && !String(body?.rejection_reason || "").trim()) {
      return NextResponse.json({ error: "Informe o motivo da recusa." }, { status: 400 });
    }

    let readQuery = admin.from("generated_checklist_items").select("id,company_id,status").eq("id", id);
    if (actor.role !== "admin_master_global") readQuery = readQuery.eq("company_id", actor.company_id);
    const { data: existing, error: readError } = await readQuery.single();
    if (readError || !existing) return NextResponse.json({ error: "Item nao encontrado ou sem permissao." }, { status: 404 });

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status, updated_at: now };
    if (status === "Solicitado ao cliente") {
      patch.visible_to_client = true;
      patch.requested_at = now;
    }
    if (status === "Recebido") patch.received_at = now;
    if (status === "Em análise" || status === "Em analise") patch.in_review_at = now;
    if (status === "Validado") patch.validated_at = now;
    if (status === "Recusado") {
      patch.rejected_at = now;
      patch.rejection_reason = String(body.rejection_reason).trim();
    }
    if (status === "Não aplicável" || status === "Nao aplicavel") patch.not_applicable_at = now;

    const { data, error } = await admin
      .from("generated_checklist_items")
      .update(patch)
      .eq("id", id)
      .eq("company_id", existing.company_id)
      .select()
      .single();
    if (error) throw error;

    await admin.from("audit_logs").insert({
      company_id: existing.company_id,
      user_id: actor.id,
      user_role: actor.role,
      action: "checklist_item_status_update",
      entity: "generated_checklist_items",
      entity_id: id,
      record_table: "generated_checklist_items",
      record_id: id,
      new_value: patch,
      user_agent: request.headers.get("user-agent")
    });
    return NextResponse.json({ ok: true, item: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao atualizar item." }, { status: 400 });
  }
}
