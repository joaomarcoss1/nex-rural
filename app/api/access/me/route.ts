import { NextRequest, NextResponse } from "next/server";
import { requireAccessActor, sanitizeStaffProfile } from "@/lib/security/access";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { admin, actor } = await requireAccessActor(request);
    if (actor.actor_type === "client") {
      const { data: client, error } = await admin.from("clients").select("id,company_id,full_name,name,email,active,status,portal_enabled,companies:company_id(id,company_code,status)").eq("id", actor.actor_id).eq("company_id", actor.company_id).single();
      if (error || !client || client.portal_enabled === false || client.active === false) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
      const company = Array.isArray(client.companies) ? client.companies[0] : client.companies;
      return NextResponse.json({ ok: true, profile: { id: `portal-${client.id}`, email: client.email || `${client.id}@portal.nexrural.local`, full_name: client.full_name || client.name, role: "cliente", company_id: client.company_id, company_code: company?.company_code || null, company_status: company?.status || null, client_id: client.id, client_name: client.full_name || client.name, active: true, access_type: "client" } });
    }
    const { data: staff, error } = await admin.from("staff_profiles").select("id,company_id,full_name,email,role,active,status,companies:company_id(id,company_code,status)").eq("id", actor.actor_id).eq("company_id", actor.company_id).single();
    if (error || !staff || staff.active === false) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    const company = Array.isArray(staff.companies) ? staff.companies[0] : staff.companies;
    return NextResponse.json({ ok: true, profile: sanitizeStaffProfile(staff, company) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sessão inválida." }, { status: 401 });
  }
}
