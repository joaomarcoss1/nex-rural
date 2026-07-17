# Relatorio de Hardening - Nex Rural

Data: 2026-07-04  
Entrega: release piloto real `nex-rural gitev`

## Diagnostico inicial

A auditoria indicou que o sistema estava forte para demo e piloto interno, mas ainda dependia de validacao real de Supabase, RLS, Storage, portal e bootstrap. O maior risco era o portal do cliente em producao: apos o lookup, ele ainda dependeria do cliente Supabase no navegador, sem sessao real de cliente.

## Correcoes realizadas

- Portal do cliente reforcado com rate limiting por IP/codigo de empresa.
- Criada tabela de logs `portal_access_attempts` na migration `0006_pilot_hardening.sql`.
- Lookup do portal passou a retornar mensagens genericas e registrar tentativas.
- Criado token curto assinado para sessao do portal.
- Criada API `GET /api/portal/data` para retornar apenas dados liberados ao cliente.
- Criada API `POST /api/portal/documents/upload` para upload server-side pelo portal.
- Criada API `POST /api/portal/documents/download` para signed URL server-side.
- Bootstrap API tornou-se idempotente e respeita `BOOTSTRAP_DISABLED`.
- Criado script `npm run bootstrap:admin`.
- Criado script `npm run verify:supabase`.
- Criado script `npm run test:pilot`.
- Criada migration `0007_emergency_pilot_fixes.sql` para ajustes finais de piloto comercial.
- Logout refeito para limpar sessao local mesmo se auditoria ou Supabase falharem.
- Refresh refeito para carregar tabelas de forma tolerante, sem derrubar o painel inteiro por erro isolado.
- Login dividido em Admin Master, Empresa e Cliente, com Cliente direcionado ao portal.
- Provisionamento de usuarios passou a enviar JWT Supabase no header `Authorization`.
- Logo SVG adicionado e cacheado pelo service worker.
- PDF/Excel receberam layout operacional mais profissional.
- Upload geral ganhou limite de 50 MB e lista de extensoes permitidas.
- Formularios ganharam validacoes basicas para e-mail, CPF/CNPJ, telefone, UF, numeros e coordenadas.
- Importacao CSV de geoprocessamento passou a validar codigo unico, datum, latitude e longitude.
- Adicionada migration incremental de indices, logs de portal e constraints de coordenadas.
- README e guias obrigatorios foram atualizados/criados.

## Arquivos principais modificados

- `components/nex-rural-app.tsx`
- `lib/services/base.ts`
- `lib/services/geo.ts`
- `lib/security/rate-limit.ts`
- `lib/security/portal-token.ts`
- `app/api/portal/lookup/route.ts`
- `app/api/portal/data/route.ts`
- `app/api/portal/documents/upload/route.ts`
- `app/api/portal/documents/download/route.ts`
- `app/api/bootstrap/admin/route.ts`
- `app/api/admin/users/route.ts`
- `supabase/migrations/0006_pilot_hardening.sql`
- `supabase/migrations/0007_emergency_pilot_fixes.sql`
- `public/nex-rural-logo.svg`
- `app/globals.css`
- `scripts/bootstrap-admin.mjs`
- `scripts/verify-supabase.mjs`
- `scripts/pilot-smoke.mjs`
- `.env.example`
- `README.md`

## Evidencias locais

- `npm install --ignore-scripts --no-audit --no-fund --prefer-offline`: aprovado.
- `npm run lint`: aprovado.
- `npm run doctor`: aprovado; avisou apenas quando o servidor local nao estava rodando.
- `npm run build`: aprovado.
- `npm audit --audit-level=moderate --cache .npm-cache`: aprovado com 0 vulnerabilidades.
- `npm run test:pilot`: aprovado com servidor local, validando `/api/health`, `/manifest.webmanifest` e `/sw.js`.

O build reconheceu as rotas:

- `/api/portal/data`
- `/api/portal/documents/download`
- `/api/portal/documents/upload`
- `/api/portal/lookup`
- `/api/admin/users`
- `/api/bootstrap/admin`
- `/api/health`

## Revalidacao 2026-07-05

- `npm install --ignore-scripts --no-audit --no-fund --prefer-offline`: aprovado.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.
- `npm run doctor`: aprovado com servidor local e `/api/health` HTTP 200.
- `npm audit --audit-level=moderate --cache .npm-cache`: aprovado com 0 vulnerabilidades.
- `npm run test:pilot`: aprovado, validando `/`, `/portal`, `/master`, `/api/health`, `/manifest.webmanifest`, `/sw.js` e `/nex-rural-logo.svg`.

## Riscos restantes

- Nao foi possivel aplicar migrations em Supabase real porque as credenciais do projeto nao foram fornecidas.
- Nao foi possivel executar `npm run verify:supabase` contra banco real sem `SUPABASE_SERVICE_ROLE_KEY`.
- RLS precisa ser testada em ambiente Supabase com duas empresas reais.
- Geoprocessamento ainda e basico: CSV funcional, mas parser real de KML/KMZ/SHP/DXF/DWG ainda nao foi implementado.
- Relatorios PDF ainda sao operacionais, nao premium final.
- Offline de producao continua parcial, sem fila de sincronizacao.

## Readiness

- Apresentacao comercial: pronto.
- Demo guiada: pronto.
- Piloto interno: pronto.
- Piloto com primeira empresa: pronto para homologacao, condicionado a Supabase real configurado e checklist aprovado.
- Producao aberta: ainda requer validacao RLS/E2E real e refinamento de relatorios/geoprocessamento.

## Como validar antes do primeiro cliente

1. Aplicar migrations 0001 a 0007 no Supabase.
2. Configurar `.env.local`.
3. Rodar `npm run verify:supabase`.
4. Rodar `npm run bootstrap:admin`.
5. Rodar `npm run build`.
6. Fazer deploy Vercel.
7. Executar `GUIA_TESTE_PILOTO.md`.
8. Preencher `CHECKLIST_PRIMEIRO_CLIENTE_REAL.md`.
