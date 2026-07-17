# Guia Supabase Setup - Nex Rural

## 1. Criar projeto

1. Acesse Supabase e crie um projeto.
2. Copie:
   - Project URL
   - anon public key
   - service_role key
3. Configure essas chaves no `.env.local` local e depois na Vercel.

## 2. Variaveis obrigatorias

```bash
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
BOOTSTRAP_SECRET=segredo-forte-para-rota-bootstrap
PORTAL_SESSION_SECRET=segredo-forte-com-mais-de-24-caracteres
```

## 3. Aplicar migrations

No SQL Editor do Supabase, execute em ordem:

1. `0001_nex_rural_schema.sql`
2. `0002_advanced_nex_rural_modules.sql`
3. `0003_pilot_modules_aged_iterma_contracts.sql`
4. `0004_backend_first_pilot_readiness.sql`
5. `0005_multiempresa_global_geo_reports.sql`
6. `0006_pilot_hardening.sql`
7. `0007_emergency_pilot_fixes.sql`

As migrations criam tabelas, RLS, policies, bucket privado `nex-rural-documents`, roles, portal, relatorios, geoprocessamento, hardening de piloto e ajustes finais para o teste comercial.

## 4. Validar banco e Storage

Depois das migrations:

```bash
npm run verify:supabase
```

O script verifica tabelas essenciais e o bucket `nex-rural-documents`.

## 5. Criar Admin Master Global

Configure:

```bash
BOOTSTRAP_GLOBAL=true
BOOTSTRAP_ADMIN_EMAIL=joaomarcosgpp@hotmail.com
BOOTSTRAP_ADMIN_PASSWORD=senha-forte
BOOTSTRAP_ADMIN_NAME=Joao Marcos Gomes Pereira
BOOTSTRAP_COMPANY_NAME=NexLabs
BOOTSTRAP_COMPANY_CODE=3272026
```

Execute:

```bash
npm run bootstrap:admin
```

O script e idempotente: se empresa ou usuario ja existirem, ele reutiliza e atualiza o perfil.

## 6. Validar RLS manualmente

Crie duas empresas e dois usuarios admin de empresa. Depois teste:

- usuario da Empresa A nao ve clientes da Empresa B;
- usuario da Empresa B nao ve documentos da Empresa A;
- cliente no portal ve apenas itens com `visible_on_portal=true`;
- Admin Master Global ve todas as empresas;
- empresa bloqueada nao permite login.

## 7. Checklist Supabase

- [ ] Migrations 0001 a 0007 aplicadas.
- [ ] Bucket `nex-rural-documents` existe e esta privado.
- [ ] RLS ativa nas tabelas sensiveis.
- [ ] Admin Master Global criado.
- [ ] Primeira empresa criada.
- [ ] Admin da empresa criado.
- [ ] `npm run verify:supabase` aprovado.
