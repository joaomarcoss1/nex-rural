import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const allowedRoles = new Set(["admin_master_global", "company_admin", "admin_master", "gestor", "tecnico", "topografo", "agrimensor", "administrativo", "financeiro", "cliente"]);

export async function POST(request: Request) {
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY nao configurada." }, { status: 500 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload invalido." }, { status: 400 });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Sessao administrativa obrigatoria." }, { status: 401 });

  const email = String(body.email || "");
  const password = String(body.password || "");
  const fullName = String(body.full_name || "");
  const companyId = String(body.company_id || "");
  const companyCode = body.company_code ? String(body.company_code) : null;
  const role = String(body.role || "administrativo");
  if (!email || !password || !fullName || !companyId) {
    return NextResponse.json({ error: "Informe email, senha, nome e empresa." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "E-mail invalido." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "A senha precisa ter no minimo 8 caracteres." }, { status: 400 });
  if (!allowedRoles.has(role)) return NextResponse.json({ error: "Perfil invalido." }, { status: 400 });

  const { data: authUser, error: authError } = await admin.auth.getUser(token);
  if (authError || !authUser.user) return NextResponse.json({ error: "Sessao administrativa invalida." }, { status: 401 });

  const { data: actor, error: actorError } = await admin
    .from("user_profiles")
    .select("id,company_id,role,active")
    .eq("id", authUser.user.id)
    .single();
  if (actorError || !actor?.active) return NextResponse.json({ error: "Administrador sem perfil ativo." }, { status: 403 });

  const actorRole = String(actor.role);
  const isGlobal = actorRole === "admin_master_global";
  const canManageCompany = isGlobal || (["company_admin", "admin_master"].includes(actorRole) && actor.company_id === companyId);
  if (!canManageCompany) return NextResponse.json({ error: "Sem permissao para criar usuario nesta empresa." }, { status: 403 });
  if (role === "admin_master_global" && !isGlobal) return NextResponse.json({ error: "Apenas Admin Master Global cria outro global." }, { status: 403 });

  const { data: user, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, company_id: companyId, company_code: companyCode, role }
  });
  if (userError || !user.user) return NextResponse.json({ error: userError?.message || "Usuario nao criado." }, { status: 400 });

  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .insert({
      id: user.user.id,
      company_id: companyId,
      company_code: companyCode,
      full_name: fullName,
      email,
      role,
      department: body.department || null,
      client_id: body.client_id || null,
      status: body.active === false ? "Bloqueado" : "Ativo",
      active: body.active ?? true
    })
    .select()
    .single();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  await admin.from("audit_logs").insert({
    company_id: companyId,
    user_id: actor.id,
    user_role: actorRole,
    action: "user_create",
    entity: "user_profiles",
    entity_id: profile.id,
    record_table: "user_profiles",
    record_id: profile.id,
    new_value: { email, role, company_id: companyId }
  });

  return NextResponse.json({ ok: true, profile });
}
