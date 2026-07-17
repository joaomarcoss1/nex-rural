import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseUrl = process.env.NEX_RURAL_BASE_URL || "http://127.0.0.1:3000";
const requiredFiles = [
  "README.md",
  "GUIA_SUPABASE_SETUP.md",
  "GUIA_VERCEL_DEPLOY.md",
  "GUIA_BOOTSTRAP_ADMIN.md",
  "GUIA_TESTE_PILOTO.md",
  "RELATORIO_HARDENING_NEX_RURAL.md",
  "RELATORIO_PILOTO_COMERCIAL_2026-07-05.md",
  "CHECKLIST_PRIMEIRO_CLIENTE_REAL.md",
  ".env.example",
  "supabase/migrations/0006_pilot_hardening.sql",
  "supabase/migrations/0007_emergency_pilot_fixes.sql",
  "public/nex-rural-logo.svg",
  "scripts/bootstrap-admin.mjs",
  "scripts/verify-supabase.mjs"
];

async function fetchStatus(route) {
  try {
    const response = await fetch(`${baseUrl}${route}`);
    return { route, ok: response.ok, status: response.status };
  } catch (error) {
    return { route, ok: false, status: 0, error: error.message };
  }
}

async function main() {
  const files = requiredFiles.map((file) => ({ file, ok: fs.existsSync(path.join(root, file)) }));
  const routes = await Promise.all(["/", "/portal", "/master", "/api/health", "/manifest.webmanifest", "/sw.js", "/nex-rural-logo.svg"].map(fetchStatus));
  const ok = files.every((item) => item.ok) && routes.every((item) => item.ok);
  console.log(JSON.stringify({ ok, baseUrl, files, routes }, null, 2));
  if (!ok) process.exit(1);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
