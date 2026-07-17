# Relatório — Sprint Fluxos Reais Nex Rural

## Objetivo
Aplicar melhorias estruturais para transformar funções já existentes em fluxos reais de uso diário: mapeamento visual de variáveis DOCX, wizard de geração de documentos, checklists profissionais, portal sanitizado, RelationSelect nos formulários, visualização real de documentos, Geo com seleção obrigatória e build mais estável.

## Correções aplicadas

### 1. Build e estrutura
- Criado `components/nex-rural-client.tsx` com carregamento client-side do painel principal para reduzir avaliação pesada durante o build.
- Páginas `app/page.tsx`, `app/master/page.tsx` e `app/portal/page.tsx` passaram a usar o shell leve.
- `jsPDF` deixou de ser importado globalmente; agora é carregado sob demanda nas funções de PDF.
- `next.config.mjs` ajustado para executar lint/typecheck separadamente e evitar validação duplicada dentro do build.
- O build do Next chegou a compilar, gerar páginas estáticas e exibir tabela de rotas; no sandbox o processo permaneceu preso na etapa pós-trace, sem erro de compilação. Em ambiente local/Vercel, rodar `npm run build` normalmente.

### 2. Motor DOCX visual
- Adicionada API `POST /api/document-templates/[id]/variable-map` para salvar `variable_map` com validação e auditoria.
- `lib/document-engine.ts` agora aceita `source/field` e também `source_entity/source_field`, preservando compatibilidade.
- O mapeamento visual foi integrado no módulo de Modelos DOCX.
- A empresa consegue editar origem, campo, obrigatoriedade e valor manual/padrão por variável.
- O wizard de geração mostra modelo, cliente, imóvel, serviço, valores manuais e prévia dos valores que serão preenchidos.
- Campos faltantes são exibidos em painel de confirmação dentro da interface, sem `window.confirm` no fluxo DOCX.

### 3. Portal seguro
- Reescrita a rota `app/api/portal/data/route.ts` com sanitização por tipo de dado.
- O portal não retorna mais `storage_path`, `company_id`, `template_id`, `generated_by`, `variable_map` e campos internos nos dados sanitizados.
- Criada rota `GET /api/portal/generated-documents/[id]/download` validando token, cliente, empresa e `portal_visible` antes de gerar link assinado.
- Upload do portal agora retorna objeto sanitizado, não a linha completa da tabela `documents`.

### 4. RelationSelect e remoção de UUID manual
- `RelationSelect` foi integrado ao formulário genérico (`CrudPanel/FormField`).
- Campos como `client_id`, `property_id`, `service_id`, `template_id`, `linked_template_id`, `generated_checklist_id`, `generated_checklist_item_id`, `tag_id` e `company_id` renderizam selects amigáveis.
- Usuários comuns não editam empresa manualmente; Admin Master pode selecionar empresa.
- Labels técnicos como ID do cliente/imóvel/serviço foram substituídos visualmente por Cliente, Imóvel, Serviço e Modelo.

### 5. Checklists profissionais
- Adicionado builder visual dentro de Modelos DOCX/Checklists.
- Empresa pode criar checklist, adicionar itens, definir obrigatoriedade, quem fornece, visibilidade no portal e modelo DOCX vinculado.
- Wizard para gerar checklist para cliente usa a API real `/api/checklists/generate-for-client`.
- API de geração de checklist agora copia `linked_template_id`, `property_id` e `service_id` para os itens gerados.
- Itens gerados com modelo vinculado podem carregar o wizard de geração DOCX diretamente.

### 6. Dossiê, documentos e Geo
- Documentos comuns passaram a usar select de Cliente, Imóvel e Serviço no upload.
- A visualização de documento gerado não usa mais PDF técnico de tabela; mostra painel amigável e download real.
- Geo agora exige seleção de cliente e imóvel antes de importar vértices, anexar arquivos, comparar áreas ou gerar dossiê técnico.
- Removido o uso automático de `properties[0]` no fluxo principal de Geo.
- Aviso técnico fixo informa que os cálculos são aproximados e não substituem software técnico/ART/memorial.

### 7. Modularização
- Arquivos de módulos foram preenchidos com componentes funcionais não nulos, evitando módulos vazios.
- Foram adicionados componentes: `GenerateDocumentWizard`, `DocumentViewer`, `GenerateChecklistForClientWizard`, `ChecklistClientBoard`, `ClientTabs`, `ClientDossierPreview`, `PortalSanitizedDashboard`, `GeoPropertySelector` e `LoadingState`.
- O painel principal ainda concentra muita lógica, mas agora há módulos reais e um shell client-side para evoluir a separação sem quebrar o sistema.

## Validações executadas

```bash
npm install --legacy-peer-deps --no-audit --no-fund
npm run lint -- --quiet
npx tsc --noEmit
```

Resultado: lint e TypeScript passaram sem erros.

`npm run build` compilou, gerou páginas estáticas e exibiu a tabela de rotas, mas a sandbox permaneceu presa na etapa pós-build/trace. Não houve erro de compilação nem erro de TypeScript.

## Pendências reais
- Modularizar completamente `components/nex-rural-app.tsx` em etapas futuras.
- Converter DOCX para PDF real somente após configurar conversor confiável em produção.
- Criar prévia visual completa de DOCX apenas com integração de editor externo ou conversor.
- Melhorar formatação do Excel final com largura de colunas, filtros e estilos.
- Expandir o `ClientDossierPreview` para modal completo antes do PDF final.
