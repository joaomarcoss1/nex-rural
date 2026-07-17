import { NextRequest, NextResponse } from "next/server";
import { canStaffAccessTable, isCompanyScopedTable, requireAccessActor } from "@/lib/security/access";

export const runtime = "nodejs";

type Operation = "list" | "create" | "update" | "delete" | "soft_delete";

export async function POST(request: NextRequest) {
  try {
    const { admin, actor } = await requireAccessActor(request, "staff");
    const body = await request.json().catch(() => null) as { operation?: Operation; table?: string; id?: string; record?: Record<string, unknown>; patch?: Record<string, unknown>; filters?: Record<string, unknown> } | null;
    const operation = body?.operation;
    const table = String(body?.table || "");
    if (!operation || !table) return NextResponse.json({ error: "Operação e tabela obrigatórias." }, { status: 400 });
    const write = operation !== "list";
    if (!canStaffAccessTable(actor.role, table, write)) return NextResponse.json({ error: "Funcionário sem permissão para esta operação." }, { status: 403 });

    if (operation === "list") {
      let query = admin.from(table).select("*");
      if (isCompanyScopedTable(table)) query = query.eq("company_id", actor.company_id);
      for (const [key, value] of Object.entries(body?.filters || {})) if (value !== undefined && value !== null) query = query.eq(key, value as any);
      const { data, error } = await query.limit(500);
      if (error) throw error;
      return NextResponse.json({ ok: true, rows: data || [] });
    }

    if (operation === "create") {
      const payload = { ...(body?.record || {}) };
      if (isCompanyScopedTable(table)) payload.company_id = actor.company_id;
      payload.created_by = payload.created_by || actor.actor_id;
      const { data, error } = await admin.from(table).insert(payload).select().single();
      if (error) throw error;
      return NextResponse.json({ ok: true, record: data });
    }

    if (!body?.id) return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
    let scoped = admin.from(table);
    if (operation === "delete") {
      let query = scoped.delete().eq("id", body.id);
      if (isCompanyScopedTable(table)) query = query.eq("company_id", actor.company_id);
      const { error } = await query;
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    const patch = operation === "soft_delete" ? { deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() } : { ...(body?.patch || {}), updated_at: new Date().toISOString(), updated_by: actor.actor_id };
    let query = scoped.update(patch).eq("id", body.id);
    if (isCompanyScopedTable(table)) query = query.eq("company_id", actor.company_id);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, record: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha na operação do funcionário." }, { status: 400 });
  }
}
