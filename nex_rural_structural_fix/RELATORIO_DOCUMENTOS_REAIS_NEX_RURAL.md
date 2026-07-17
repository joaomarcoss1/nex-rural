# Relatório — Motor real de documentos do Nex Rural

## O que estava errado

A versão anterior tratava modelos de declarações como registros de tabela. O usuário conseguia cadastrar nomes e textos, mas o sistema não executava o fluxo real de uma empresa: subir um modelo próprio, identificar variáveis, preencher com dados do cliente e gerar um arquivo final pronto para uso.

Também existiam PDFs gerados como tabelas técnicas, com campos internos como `id`, `company_id`, `template_id`, `Content` e `Variables`. Isso foi substituído por um fluxo documental separado.

## O que foi removido ou reduzido

- A tela de login foi simplificada e deixou de destacar Admin Master como acesso principal.
- Textos técnicos de login foram removidos.
- O módulo documental passou a priorizar modelos DOCX enviados pela própria empresa.
- Modelos genéricos deixam de ser tratados como documentos oficiais.

## Novo motor de documentos

Foi criado o fluxo real para modelos da empresa:

1. A empresa envia um arquivo `.docx`.
2. O arquivo é salvo no Supabase Storage, bucket `document-templates`.
3. O sistema lê o DOCX e identifica variáveis no padrão `{{variavel}}`.
4. As variáveis são salvas no registro do modelo.
5. A empresa escolhe cliente, imóvel e serviço.
6. O sistema busca dados reais no Supabase.
7. O sistema usa `docxtemplater` para gerar um novo DOCX preenchido.
8. O arquivo final é salvo no bucket `generated-documents`.
9. O documento pode ser baixado ou liberado no portal do cliente.

## Variáveis suportadas

O motor já reconhece variáveis como:

- `{{cliente_nome}}`
- `{{cliente_cpf}}`
- `{{cliente_telefone}}`
- `{{cliente_email}}`
- `{{conjuge_nome}}`
- `{{conjuge_cpf}}`
- `{{imovel_nome}}`
- `{{imovel_matricula}}`
- `{{imovel_municipio}}`
- `{{imovel_area}}`
- `{{servico_tipo}}`
- `{{empresa_nome}}`
- `{{data_atual}}`

Se alguma variável estiver sem dado, o sistema avisa antes de gerar.

## APIs criadas

- `POST /api/document-templates/upload`
- `POST /api/document-templates/analyze`
- `POST /api/document-templates/generate`
- `POST /api/generated-documents/release`
- `POST /api/generated-documents/hide`
- `POST /api/clients/photo`
- `POST /api/checklists/generate-for-client`
- `POST /api/checklist-items/update-status`

## Migração criada

Foi criada a migration:

`supabase/migrations/0012_real_document_engine_checklists.sql`

Ela adiciona:

- campos reais em `document_templates`;
- tabela `generated_documents`;
- tabela `template_variables`;
- vínculo de item de checklist com modelo DOCX;
- bucket `document-templates`;
- bucket `generated-documents`;
- bucket `client-photos`;
- políticas RLS básicas.

## Portal do cliente

O portal agora possui suporte para mostrar documentos gerados e liberados pela empresa em `generated_documents.portal_visible = true`.

## Foto do cliente

O upload de foto agora usa a API `/api/clients/photo`, salva no bucket `client-photos` e grava `photo_url` e `photo_storage_path` no cadastro do cliente.

## Pendências reais

- Conversão perfeita de DOCX para PDF depende de ferramenta de conversão no ambiente de produção. Por isso, a entrega principal garantida é o DOCX preenchido.
- O PDF pode ser implementado depois com serviço de conversão ou LibreOffice em ambiente próprio, caso a Vercel não suporte conversão nativa.
- O mapeamento visual de variáveis foi iniciado com `variable_map`; a próxima evolução pode permitir ajuste campo a campo pela interface.

## Critério de aceite implementado

A nova estrutura atende ao fluxo essencial:

1. Upload de DOCX real.
2. Detecção de variáveis.
3. Escolha de cliente/imóvel/serviço.
4. Geração de DOCX preenchido.
5. Download do documento final.
6. Liberação no portal do cliente.
