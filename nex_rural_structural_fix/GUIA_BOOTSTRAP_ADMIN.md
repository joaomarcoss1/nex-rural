# Guia Bootstrap Admin - Nex Rural

## Objetivo

Criar a primeira estrutura operacional em Supabase real:

- empresa raiz ou empresa piloto;
- Admin Master Global ou Admin da Empresa;
- perfil em `user_profiles`;
- codigo de empresa;
- auditoria de bootstrap.

## Bootstrap via script

Configure `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
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

Resultado esperado:

```json
{
  "ok": true,
  "company_code": "3272026",
  "role": "admin_master_global"
}
```

## Bootstrap via API

Rota:

```http
POST /api/bootstrap/admin
Content-Type: application/json
```

Payload Admin Master Global:

```json
{
  "secret": "valor-do-BOOTSTRAP_SECRET",
  "global": true,
  "fullName": "Joao Marcos Gomes Pereira",
  "email": "joaomarcosgpp@hotmail.com",
  "password": "senha-forte"
}
```

Payload primeira empresa:

```json
{
  "secret": "valor-do-BOOTSTRAP_SECRET",
  "global": false,
  "companyName": "Empresa Piloto",
  "fullName": "Admin da Empresa",
  "email": "admin@empresa.com.br",
  "password": "senha-forte"
}
```

## Pos-bootstrap

1. Entrar com Admin Master Global sem codigo de empresa.
2. Criar ou revisar empresa piloto no modulo Empresas.
3. Criar Admin da Empresa pelo modulo Usuarios ou API administrativa.
4. Testar login com e-mail, senha e codigo da empresa.
5. Definir `BOOTSTRAP_DISABLED=true` em producao.
