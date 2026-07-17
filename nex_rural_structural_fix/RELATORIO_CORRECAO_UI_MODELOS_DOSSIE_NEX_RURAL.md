# RELATÓRIO DE CORREÇÃO UI, MODELOS E DOSSIÊ - NEX RURAL

## Problemas encontrados
- Telas com visualização técnica em JSON bruto apareciam para usuários.
- Tabelas de checklists e documentos exibiam campos técnicos como `template_id`, `company_id` e identificadores internos.
- Modelos de documentos estavam vazios no modo demo e incompletos no banco.
- Checklists principais tinham poucos modelos e poucos itens.
- Cadastro de cliente exibia campos do cônjuge mesmo quando o cliente não possuía cônjuge.
- Foto do cliente estava tratada como campo manual, não como fluxo claro de upload.
- Dossiê não tinha exportação Excel dedicada e precisava ficar mais próximo de um documento corporativo.
- Botões de ação assíncrona não tinham tratamento visual consistente de carregamento/erro.

## Correções aplicadas
- Removida a visualização preta com JSON bruto das telas de CRUD.
- Criado componente `RecordDetails`, com resumo visual e cards limpos.
- Criada tabela responsiva com colunas úteis, ocultando campos técnicos.
- A coluna de ações ficou sempre visível em desktop e em cards no mobile.
- Adicionados rótulos amigáveis para campos internos.
- Campos técnicos são ocultados por padrão: `id`, `company_id`, `client_id`, `template_id`, `property_id`, `service_id`, `generated_checklist_id`, `document_id`, `storage_path` e similares.
- Campos do cônjuge agora aparecem somente quando `Possui cônjuge` estiver marcado.
- Cônjuge deixou de ser item principal do menu e ficou como dado opcional do cliente.
- Fluxo de upload da foto do cliente foi reforçado no cadastro e nos botões de ação.
- Foto anexada passa a ser usada no cadastro e no dossiê PDF.
- Criada exportação de dossiê do cliente em Excel.
- Corrigida ação de aprovar/recusar itens de checklist para usar `Validado` e `Recusado`.
- Corrigida ação de liberar/ocultar portal em `generated_checklist_items` para usar `visible_to_client`.
- Adicionado tratamento de loading e erro nos botões de ação.
- Melhoradas animações, transições, cards e divisão visual dos grupos de funcionalidades.

## Modelos adicionados
Foram adicionados modelos completos e editáveis, incluindo:
- Declaração de posse rural.
- Declaração de residência rural.
- Declaração de atividade rural.
- Declaração de confrontantes.
- Declaração de anuência de confrontantes.
- Autorização para protocolo.
- Procuração simples para acompanhamento administrativo.
- Requerimento de averbação.
- Requerimento de retificação de matrícula.
- Requerimento para certidão de inteiro teor.
- Termo de entrega de documentos.
- Termo de ciência de pendências.
- Recibo de entrega de documentos ao cliente.
- Declaração de responsabilidade pelas informações.
- Solicitação de documentos ao cliente.

## Checklists adicionados
Foram adicionados checklists principais para:
- Averbação.
- Escritura e Registro.
- Retificação de Matrícula.
- Retificação de Área.
- Desmembramento.
- Remembramento.
- Georreferenciamento.
- SIGEF.
- CAR.
- Retificação de CAR.
- CCIR/SNCR.
- ITR/DITR.
- CIB/NIRF.
- AGED - Produtor/Propriedade.
- ITERMA - Regularização Fundiária.
- Usucapião Rural.
- Inventário Rural.
- Compra e Venda Rural.
- Due Diligence Rural.
- Dossiê Rural.

## Arquivos importantes alterados/criados
- `components/nex-rural-app.tsx`
- `supabase/migrations/0009_checklists_tags_clients_reorganization.sql`
- `supabase/migrations/0011_templates_ui_dossier_cleanup.sql`
- `RELATORIO_CORRECAO_UI_MODELOS_DOSSIE_NEX_RURAL.md`

## Testes realizados
- `npm ci --legacy-peer-deps --no-audit --no-fund` executado com sucesso.
- `npm run lint` executado com sucesso, sem erros.
- `npx tsc --noEmit` executado com sucesso, sem erros de tipo.
- `npm run build` compilou o projeto com sucesso, mas o ambiente da sandbox encerrou a etapa de geração estática com `EPIPE/timeout`; por isso é recomendado rodar novamente localmente antes de subir para produção.

## Pendências restantes
- Testar upload real de foto com Supabase Storage configurado.
- Aplicar a migration `0011_templates_ui_dossier_cleanup.sql` no Supabase.
- Testar dossiê PDF com foto real em ambiente de produção.
- Testar permissões RLS com usuário de empresa e usuário cliente.
- Validar visualmente todos os checklists no banco real após rodar a migration.
