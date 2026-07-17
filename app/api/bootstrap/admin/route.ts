import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

async function findAuthUserByEmail(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, email: string) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  return null;
}

export async function POST(request: Request) {
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY nao configurada." }, { status: 500 });

  if (process.env.BOOTSTRAP_DISABLED === "true") {
    return NextResponse.json({ error: "Bootstrap desabilitado neste ambiente." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || body.secret !== process.env.BOOTSTRAP_SECRET) {
    return NextResponse.json({ error: "Bootstrap secret invalido." }, { status: 401 });
  }

  const global = Boolean(body.global);
  const companyName = String(body.companyName || (global ? "Nex Rural Plataforma" : "Nex Rural Piloto"));
  const fullName = String(body.fullName || (global ? "Joao Marcos Gomes Pereira" : "Admin da Empresa"));
  const email = String(body.email || "");
  const password = String(body.password || "");
  const requestedCompanyCode = String(body.company_code || process.env.BOOTSTRAP_COMPANY_CODE || "").trim() || null;
  if (!email || !password) return NextResponse.json({ error: "Informe email e password." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "A senha precisa ter no minimo 8 caracteres." }, { status: 400 });
  if (requestedCompanyCode && !/^\d+$/.test(requestedCompanyCode)) {
    return NextResponse.json({ error: "A matricula da empresa deve conter apenas numeros." }, { status: 400 });
  }

  const companyQuery = requestedCompanyCode
    ? admin.from("companies").select("*").eq("company_code", requestedCompanyCode).maybeSingle()
    : admin.from("companies").select("*").eq("name", companyName).maybeSingle();
  const existingCompany = await companyQuery;
  if (existingCompany.error) return NextResponse.json({ error: existingCompany.error.message }, { status: 400 });

  const company =
    existingCompany.data ??
    (
      await admin
        .from("companies")
        .insert({
      name: companyName,
      trade_name: body.tradeName || companyName,
      company_code: requestedCompanyCode,
      status: "Ativa",
      plan: global ? "Global" : body.plan || "Pilot Premium",
      responsible_name: fullName
    })
    .select()
        .single()
    ).data;
  if (!company) return NextResponse.json({ error: "Empresa nao criada." }, { status: 400 });

  const role = global ? "admin_master_global" : "company_admin";

  let authUser = await findAuthUserByEmail(admin, email);
  if (!authUser) {
    const { data: user, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, company_id: company.id, company_code: company.company_code, role }
    });
    if (userError || !user.user) return NextResponse.json({ error: userError?.message || "Usuario nao criado." }, { status: 400 });
    authUser = user.user;
  } else {
    await admin.auth.admin.updateUserById(authUser.id, {
      email_confirm: true,
      user_metadata: { ...(authUser.user_metadata ?? {}), full_name: fullName, company_id: company.id, company_code: company.company_code, role }
    });
  }

  const { error: profileError } = await admin.from("user_profiles").upsert({
    id: authUser.id,
    company_id: company.id,
    company_code: company.company_code,
    full_name: fullName,
    email,
    role,
    department: global ? "Administracao global" : "Administracao da empresa",
    status: "Ativo",
    active: true
  });
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  await admin.from("audit_logs").insert({
    company_id: company.id,
    user_id: authUser.id,
    user_role: role,
    action: "bootstrap_admin",
    entity: "user_profiles",
    entity_id: authUser.id,
    record_table: "user_profiles",
    record_id: authUser.id,
    new_value: { email, role, global, company_code: company.company_code }
  });

  return NextResponse.json({ ok: true, company_id: company.id, company_code: company.company_code, user_id: authUser.id, role, reused_company: Boolean(existingCompany.data) });
}
