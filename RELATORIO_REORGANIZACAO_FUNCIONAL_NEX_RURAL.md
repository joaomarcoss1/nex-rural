# RELATORIO_REORGANIZACAO_FUNCIONAL_NEX_RURAL

## 1. Funcoes mantidas
- Dashboard, CRM, empresas, usuarios, clientes, imoveis, servicos, protocolos, documentos, pendencias, cartorio, certidoes, due diligence, geoprocessamento, financeiro, relatorios e portal do cliente.
- Fluxos criticos mantidos: login, logout, atualizacao de dados, upload/download de documentos, portal do cliente, exportacao CSV/Excel/PDF e auditoria.

## 2. Funcoes removidas ou ocultadas
- Nenhuma funcao util foi apagada. O menu foi reorganizado por grupos para reduzir confusao visual.
- Funcoes avancadas continuam acessiveis dentro dos grupos corretos: Cartorio, Geo, Orgaos Rurais, Financeiro, Relatorios e Administracao.

## 3. Funcoes agrupadas
- Atendimento: CRM e Pendencias.
- Clientes: cadastro, conjuges, tags, vinculos de tags e exportacoes.
- Imoveis e Terra: imoveis, certidoes e due diligence.
- Documentos e Checklists: biblioteca, modelos de checklists, itens, checklists por cliente, documentos solicitados e modelos de declaracoes.
- Cartorio: protocolos, cartorio, conferencias e contratos rurais.
- Geo: geoprocessamento, SIGEF e equipamentos.
- Orgaos Rurais: CAR, CCIR/SNCR, ITR/DITR, CIB/NIRF, AGED e ITERMA.
- Financeiro e Relatorios: financeiro e relatorios.
- Administracao: empresas, usuarios, templates e configuracoes.

## 4. Botoes corrigidos e ampliados
- Clientes: gerar ficha do cliente em PDF, criar checklist para cliente, exportar contatos, liberar/ocultar portal e gerar codigo de acesso.
- Modelos de checklist: duplicar modelo e gerar PDF.
- Checklists gerados: solicitar itens ao cliente, liberar/ocultar portal e gerar PDF.
- Itens gerados: liberar/ocultar portal, aprovar, recusar e criar pendencia.
- Servicos: ao criar ou acionar checklist, o sistema tenta usar modelos inteligentes antes da biblioteca documental antiga.

## 5. Novas funcoes criadas
- Sistema de modelos de checklists editaveis.
- Itens de checklist com exigencias como conjuge, assinatura, original/copia, arquivo geo e visibilidade no portal.
- Checklists gerados por cliente, imovel ou servico.
- Itens solicitados ao cliente no portal.
- Tags de clientes e vinculo cliente x tag.
- Cadastro de conjuge sem exigir que o conjuge vire cliente separado.
- Exportacao de contatos do cliente.
- Ficha cadastral do cliente em PDF com dados pessoais, conjuge, imoveis, servicos, pendencias e observacoes.
- Migration 0009 com tabelas novas e seeds iniciais.
- Script `npm run seed:checklists` para popular modelos em empresas existentes.

## 6. Melhorias na navegacao
- Menu lateral reorganizado em grupos profissionais.
- Funcoes relacionadas a clientes, documentos, cartorio, geo, orgaos rurais, financeiro e administracao ficaram agrupadas.
- O portal passou a exibir documentos solicitados por checklists liberados.

## 7. Riscos restantes
- Aplicar a migration `supabase/migrations/0009_checklists_tags_clients_reorganization.sql` no Supabase antes de usar as novas funcoes em producao.
- Rodar `npm run seed:checklists` se novas empresas forem criadas depois da migration e ainda nao possuirem modelos.
- Alguns cadastros ainda usam IDs UUID em campos tecnicos; a proxima etapa ideal e substituir por selects relacionais em todos os formularios.
- A validacao oficial de exigencias de cada cartorio/orgao deve continuar sendo responsabilidade operacional da empresa, pois os modelos sao editaveis e variam conforme municipio/serventia.

## 8. O que ainda falta para uma versao comercial completa
- Trocar campos `client_id`, `property_id`, `service_id` e `template_id` por seletores inteligentes.
- Criar tela dedicada de ficha do cliente com upload direto da foto.
- Criar editor visual de declaracoes com preview PDF.
- Criar painel especifico de progresso dos checklists.
- Criar filtros avancados por tag, status documental e pendencias.
- Criar testes E2E com Playwright para os fluxos de checklist, portal e ficha do cliente.

## 9. Arquivos principais alterados
- `components/nex-rural-app.tsx`
- `lib/services/base.ts`
- `app/api/portal/data/route.ts`
- `supabase/migrations/0009_checklists_tags_clients_reorganization.sql`
- `scripts/seed-checklist-templates.mjs`
- `package.json`

## 10. Como validar
1. Aplicar a migration 0009 no Supabase.
2. Rodar `npm run seed:checklists` com variaveis Supabase configuradas.
3. Entrar como Admin Master ou admin da empresa.
4. Criar uma tag e vincular a um cliente.
5. Cadastrar conjuge no cliente.
6. Gerar ficha do cliente em PDF.
7. Criar checklist para cliente ou servico.
8. Liberar checklist/itens no portal.
9. Acessar o portal do cliente e conferir documentos solicitados.
10. Exportar lista/contatos de clientes.
