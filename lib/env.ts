export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const DOCUMENT_BUCKET = "nex-rural-documents";
export const DOCUMENT_TEMPLATE_BUCKET = "document-templates";
export const GENERATED_DOCUMENT_BUCKET = "generated-documents";
export const CLIENT_PHOTOS_BUCKET = "client-photos";

export const backendMissingMessage =
  "Supabase nao configurado. Configure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY para usar o sistema fora do modo demo.";

export function assertRuntimeBackend() {
  if (!isDemoMode && !hasSupabaseConfig) {
    throw new Error(backendMissingMessage);
  }
}
