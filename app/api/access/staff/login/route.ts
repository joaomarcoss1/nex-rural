import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { choiceToken, createAccessSession, isCompleteName, isValidCpf, normalizeCpf, normalizeName, sanitizeStaffProfile, verifyChoiceToken } from "@/lib/security/access";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const genericError = "Não foi possível acessar com os dados informados. Verifique o nome completo e CPF.";

function companyDisplay(company?: Record<string, any> | null) {
  const code = String(company?.company_code || "");
  return { display_name: company?.trade_name || company?.name || "Empresa Nex Rural", city: company?.city || company?.municipality || "", state: company?.state || company?.uf || "", company_hint: code ? `***${code.slice(-3)}` : "" };
}

async function audit(admin: any, input: Record<string, unknown>) {
  await admin.from("audit_logs").insert({ company_id: input.company_id || null, actor_type: "staff", actor_id: input.actor_id || null, action: input.action, entity_type: "auth", metadata: input.metadata || {}, ip_address: input.ip_address || null, user_agent: input.user_agent || null }).then(() => undefined, () => undefined);
}

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY nao configurada." }, { status: 500 });
  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");
  const body = await request.json().catch(() => null);
  const fullName = String(body?.full_name || "");
  const cpf = normalizeCpf(String(body?.cpf || ""));
  const normalizedName = normalizeName(fullName);
  const companyChoice = String(body?.company_choice || "");
  const rate = checkRateLimit(`staff-login:${ip}:${cpf || "empty"}`, { max: Number(process.env.STAFF_RATE_LIMIT_MAX || 6), windowMs: Number(process.env.STAFF_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000), blockMs: Number(process.env.STAFF_RATE_LIMIT_BLOCK_MS || 20 * 60 * 1000) });
  if (!rate.allowed) return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 });
  if (!isCompleteName(fullName) || !isValidCpf(cpf)) {
    await audit(admin, { action: "staff_login_failed", metadata: { reason: "invalid_input" }, ip_address: ip, user_agent: userAgent });
    return NextResponse.json({ error: genericError }, { status: 400 });
  }
  let chosen: { actor_id: string; company_id: string } | null = null;
  if (companyChoice) {
    const choice = verifyChoiceToken(companyChoice, "staff");
    chosen = { actor_id: choice.actor_id, company_id: choice.company_id };
  }
  const { data: staff, error } = await admin
    .from("staff_profiles")
    .select("id,company_id,full_name,normalized_name,cpf,normalized_cpf,role,department,phone,email,active,status,deleted_at,companies:company_id(id,name,trade_name,company_code,status,city,state)")
    .eq("normalized_cpf", cpf)
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const matches = (staff || []).filter((row: any) => {
    const name = normalizeName(row.normalized_name || row.full_name || "");
    const doc = normalizeCpf(row.normalized_cpf || row.cpf || "");
    const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
    return doc === cpf && name === normalizedName && row.deleted_at == null && row.active !== false && !/inativo|bloqueado/i.test(String(row.status || "")) && !/bloqueada|suspensa|cancelada/i.test(String(company?.status || ""));
  });
  if (!matches.length) {
    await audit(admin, { action: "staff_login_failed", metadata: { reason: "not_found" }, ip_address: ip, user_agent: userAgent });
    return NextResponse.json({ error: genericError }, { status: 404 });
  }
  if (!chosen && matches.length > 1) {
    return NextResponse.json({ ok: true, requires_company_choice: true, companies: matches.map((row: any) => { const company = Array.isArray(row.companies) ? row.companies[0] : row.companies; return { choice_id: choiceToken({ actor_type: "staff", actor_id: row.id, company_id: row.company_id, role: row.role }), ...companyDisplay(company) }; }) });
  }
  const selected = chosen ? matches.find((row: any) => row.id === chosen?.actor_id && row.company_id === chosen?.company_id) : matches[0];
  if (!selected) return NextResponse.json({ error: genericError }, { status: 404 });
  const company = Array.isArray(selected.companies) ? selected.companies[0] : selected.companies;
  const accessToken = await createAccessSession({ companyId: selected.company_id, actorType: "staff", actorId: selected.id, role: selected.role, fullName: selected.full_name, companyCode: company?.company_code, ip, userAgent });
  await audit(admin, { company_id: selected.company_id, actor_id: selected.id, action: "staff_login", ip_address: ip, user_agent: userAgent });
  return NextResponse.json({ ok: true, requires_company_choice: false, access_token: accessToken, expires_in: 8 * 60 * 60, profile: sanitizeStaffProfile(selected, company) });
}
