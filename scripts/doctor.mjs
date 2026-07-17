import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["package.json", "package.json"],
  ["App principal", "components/nex-rural-app.tsx"],
  ["Logo oficial", "public/nex-rural-logo.png"],
  ["Logo oficial SVG", "public/nex-rural-logo.svg"],
  ["Migration base", "supabase/migrations/0001_nex_rural_schema.sql"],
  ["Migration avancada", "supabase/migrations/0002_advanced_nex_rural_modules.sql"],
  ["Migration hardening piloto", "supabase/migrations/0006_pilot_hardening.sql"],
  ["Migration ajustes piloto comercial", "supabase/migrations/0007_emergency_pilot_fixes.sql"],
  ["Manifesto PWA", "public/manifest.webmanifest"],
  ["Service Worker", "public/sw.js"],
  ["Icone PWA 192", "public/icons/icon-192.png"],
  ["Icone PWA 512", "public/icons/icon-512.png"],
  ["Guia Supabase", "GUIA_SUPABASE_SETUP.md"],
  ["Guia Vercel", "GUIA_VERCEL_DEPLOY.md"],
  ["Guia Bootstrap", "GUIA_BOOTSTRAP_ADMIN.md"],
  ["Guia Teste Piloto", "GUIA_TESTE_PILOTO.md"],
  ["Checklist primeiro cliente", "CHECKLIST_PRIMEIRO_CLIENTE_REAL.md"],
  ["Relatorio hardening", "RELATORIO_HARDENING_NEX_RURAL.md"],
  ["Relatorio piloto comercial", "RELATORIO_PILOTO_COMERCIAL_2026-07-05.md"],
  ["Script bootstrap", "scripts/bootstrap-admin.mjs"],
  ["Script verificacao Supabase", "scripts/verify-supabase.mjs"],
  ["Script smoke piloto", "scripts/pilot-smoke.mjs"]
];

console.log("Nex Rural Doctor");
console.log(`Node: ${process.version}`);
console.log(`Pasta: ${root}`);

let failed = false;
for (const [label, relative] of checks) {
  const exists = fs.existsSync(path.join(root, relative));
  console.log(`${exists ? "OK" : "FALHA"} - ${label}: ${relative}`);
  if (!exists) failed = true;
}

const nodeModules = fs.existsSync(path.join(root, "node_modules"));
console.log(`${nodeModules ? "OK" : "AVISO"} - node_modules ${nodeModules ? "instalado" : "nao encontrado; execute npm install"}`);

const request = http.get("http://127.0.0.1:3000/api/health", (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    console.log(`Servidor local: HTTP ${res.statusCode}`);
    if (body) console.log(body);
    process.exit(failed ? 1 : 0);
  });
});

request.on("error", () => {
  console.log("AVISO - Servidor local nao esta rodando em http://127.0.0.1:3000");
  console.log("Para iniciar: npm run dev");
  process.exit(failed ? 1 : 0);
});

request.setTimeout(3000, () => {
  request.destroy();
});
