# RELATÓRIO — HARDENING DE PRODUÇÃO NEX RURAL

## 1. Resumo

Foi aplicado um hardening final no Nex Rural com foco em produção inicial controlada para empresas reais. A sprint priorizou correções críticas no motor DOCX, portal do cliente, checklists, dossiê, geoprocessamento, segurança multiempresa, mobile e build.

## 2. Correções críticas aplicadas

- O motor DOCX agora separa variáveis obrigatórias, opcionais e avisos.
- Variáveis opcionais vazias não bloqueiam mais a geração como erro crítico.
- Valores manuais passam a ser preservados em `generation_metadata` no documento gerado.
- O portal não envia mais `signed_url` dentro de `/api/portal/data` para documentos comuns.
- Criada rota segura `GET /api/portal/documents/[id]/download`.
- Upload de documentos pelo portal continua retornando somente payload sanitizado.
- APIs de release/hide de documentos gerados agora respeitam o Admin Master Global sem limitar indevidamente por `actor.company_id`.
- Checklist Builder recebeu ações de duplicar, desativar, remover/reativar item e reordenar itens.
- Ações de status de item de checklist passam a usar a API `/api/checklist-items/update-status`.
- Recusa de item exige motivo no backend.
- Geração de DOCX a partir de item do checklist envia `generated_checklist_item_id` e cria vínculo em tabela própria.
- Dossiê rural genérico não usa mais o primeiro cliente/imóvel automaticamente.
- Geo permanece bloqueado para ações técnicas sem cliente e imóvel selecionados no fluxo principal.
- Removidos usos encontrados de `alert()`, `confirm()` e `window.confirm()` nos fluxos principais.
- RelationSelect teve cobertura ampliada para mais campos relacionais.
- Build concluiu com tabela final de rotas.

## 3. Motor DOCX

Arquivo principal alterado:

- `lib/document-engine.ts`

`resolveTemplateData()` agora retorna:

```ts
{
  data,
  missingRequired,
  missingOptional,
  warnings,
  missing
}
```

Regras:

- Variável obrigatória sem valor entra em `missingRequired`.
- Variável opcional sem valor entra em `missingOptional`.
- Variáveis opcionais geram aviso leve.
- Valores manuais obrigatórios precisam ser informados ou confirmados no fluxo.

## 4. Geração de DOCX

Arquivo alterado:

- `app/api/document-templates/generate/route.ts`

Melhorias:

- Suporte a Admin Master Global.
- Usa `companyId` do modelo selecionado.
- Registra `generation_metadata`.
- Retorna `missing_required`, `missing_optional` e `warnings`.
- Cria vínculo com item específico de checklist quando recebido `generated_checklist_item_id`.
- Continua salvando apenas `storage_path`, sem link assinado permanente.

## 5. Portal do cliente

Arquivos alterados/criados:

- `app/api/portal/data/route.ts`
- `app/api/portal/documents/[id]/download/route.ts`
- `app/api/portal/documents/upload/route.ts`

Melhorias:

- `/api/portal/data` não retorna `signed_url`.
- Documentos comuns retornam `download_endpoint`.
- Download real ocorre somente no clique por API segura.
- Portal não recebe `storage_path`, `company_id`, `template_id`, `variable_map` ou campos internos nos documentos gerados.

## 6. Admin Master Global

Arquivos alterados:

- `app/api/generated-documents/release/route.ts`
- `app/api/generated-documents/hide/route.ts`
- `app/api/checklists/generate-for-client/route.ts`
- `app/api/document-templates/generate/route.ts`

Melhorias:

- Admin Master pode operar documentos/checklists de empresas diferentes quando autorizado.
- Usuários comuns continuam isolados por empresa.
- Auditoria registra ações com `company_id` real do registro.

## 7. Checklists

Arquivos alterados:

- `components/nex-rural-app.tsx`
- `app/api/checklist-items/update-status/route.ts`
- `app/api/checklists/generate-for-client/route.ts`

Melhorias:

- Criar checklist.
- Duplicar checklist.
- Desativar checklist.
- Adicionar item.
- Remover/reativar item.
- Reordenar item com Subir/Descer.
- Vincular modelo DOCX ao item.
- Gerar checklist para cliente via API.
- Gerar documento a partir do item de checklist.
- Atualizar status por API.
- Recusar com motivo no backend.

## 8. Dossiê

O dossiê rural genérico foi corrigido para exigir seleção explícita de cliente e imóvel antes de gerar.

Não há mais uso automático de:

```ts
rows.rural_properties?.[0]
rows.clients?.[0]
properties[0]
```

## 9. Geo

O módulo Geo continua exigindo seleção de cliente e imóvel no fluxo principal antes de:

- importar coordenadas;
- anexar arquivo técnico;
- comparar áreas;
- gerar relatório;
- criar pendência.

O aviso técnico permanece:

> Cálculo aproximado para apoio operacional. Não substitui software técnico, ART/RRT, memorial descritivo ou validação oficial.

## 10. RelationSelect

A cobertura foi ampliada para campos como:

- `owner_id`
- `producer_id`
- `responsible_id`
- `assigned_to`
- `registry_id`
- `certificate_id`
- `property_certificate_id`
- `rural_property_id`
- `document_id`
- `generated_document_id`
- `checklist_item_id`
- `generated_checklist_item_id`

Também foi trocado o uso de `reset({ ...watch() })` por `setValue()` no formulário genérico.

## 11. Migration nova

Criada:

- `supabase/migrations/0013_production_hardening_nex_rural.sql`

Ela adiciona:

- `generated_documents.generation_metadata`
- campos de status em `generated_checklist_items`
- campos profissionais em `checklist_template_items`
- tabela `generated_document_checklist_items`
- policy RLS para a tabela de vínculo
- marcação mais clara de modelos manuais/demonstrativos

## 12. Mobile

Foram preservados e reforçados:

- DataTable em cards no mobile;
- botões com `flex-wrap`;
- wizards e painéis em grid responsivo;
- ações secundárias com `ActionMenu` nos módulos críticos de documentos/checklists;
- formulários com selects amigáveis.

## 13. Validação técnica

Comandos executados:

```bash
npm install --legacy-peer-deps --no-audit --no-fund
npm run lint -- --quiet
npx tsc --noEmit
npm run build
```

Resultados:

- `npm install`: sucesso.
- `lint`: sucesso.
- `tsc --noEmit`: sucesso.
- `npm run build`: sucesso; compilou, gerou páginas estáticas e exibiu a tabela final de rotas.

## 14. Rotas novas ou reforçadas

- `GET /api/portal/documents/[id]/download`
- `POST /api/document-templates/[id]/variable-map`
- `POST /api/document-templates/generate`
- `POST /api/checklist-items/update-status`
- `POST /api/checklists/generate-for-client`
- `POST /api/generated-documents/release`
- `POST /api/generated-documents/hide`

## 15. Pendências reais restantes

Para uma versão comercial ainda mais refinada depois do piloto:

- Extrair completamente o arquivo `components/nex-rural-app.tsx` para módulos menores.
- Criar DocumentViewer mais avançado com preview real de PDF/imagens em modal.
- Melhorar formatação premium dos Excels.
- Substituir modelos demo por um fluxo opcional “Carregar exemplos demonstrativos”.
- Criar painel visual de auditoria de ações do Admin Master por empresa.
- Converter DOCX para PDF com conversor real de produção, caso seja requisito comercial.

## 16. Recomendação antes de liberar para clientes

1. Rodar migrations até `0013` no Supabase.
2. Conferir buckets no Storage.
3. Configurar variáveis na Vercel.
4. Criar Admin Master.
5. Testar com uma empresa piloto real.
6. Testar upload de DOCX com variáveis personalizadas.
7. Testar portal do cliente em celular.
8. Testar checklist com documento vinculado.
9. Testar download seguro de documentos.

