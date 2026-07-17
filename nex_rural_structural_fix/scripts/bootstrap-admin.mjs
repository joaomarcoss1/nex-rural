import { createClient } from "@supabase/supabase-js";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}`);
  return value;
}

const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
const email = required("BOOTSTRAP_ADMIN_EMAIL");
const password = required("BOOTSTRAP_ADMIN_PASSWORD");
const fullName = process.env.BOOTSTRAP_ADMIN_NAME || "Admin Master Global";
const globalAdmin = process.env.BOOTSTRAP_GLOBAL !== "false";
const companyName = process.env.BOOTSTRAP_COMPANY_NAME || (globalAdmin ? "Nex Rural Plataforma" : "Empresa Piloto");
const companyCode = process.env.BOOTSTRAP_COMPANY_CODE || "3272026";
const role = globalAdmin ? "admin_master_global" : "company_admin";

if (password.length < 8) throw new Error("BOOTSTRAP_ADMIN_PASSWORD deve ter pelo menos 8 caracteres.");
if (companyCode && !/^\d+$/.test(companyCode)) throw new Error("BOOTSTRAP_COMPANY_CODE deve conter apenas numeros.");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function findAuthUserByEmail(targetEmail) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === targetEmail.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function ensureCompany() {
  const query = companyCode
    ? supabase.from("companies").select("*").eq("company_code", companyCode).maybeSingle()
    : supabase.from("companies").select("*").eq("name", companyName).maybeSingle();
  const existing = await query;
  if (existing.error) throw existing.error;
  if (existing.data) return { company: existing.data, created: false };

  const { data, error } = await supabase
    .from("companies")
    .insert({
      name: companyName,
      trade_name: companyName,
      company_code: companyCode || null,
      status: "Ativa",
      plan: globalAdmin ? "Global" : "Pilot Premium",
      responsible_name: fullName
    })
    .select()
    .single();
  if (error) throw error;
  return { company: data, created: true };
}

async function ensureUser(company) {
  let user = await findAuthUserByEmail(email);
  let created = false;
  if (!user) {
    const result = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, company_id: company.id, company_code: company.company_code, role }
    });
    if (result.error) throw result.error;
    user = result.data.user;
    created = true;
  } else {
    const update = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      user_metadata: { ...(user.user_metadata ?? {}), full_name: fullName, company_id: company.id, company_code: company.company_code, role }
    });
    if (update.error) throw update.error;
  }
  return { user, created };
}

async function main() {
  const { company, created: companyCreated } = await ensureCompany();
  const { user, created: userCreated } = await ensureUser(company);

  const { error: profileError } = await supabase.from("user_profiles").upsert({
    id: user.id,
    company_id: company.id,
    company_code: company.company_code,
    full_name: fullName,
    email,
    role,
    department: globalAdmin ? "Administracao global" : "Administracao da empresa",
    status: "Ativo",
    active: true
  });
  if (profileError) throw profileError;

  await supabase
    .from("audit_logs")
    .insert({
      company_id: company.id,
      user_id: user.id,
      user_role: role,
      action: "bootstrap_admin_script",
      entity: "user_profiles",
      entity_id: user.id,
      record_table: "user_profiles",
      record_id: user.id,
      new_value: { email, role, company_code: company.company_code }
    })
    .then(() => undefined);

  console.log(
    JSON.stringify(
      {
        ok: true,
        company_id: company.id,
        company_code: company.company_code,
        company_created: companyCreated,
        user_id: user.id,
        user_created: userCreated,
        role
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
