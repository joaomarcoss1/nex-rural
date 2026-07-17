import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const internalRoles = new Set(["admin_master_global", "company_admin", "admin_master", "gestor", "tecnico", "topografo", "agrimensor", "administrativo", "financeiro", "atendente", "analista_documental", "cartorio", "geo"]);

export async function requireInternalActor(request: NextRequest | Request) {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Sessao administrativa obrigatoria.");

  const { data: authUser, error: authError } = await admin.auth.getUser(token);
  if (authError || !authUser.user) throw new Error("Sessao invalida ou expirada.");

  const { data: actor, error } = await admin
    .from("user_profiles")
    .select("id,company_id,role,active,full_name,email")
    .eq("id", authUser.user.id)
    .single();
  if (error || !actor?.active) throw new Error("Usuario sem perfil ativo.");
  if (!internalRoles.has(String(actor.role))) throw new Error("Perfil sem permissao para esta operacao.");

  return { admin, actor, authUser: authUser.user };
}

export function cleanStoragePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 140);
}

export function ensureSameCompany(actorCompanyId: string, targetCompanyId?: string | null) {
  if (!targetCompanyId || actorCompanyId !== targetCompanyId) throw new Error("Registro nao pertence a empresa do usuario.");
}
