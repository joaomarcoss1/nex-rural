# Relatório Produção 10/10 — Nex Rural

## Resumo

Esta versão aplica a sprint final de produção ampla com foco em login escalável, isolamento multiempresa, acesso simplificado por CPF, motor DOCX, portal seguro, Geo com Storage real, checklists e mobile.

## 1. Nova lógica de login

### Admin Master Global
- Mantém login forte por e-mail e senha via Supabase Auth.
- Continua com acesso global e ações auditáveis.

### Admin da Empresa
- Mantém login por e-mail, senha e código/matrícula da empresa.
- Continua limitado à própria empresa, exceto Admin Master Global.

### Funcionário
- Novo fluxo de acesso com nome completo + CPF.
- Nova tabela `staff_profiles` para funcionários sem e-mail obrigatório.
- Nova rota `POST /api/access/staff/login`.
- Suporte à escolha segura de empresa quando o mesmo funcionário existir em mais de uma empresa.
- Sessão própria via `access_sessions`, token assinado e hash persistido no banco.
- Permissões por função em `STAFF_ROLE_PERMISSIONS`.

### Cliente
- Novo fluxo de acesso com nome completo + CPF.
- Nova rota `POST /api/access/client/login`.
- A rota antiga `/api/portal/lookup` foi desativada para impedir login legado por código.
- Em caso de ambiguidade, a API retorna escolha segura de empresa sem expor `company_id`.

## 2. Segurança e multiempresa

- Criado `lib/security/access.ts` com normalização de CPF/nome, validação de CPF, tokens de acesso, sessão própria, hash de token, permissões por função e helpers de escopo.
- O CPF é normalizado sem pontos e traços.
- O nome é normalizado sem acentos, caixa e espaços duplicados.
- As sessões usam token assinado e registro em `access_sessions`.
- Tokens não são salvos puros no banco, apenas hash.
- Adicionado rate limit por IP + CPF para login de cliente e funcionário.
- Adicionada auditoria de login/falha/logout/download/upload quando aplicável.

## 3. Banco e migration

Nova migration:

`supabase/migrations/0014_producao_10_10_acesso_staff_geo.sql`

Ela adiciona:

- `staff_profiles`.
- `access_sessions`.
- `normalized_name`, `normalized_cpf`, `portal_status` e `last_portal_access_at` em `clients`.
- funções SQL `nex_digits()` e `nex_normalize_text()`.
- triggers de normalização para clientes e funcionários.
- colunas de Storage real em `geo_files`.
- bucket `geo-files`.
- policies de Storage com validação de UUID antes do cast.
- `generated_document_checklist_items` para vínculo entre documento gerado e item de checklist.
- campos de controle em `generated_checklist_items`.

## 4. Motor DOCX

- Mantida separação de `missingRequired`, `missingOptional` e `warnings`.
- O fluxo de reanálise do DOCX agora preserva o mapeamento personalizado da empresa: o mapa existente tem prioridade sobre o mapa inferido.
- O documento gerado já mantém metadata em `generation_metadata` conforme a sprint anterior.

## 5. Interface DOCX

- A tela principal já possui fluxo para upload, análise, mapeamento visual, valores manuais, prévia e geração.
- A próxima melhoria estrutural recomendada é mover a lógica visual inteira para os componentes de `components/modules/documents`, reduzindo ainda mais o arquivo principal.

## 6. Portal do cliente

- O portal agora usa login por nome completo + CPF.
- `/api/portal/data` continua sanitizado.
- Documentos comuns não retornam `signed_url` na carga principal; retornam endpoint seguro de download.
- A rota de download de documentos do portal valida token, cliente, empresa, liberação e gera signed URL somente no clique.

## 7. Funcionários e permissões

- Funcionários sem Auth passam a ser registrados em `staff_profiles`.
- O painel consegue armazenar sessão de funcionário e carregar dados via `/api/access/data`.
- Operações CRUD para funcionário passam pelo proxy `/api/access/crud`, que aplica permissões por função e escopo de empresa.
- Permissões são validadas no backend, não apenas ocultadas no frontend.

## 8. Geoprocessamento

- O Geo agora possui upload real para Supabase Storage via `POST /api/geo-files/upload`.
- Arquivos técnicos são salvos no bucket `geo-files`.
- O path segue o padrão `company_id/properties/property_id/geo/file-name`.
- `geo_files` registra `storage_path`, `mime_type`, `extension`, `size`, `uploaded_by` e `uploaded_at`.
- A API valida cliente, imóvel, empresa e extensão.
- O fluxo continua diferenciando: CSV para importação automática de vértices; demais formatos como anexos técnicos para conferência.

## 9. Mobile

- Login foi remodelado para cards responsivos: Empresa/Admin, Funcionário, Cliente e Restrito.
- O portal do cliente usa formulário simples com nome completo e CPF.
- O painel preserva DataTable responsivo e cards em mobile.
- A próxima etapa visual recomendada é quebrar os grandes módulos de DOCX, Checklists e Geo em wizards ainda mais curtos no celular.

## 10. Organização do código

- Foram adicionadas rotas e helpers estruturais para acesso e segurança.
- O arquivo principal ainda continua grande, mas agora a autenticação de clientes/funcionários, sessões, permissões, CRUD de funcionário e upload Geo foram movidos para APIs/helpers.
- A modularização total do `nex-rural-app.tsx` ainda é a principal pendência técnica de longo prazo.

## 11. Validação executada

Executado com sucesso:

```bash
npm ci --legacy-peer-deps --no-audit --no-fund
npm run lint -- --quiet
npx tsc --noEmit
```

O build foi executado e chegou em:

```text
✓ Compiled successfully
✓ Generating static pages (25/25)
Finalizing page optimization
Collecting build traces
```

No sandbox, o processo ficou preso/estourou tempo na etapa final de tracing do Next.js. Não houve erro de compilação, lint ou TypeScript. Recomenda-se validar o `npm run build` localmente e na Vercel após aplicar a migration 0014.

## 12. Checklist final antes de produção

1. Aplicar migrations até `0014_producao_10_10_acesso_staff_geo.sql` na ordem correta.
2. Criar/confirmar buckets: `document-templates`, `generated-documents`, `client-photos`, `client-documents`, `geo-files`.
3. Configurar `ACCESS_SESSION_SECRET` com pelo menos 24 caracteres.
4. Configurar variáveis de rate limit para cliente e funcionário.
5. Garantir `NEXT_PUBLIC_DEMO_MODE=false` em produção.
6. Rodar localmente:
   - `npm ci --legacy-peer-deps`
   - `npm run lint -- --quiet`
   - `npx tsc --noEmit`
   - `npm run build`
7. Testar login Admin, Empresa, Funcionário e Cliente.
8. Testar upload DOCX, geração e portal.
9. Testar upload Geo real.
10. Testar acesso entre duas empresas diferentes para confirmar isolamento.

## Pendências reais restantes

- Modularização profunda do `components/nex-rural-app.tsx` ainda precisa avançar para manutenção de longo prazo.
- O relatório Geo ainda pode evoluir para layout técnico premium separado de `exportRowsPdf`.
- O Checklist Builder ainda pode evoluir com drag-and-drop e edição modal mais refinada.
- O mobile está utilizável, mas os módulos grandes ainda podem virar wizards com rodapé fixo.
