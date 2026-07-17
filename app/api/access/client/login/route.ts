import { NextRequest, NextResponse } from "next/server";
import { createPortalToken } from "@/lib/security/portal-token";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { choiceToken, createAccessSession, isCompleteName, isValidCpf, normalizeCpf, normalizeName, verifyChoiceToken } from "@/lib/security/access";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const genericError = "Não foi possível acessar com os dados informados. Verifique o nome completo e CPF.";

function companyDisplay(company?: Record<string, any> | null) {
  const code = String(company?.company_code || "");
  return {
    display_name: company?.trade_name || company?.name || "Empresa Nex Rural",
    city: company?.city || company?.municipality || "",
    state: company?.state || company?.uf || "",
    company_hint: code ? `***${code.slice(-3)}` : ""
  };
}

async function audit(admin: any, input: Record<string, unknown>) {
  await admin.from("audit_logs").insert({
    company_id: input.company_id || null,
    actor_type: "client",
    actor_id: input.actor_id || null,
    action: input.action,
    entity_type: "auth",
    metadata: input.metadata || {},
    ip_address: input.ip_address || null,
    user_agent: input.user_agent || null
  }).then(() => undefined, () => undefined);
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

  const rate = checkRateLimit(`client-login:${ip}:${cpf || "empty"}`, {
    max: Number(process.env.PORTAL_RATE_LIMIT_MAX || 6),
    windowMs: Number(process.env.PORTAL_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
    blockMs: Number(process.env.PORTAL_RATE_LIMIT_BLOCK_MS || 20 * 60 * 1000)
  });
  if (!rate.allowed) return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 });
  if (!isCompleteName(fullName) || !isValidCpf(cpf)) {
    await audit(admin, { action: "client_login_failed", metadata: { reason: "invalid_input" }, ip_address: ip, user_agent: userAgent });
    return NextResponse.json({ error: genericError }, { status: 400 });
  }

  let chosen: { actor_id: string; company_id: string } | null = null;
  if (companyChoice) {
    const choice = verifyChoiceToken(companyChoice, "client");
    chosen = { actor_id: choice.actor_id, company_id: choice.company_id };
  }

  const { data: clients, error } = await admin
    .from("clients")
    .select("id,company_id,full_name,name,email,cpf_cnpj,normalized_name,normalized_cpf,portal_enabled,portal_status,active,status,deleted_at,companies:company_id(id,name,trade_name,company_code,status,city,state)")
    .or(`normalized_cpf.eq.${cpf},cpf_cnpj.eq.${cpf}`)
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const matches = (clients || []).filter((client: any) => {
    const name = normalizeName(client.normalized_name || client.full_name || client.name || "");
    const doc = normalizeCpf(client.normalized_cpf || client.cpf_cnpj || "");
    const company = Array.isArray(client.companies) ? client.companies[0] : client.companies;
    return doc === cpf && name === normalizedName && client.deleted_at == null && client.portal_enabled !== false && client.active !== false && !/inativo|bloqueado/i.test(String(client.status || client.portal_status || "")) && !/bloqueada|suspensa|cancelada/i.test(String(company?.status || ""));
  });

  if (!matches.length) {
    await audit(admin, { action: "client_login_failed", metadata: { reason: "not_found" }, ip_address: ip, user_agent: userAgent });
    return NextResponse.json({ error: genericError }, { status: 404 });
  }

  if (!chosen && matches.length > 1) {
    return NextResponse.json({
      ok: true,
      requires_company_choice: true,
      companies: matches.map((client: any) => {
        const company = Array.isArray(client.companies) ? client.companies[0] : client.companies;
        return {
          choice_id: choiceToken({ actor_type: "client", actor_id: client.id, company_id: client.company_id, role: "cliente" }),
          ...companyDisplay(company)
        };
      })
    });
  }

  const selected = chosen ? matches.find((client: any) => client.id === chosen?.actor_id && client.company_id === chosen?.company_id) : matches[0];
  if (!selected) return NextResponse.json({ error: genericError }, { status: 404 });
  const company = Array.isArray(selected.companies) ? selected.companies[0] : selected.companies;
  const accessToken = await createAccessSession({ companyId: selected.company_id, actorType: "client", actorId: selected.id, role: "cliente", fullName: selected.full_name || selected.name, companyCode: company?.company_code, ip, userAgent });
  const portalToken = createPortalToken({ company_id: selected.company_id, company_code: company?.company_code || "", client_id: selected.id, client_name: selected.full_name || selected.name || "Cliente" });
  await admin.from("clients").update({ last_portal_access_at: new Date().toISOString(), normalized_name: normalizedName, normalized_cpf: cpf }).eq("id", selected.id).then(() => undefined, () => undefined);
  await audit(admin, { company_id: selected.company_id, actor_id: selected.id, action: "client_login", ip_address: ip, user_agent: userAgent });

  return NextResponse.json({
    ok: true,
    requires_company_choice: false,
    redirect: "/portal",
    access_token: accessToken,
    portal_token: portalToken,
    expires_in: 8 * 60 * 60,
    profile: {
      id: `portal-${selected.id}`,
      email: selected.email || `${selected.id}@portal.nexrural.local`,
      full_name: selected.full_name || selected.name,
      role: "cliente",
      company_id: selected.company_id,
      company_code: company?.company_code || null,
      company_status: company?.status || null,
      client_id: selected.id,
      client_name: selected.full_name || selected.name,
      active: true,
      access_type: "client"
    }
  });
}
