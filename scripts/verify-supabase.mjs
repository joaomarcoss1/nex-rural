import { createClient } from "@supabase/supabase-js";

const requiredTables = [
  "companies",
  "user_profiles",
  "clients",
  "client_portal_access",
  "rural_properties",
  "services",
  "service_checklists",
  "documents",
  "document_versions",
  "protocols",
  "pending_items",
  "financial_entries",
  "geo_files",
  "property_vertices",
  "property_neighbors",
  "official_checks",
  "registry_records",
  "property_certificates",
  "due_diligence_cases",
  "due_diligence_risks",
  "audit_logs",
  "portal_access_attempts",
  "reports",
  "report_exports"
];

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}`);
  return value;
}

const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function checkTable(table) {
  const { error } = await supabase.from(table).select("*").limit(1);
  return { table, ok: !error, error: error?.message || null };
}

async function main() {
  const tables = await Promise.all(requiredTables.map(checkTable));
  const bucketResult = await supabase.storage.getBucket("nex-rural-documents");
  const failedTables = tables.filter((item) => !item.ok);
  const ok = failedTables.length === 0 && !bucketResult.error;

  console.log(
    JSON.stringify(
      {
        ok,
        checked_at: new Date().toISOString(),
        tables_total: tables.length,
        tables_ok: tables.filter((item) => item.ok).length,
        failed_tables: failedTables,
        bucket: {
          name: "nex-rural-documents",
          ok: !bucketResult.error,
          error: bucketResult.error?.message || null
        }
      },
      null,
      2
    )
  );

  if (!ok) process.exit(1);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
