import { supabase } from "../supabase/client";
import { backendMissingMessage, isDemoMode } from "@/lib/env";
import { auditAction } from "./base";

export const demoSessionKey = "nex-rural-demo-session-v2";
export const accessSessionKey = "nex-rural-access-session-v1";
export const staffAccessTokenKey = "nex-rural-staff-access-token-v1";
export const portalAccessTokenKey = "nex-rural-portal-access-token-v1";

export type AuthRole =
  | "admin_master_global"
  | "company_admin"
  | "admin_master"
  | "gestor"
  | "tecnico"
  | "topografo"
  | "agrimensor"
  | "administrativo"
  | "financeiro"
  | "atendente"
  | "analista_documental"
  | "cartorio"
  | "geo"
  | "cliente";

export type AuthProfile = {
  id: string;
  email: string;
  full_name: string;
  role: AuthRole;
  company_id: string;
  company_code?: string | null;
  company_status?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  active: boolean;
  access_type?: "admin" | "staff" | "client" | "demo";
  staff_id?: string | null;
};

export const demoProfiles: Array<AuthProfile & { password: string }> = [
  {
    id: "00000000-0000-4000-8000-000000000100",
    email: "joaomarcosgpp@hotmail.com",
    password: "nexrural",
    full_name: "Joao Marcos Gomes Pereira",
    role: "admin_master_global",
    company_id: "00000000-0000-4000-8000-000000000000",
    company_code: null,
    company_status: "Ativa",
    active: true
  },
  {
    id: "00000000-0000-4000-8000-000000000101",
    email: "admin327@nexrural.local",
    password: "nexrural",
    full_name: "Admin Empresa 3272026",
    role: "company_admin",
    company_id: "00000000-0000-4000-8000-000000000001",
    company_code: "3272026",
    company_status: "Ativa",
    active: true
  },
  {
    id: "00000000-0000-4000-8000-000000000111",
    email: "admin328@nexrural.local",
    password: "nexrural",
    full_name: "Admin Empresa 3282026",
    role: "company_admin",
    company_id: "00000000-0000-4000-8000-000000000002",
    company_code: "3282026",
    company_status: "Ativa",
    active: true
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    email: "gestor@nexrural.local",
    password: "nexrural",
    full_name: "Gestora Operacional",
    role: "gestor",
    company_id: "00000000-0000-4000-8000-000000000001",
    company_code: "3272026",
    company_status: "Ativa",
    active: true
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    email: "tecnico@nexrural.local",
    password: "nexrural",
    full_name: "Tecnico Responsavel",
    role: "tecnico",
    company_id: "00000000-0000-4000-8000-000000000001",
    company_code: "3272026",
    company_status: "Ativa",
    active: true
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    email: "cliente@nexrural.local",
    password: "nexrural",
    full_name: "Joao Ferreira da Silva",
    role: "cliente",
    company_id: "00000000-0000-4000-8000-000000000001",
    company_code: "3272026",
    company_status: "Ativa",
    client_id: "CL-2201",
    client_name: "Joao Ferreira da Silva",
    active: true
  }
];

export async function signInWithPassword(email: string, password: string, companyCode?: string) {
  if (isDemoMode) {
    const profile = demoProfiles.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password);
    if (!profile) throw new Error("E-mail ou senha invalidos para o modo demo.");
    if (profile.role === "cliente") throw new Error("Cliente acessa pelo Portal do Cliente.");
    if (profile.role !== "admin_master_global" && profile.company_code !== companyCode) {
      throw new Error("Matricula da empresa invalida para este usuario.");
    }
    if (!profile.active) throw new Error("Usuario bloqueado. Entre em contato com o administrador da empresa.");
    if (/bloqueada|suspensa/i.test(profile.company_status ?? "")) {
      throw new Error("Empresa temporariamente bloqueada. Entre em contato com o suporte Nex Rural.");
    }
    const safeProfile: AuthProfile = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      company_id: profile.company_id,
      company_code: profile.company_code ?? null,
      company_status: profile.company_status ?? null,
      client_id: profile.client_id ?? null,
      client_name: profile.client_name ?? null,
      active: profile.active
    };
    if (typeof window !== "undefined") window.localStorage.setItem(demoSessionKey, JSON.stringify(safeProfile));
    await auditAction({ companyId: safeProfile.company_id, userId: safeProfile.id, userRole: safeProfile.role, action: "login", entity: "auth" });
    return safeProfile;
  }

  if (!supabase) throw new Error(backendMissingMessage);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Sessao invalida.");
  const profile = await getCurrentProfile();
  if (!profile?.active) throw new Error("Usuario sem perfil ativo.");
  if (!profile.company_id) throw new Error("Usuario sem empresa vinculada.");
  if (profile.role === "cliente") throw new Error("Cliente acessa pelo Portal do Cliente.");
  if (profile.role !== "admin_master_global" && profile.company_code !== companyCode) {
    throw new Error("Matricula da empresa invalida para este usuario.");
  }
  if (/bloqueada|suspensa/i.test(profile.company_status ?? "")) {
    throw new Error("Empresa temporariamente bloqueada. Entre em contato com o suporte Nex Rural.");
  }
  await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "login", entity: "auth" });
  return profile;
}

export async function signOut() {
  if (isDemoMode) {
    if (typeof window !== "undefined") window.localStorage.removeItem(demoSessionKey);
    window.localStorage.removeItem(accessSessionKey);
    window.localStorage.removeItem(staffAccessTokenKey);
    window.localStorage.removeItem(portalAccessTokenKey);
    return;
  }
  if (!supabase) throw new Error(backendMissingMessage);
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function clearLocalSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(demoSessionKey);
    window.localStorage.removeItem(accessSessionKey);
    window.localStorage.removeItem(staffAccessTokenKey);
    window.localStorage.removeItem(portalAccessTokenKey);
  }
}

export async function sendPasswordReset(email: string) {
  if (isDemoMode) throw new Error("Recuperacao de senha esta disponivel apenas com Supabase Auth configurado.");
  if (!supabase) throw new Error(backendMissingMessage);
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function getCurrentProfile() {
  if (isDemoMode && typeof window !== "undefined") {
    const value = window.localStorage.getItem(demoSessionKey);
    return value ? (JSON.parse(value) as AuthProfile) : null;
  }

  if (typeof window !== "undefined") {
    const accessValue = window.localStorage.getItem(accessSessionKey);
    if (accessValue) {
      try {
        const parsed = JSON.parse(accessValue) as { token?: string; profile?: AuthProfile };
        if (parsed.token) {
          const response = await fetch("/api/access/me", { headers: { Authorization: `Bearer ${parsed.token}` } });
          const data = await response.json();
          if (response.ok && data.profile) return data.profile as AuthProfile;
        }
      } catch {
        window.localStorage.removeItem(accessSessionKey);
      }
    }
  }

  if (!supabase) return null;
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*, companies:company_id(id,company_code,status), clients:client_id(id,name)")
    .eq("id", userData.user.id)
    .single();
  if (error) throw new Error("Usuario sem perfil vinculado.");
  const profile = {
    ...(data as AuthProfile),
    email: userData.user.email ?? "",
    company_code: (data as { companies?: { company_code?: string } }).companies?.company_code ?? null,
    company_status: (data as { companies?: { status?: string } }).companies?.status ?? null,
    client_name: (data as { clients?: { name?: string } }).clients?.name ?? null
  };
  if (!profile.active) throw new Error("Usuario bloqueado. Entre em contato com o administrador.");
  if (/bloqueada|suspensa/i.test(profile.company_status ?? "")) {
    throw new Error("Empresa temporariamente bloqueada. Entre em contato com o suporte Nex Rural.");
  }
  return profile;
}


export async function signInStaffWithCpf(fullName: string, cpf: string, companyChoice?: string) {
  const response = await fetch("/api/access/staff/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name: fullName, cpf, company_choice: companyChoice || undefined })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Falha no acesso do funcionário.");
  if (data.requires_company_choice) return data as { requires_company_choice: true; companies: Array<{ choice_id: string; display_name: string; city?: string; state?: string; company_hint?: string }> };
  const token = String(data.access_token || "");
  const profile = data.profile as AuthProfile;
  if (!token || !profile) throw new Error("Sessão de funcionário inválida.");
  if (typeof window !== "undefined") {
    window.localStorage.setItem(accessSessionKey, JSON.stringify({ token, profile }));
    window.localStorage.setItem(staffAccessTokenKey, token);
  }
  return { requires_company_choice: false, token, profile } as const;
}

export async function signInClientWithCpf(fullName: string, cpf: string, companyChoice?: string) {
  const response = await fetch("/api/access/client/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name: fullName, cpf, company_choice: companyChoice || undefined })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Falha no acesso do cliente.");
  if (data.requires_company_choice) return data as { requires_company_choice: true; companies: Array<{ choice_id: string; display_name: string; city?: string; state?: string; company_hint?: string }> };
  const token = String(data.access_token || "");
  const portalToken = String(data.portal_token || "");
  const profile = data.profile as AuthProfile;
  if (!token || !portalToken || !profile) throw new Error("Sessão do cliente inválida.");
  if (typeof window !== "undefined") {
    window.localStorage.setItem(accessSessionKey, JSON.stringify({ token, profile, portalToken }));
    window.localStorage.setItem(portalAccessTokenKey, portalToken);
  }
  return { requires_company_choice: false, token, portalToken, profile } as const;
}

export function getStoredStaffToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(staffAccessTokenKey) || "";
}

export function getStoredPortalToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(portalAccessTokenKey) || "";
}
