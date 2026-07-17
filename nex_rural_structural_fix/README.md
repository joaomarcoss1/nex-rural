# Nex Rural

SaaS backend-first para empresas que atuam com regularizacao rural, documentos, geoprocessamento, protocolos, AGED/MA, ITERMA, cartorio, due diligence, contratos, financeiro e portal do cliente.

Esta versao foi preparada como release de piloto real: mantem modo demo para apresentacao, mas possui caminho de producao com Supabase Auth, PostgreSQL, RLS, Storage, portal com token curto, rate limiting, scripts de bootstrap e guias de deploy.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL, Storage e RLS
- React Hook Form + Zod
- Leaflet
- Recharts
- jsPDF
- PWA com manifest, service worker, icones e logo SVG

## Rodar no VSCode

```bash
npm install
npm run dev
```

Abra `http://127.0.0.1:3000`.

## Modo demo

Para demonstracao local sem Supabase:

```bash
NEXT_PUBLIC_DEMO_MODE=true
npm run dev
```

Senha dos perfis demo: `nexrural`.

- Admin Master Global: `joaomarcosgpp@hotmail.com`, sem codigo.
- Admin Empresa 327: `admin327@nexrural.local`, codigo `3272026`.
- Admin Empresa 328: `admin328@nexrural.local`, codigo `3282026`.
- Gestor: `gestor@nexrural.local`, codigo `3272026`.
- Tecnico: `tecnico@nexrural.local`, codigo `3272026`.
- Portal cliente: empresa `3272026`, nome `Joao Ferreira da Silva`, codigo `2201`.

## Modo producao/piloto

Configure `.env.local` com base em `.env.example`:

```bash
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BOOTSTRAP_SECRET=
PORTAL_SESSION_SECRET=
```

Depois:

```bash
npm run build
npm run verify:supabase
npm run bootstrap:admin
npm run start
```

## Scripts

- `npm run dev`: inicia local em `127.0.0.1:3000`.
- `npm run build`: build de producao.
- `npm run lint`: lint TypeScript/React.
- `npm run doctor`: verifica arquivos principais e health local.
- `npm run bootstrap:admin`: cria ou reutiliza Admin Master Global/primeira empresa no Supabase.
- `npm run verify:supabase`: valida tabelas essenciais e bucket `nex-rural-documents`.
- `npm run test:pilot`: smoke test local de health, manifest e service worker.

## Supabase

Execute as migrations em ordem:

1. `supabase/migrations/0001_nex_rural_schema.sql`
2. `supabase/migrations/0002_advanced_nex_rural_modules.sql`
3. `supabase/migrations/0003_pilot_modules_aged_iterma_contracts.sql`
4. `supabase/migrations/0004_backend_first_pilot_readiness.sql`
5. `supabase/migrations/0005_multiempresa_global_geo_reports.sql`
6. `supabase/migrations/0006_pilot_hardening.sql`
7. `supabase/migrations/0007_emergency_pilot_fixes.sql`

Depois rode:

```bash
npm run verify:supabase
npm run bootstrap:admin
```

## Portal do cliente

O portal fica em `/portal`. Em producao, o acesso usa:

- codigo da empresa;
- nome completo;
- codigo seguro do cliente;
- rate limiting por IP/codigo;
- logs em `portal_access_attempts`;
- token curto assinado para carregar dados liberados;
- APIs server-side para dados, upload e download.

Rotas:

- `POST /api/portal/lookup`
- `GET /api/portal/data`
- `POST /api/portal/documents/upload`
- `POST /api/portal/documents/download`

## Deploy Vercel

1. Suba o projeto para o GitHub.
2. Importe o repositorio na Vercel.
3. Configure as variaveis do `.env.example`.
4. Build command: `npm run build`.
5. Output: padrao Next.js.
6. Depois do deploy, valide `/api/health`, `/portal` e login interno.

Guias completos:

- `GUIA_SUPABASE_SETUP.md`
- `GUIA_VERCEL_DEPLOY.md`
- `GUIA_BOOTSTRAP_ADMIN.md`
- `GUIA_TESTE_PILOTO.md`
- `CHECKLIST_PRIMEIRO_CLIENTE_REAL.md`
- `RELATORIO_HARDENING_NEX_RURAL.md`
- `RELATORIO_PILOTO_COMERCIAL_2026-07-05.md`

## Importante

Nao envie para GitHub/Vercel arquivos sensiveis como `.env.local`, chaves reais, `.next` ou `node_modules`. O ZIP final desta entrega ja deve excluir esses itens.

Offline: o app e instalavel como PWA e mantem shell/rotas principais em cache. Em producao, operacoes com Supabase exigem internet; ainda nao ha fila offline de sincronizacao para cadastros, uploads ou edicoes.

## Atualizacao - Checklists documentais, tags e ficha do cliente

Esta versao adiciona uma reorganizacao funcional do Nex Rural com foco comercial e operacional:

- Modelos de checklists documentais editaveis.
- Checklists gerados para cliente, imovel ou servico.
- Itens solicitados ao cliente pelo portal.
- Tags de clientes e vinculos cliente x tag.
- Cadastro completo de conjuge.
- Exportacao de contatos e ficha cadastral do cliente em PDF.
- Menu reorganizado por grupos: Clientes, Documentos e Checklists, Cartorio, Geo, Orgaos Rurais, Financeiro, Relatorios e Administracao.

### Aplicar a nova migration

No Supabase SQL Editor, execute:

```sql
-- supabase/migrations/0009_checklists_tags_clients_reorganization.sql
```

Depois, com as variaveis de ambiente configuradas localmente, rode:

```bash
npm run seed:checklists
```

Os modelos sao referencias operacionais editaveis. Revise conforme cartorio, orgao, municipio, UF e situacao do imovel antes de protocolar.

## Sprint Comercial — Dossiê do Cliente, Foto e Cônjuge Opcional

Esta versão inclui melhorias estruturais para deixar o sistema mais adequado às primeiras empresas:

- Cônjuge agora pode ser preenchido como informação opcional dentro do cadastro do cliente.
- O menu deixa de tratar cônjuge como função principal separada.
- O cadastro do cliente aceita foto para ficha e dossiê.
- O sistema gera dois tipos de dossiê:
  - Dossiê somente do cliente.
  - Dossiê do cliente com dados do cônjuge.
- A exportação de clientes considera tags, contatos e dados do cônjuge.
- A migration `0010_commercial_readiness_cleanup.sql` corrige/garante campos, índices, constraints e RLS necessários.

Após atualizar o GitHub/Vercel, aplique no Supabase:

```sql
-- Rode o conteúdo de:
supabase/migrations/0010_commercial_readiness_cleanup.sql
```

Depois valide:

```bash
npm install
npm run build
```

## Motor real de documentos DOCX

Esta versão inclui o módulo **Modelos DOCX**, que permite à empresa enviar seus próprios modelos `.docx` com variáveis no formato `{{cliente_nome}}`, `{{cliente_cpf}}`, `{{imovel_nome}}`, etc. O sistema identifica as variáveis, busca dados reais do cliente/imóvel/serviço e gera um novo DOCX preenchido para download, impressão ou liberação no portal do cliente.

Antes de usar em produção, execute no Supabase:

```sql
supabase/migrations/0012_real_document_engine_checklists.sql
```

Também instale as novas dependências:

```bash
npm install
```
