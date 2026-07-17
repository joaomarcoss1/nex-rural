# Guia Vercel Deploy - Nex Rural

## 1. Preparar GitHub

Suba o projeto completo para um repositorio GitHub, sem:

- `node_modules`
- `.next`
- `.env.local`
- chaves reais
- logs locais

## 2. Importar na Vercel

1. Clique em "Add New Project".
2. Selecione o repositorio do Nex Rural.
3. Framework: Next.js.
4. Build command: `npm run build`.
5. Install command: `npm install`.

## 3. Variaveis de ambiente

Configure na Vercel:

```bash
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BOOTSTRAP_SECRET=
BOOTSTRAP_DISABLED=false
PORTAL_SESSION_SECRET=
PORTAL_RATE_LIMIT_MAX=6
PORTAL_RATE_LIMIT_WINDOW_MS=600000
PORTAL_RATE_LIMIT_BLOCK_MS=1200000
PORTAL_UPLOAD_MAX_BYTES=20971520
```

Depois do bootstrap inicial, troque:

```bash
BOOTSTRAP_DISABLED=true
```

e faca redeploy.

## 4. Validacao pos-deploy

Valide:

- `/api/health`
- `/`
- `/master`
- `/portal`
- login Admin Master Global;
- login Admin da Empresa com codigo;
- portal do cliente;
- upload e download de documento;
- relatorio basico;
- PWA/manifest.

## 5. Comandos locais antes do deploy

```bash
npm install
npm run lint
npm run build
npm audit --audit-level=moderate
```

## 6. Smoke test contra URL Vercel

```bash
NEX_RURAL_BASE_URL=https://sua-url.vercel.app npm run test:pilot
```
