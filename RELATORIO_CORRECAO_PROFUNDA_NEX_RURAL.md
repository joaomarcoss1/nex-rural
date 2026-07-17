# Relatório de correção profunda — Nex Rural

## 1. Problemas encontrados

Foram tratados problemas estruturais ligados ao motor documental, portal, segurança e build:

- `package-lock.json` sem dependências do motor DOCX.
- Geração DOCX dependente apenas de variáveis fixas.
- `variable_map` não era usado de forma robusta para variáveis personalizadas.
- Documento gerado salvava link assinado temporário em `public_url`.
- Portal retornava dados internos de `generated_documents`.
- Download de documentos gerados dependia de URL temporária salva.
- Upload de modelo podia deixar registro órfão se Storage falhasse.
- PDF técnico ainda podia ser acionado em áreas documentais.
- Ausência de componentes estruturais para separação futura de módulos.
- Storage policy convertia pasta para UUID sem validar formato.

## 2. Correções aplicadas

### Motor DOCX

- Criada função `resolveTemplateData` em `lib/document-engine.ts`.
- O motor agora usa `document_templates.variable_map` para preencher variáveis personalizadas.
- Variáveis como `{{nome_proprietario}}`, `{{cpf_proprietario}}`, `{{fazenda}}` e `{{cidade_imovel}}` podem ser mapeadas para Cliente/Imóvel/Empresa/Sistema/Manual.
- A geração retorna `missing_details` com variável, rótulo e motivo.
- A geração não salva mais signed URL permanente em `public_url`.

### Upload DOCX

- A rota `/api/document-templates/upload` agora valida, extrai variáveis e faz upload antes de criar o registro final.
- Caso o insert falhe, remove o arquivo do Storage para evitar lixo operacional.
- O modelo é salvo com `storage_path`, `variables` e `variable_map`.

### Download seguro

Criadas rotas:

- `GET /api/generated-documents/[id]/download`
- `GET /api/portal/generated-documents/[id]/download`

Essas rotas geram signed URL somente no momento do download, validando empresa, cliente e visibilidade.

### Portal

- `app/api/portal/data/route.ts` agora sanitiza `generated_documents`.
- O portal recebe apenas campos amigáveis: `id`, `title`, `output_type`, `status`, `generated_at`, `released_to_portal_at`, `can_download` e `download_endpoint`.
- O portal não recebe `storage_path`, `company_id`, `template_id`, `generated_by` nem `variable_map`.

### PDF documental

- A ação de PDF técnico foi bloqueada para tabelas documentais e checklists.
- O usuário recebe aviso para usar DOCX preenchido, dossiê ou relatório próprio.

### Excel

- A exportação Excel passou a usar `xlsx` de verdade quando disponível.
- Mantido fallback HTML `.xls` apenas se a biblioteca falhar no navegador.

### UI/estrutura

Criados componentes estruturais:

- `components/shared/RelationSelect.tsx`
- `components/shared/ActionMenu.tsx`
- `components/shared/ResponsiveDataTable.tsx`
- `components/shared/ConfirmDialog.tsx`
- `components/shared/EmptyState.tsx`
- `components/shared/ToastFeedback.tsx`

Criados shells de módulos para extração gradual:

- Auth/Login
- Clientes
- Documentos
- Checklists
- Portal
- Geo

### Storage/RLS

- A migration `0012_real_document_engine_checklists.sql` passou a validar UUID antes de converter `split_part(name, '/', 1)::uuid` nas policies de Storage.

## 3. Como funciona o variable_map

Exemplo de DOCX:

```text
Eu, {{nome_proprietario}}, CPF {{cpf_proprietario}}, declaro possuir o imóvel {{fazenda}}, localizado em {{cidade_imovel}}.
```

Mapeamento esperado:

```text
nome_proprietario -> Cliente > Nome completo
cpf_proprietario -> Cliente > CPF/CNPJ
fazenda -> Imóvel > Nome do imóvel
cidade_imovel -> Imóvel > Município
```

A função `resolveTemplateData` transforma esse mapa em dados reais para o `docxtemplater`.

## 4. Como gerar documento preenchido

1. Enviar DOCX modelo.
2. O sistema extrai variáveis.
3. Confirmar/ajustar mapeamento.
4. Selecionar cliente.
5. Selecionar imóvel/serviço, se necessário.
6. Gerar DOCX.
7. Baixar via rota segura.
8. Liberar no portal, se desejado.

## 5. Pendências reais

Ainda recomenda-se uma sprint visual para:

- Integrar completamente o `VariableMappingEditor` na tela final.
- Trocar todos os campos UUID dos CRUDs genéricos por `RelationSelect`.
- Criar wizard completo de checklists.
- Criar prévia formal do dossiê antes da geração.
- Implementar conversão DOCX → PDF com serviço confiável, caso seja obrigatório.
- Finalizar extração total do arquivo `components/nex-rural-app.tsx` em módulos menores.

## 6. Testes realizados

- `npm ci`: concluído.
- `npm run lint -- --quiet`: aprovado.
- `npx tsc --noEmit`: aprovado.
- `npm run build`: compilou com sucesso, mas a sandbox encerrou por timeout na etapa final do Next.js.
