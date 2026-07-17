# Relatório de Correção Comercial — Nex Rural

## Resumo executivo
Esta sprint priorizou deixar o Nex Rural mais útil para as primeiras empresas, reduzindo confusão operacional, reforçando funções comerciais e documentais e corrigindo pontos críticos ligados ao cadastro do cliente, cônjuge, foto, dossiê, checklists, tags e navegação.

## Funções essenciais mantidas
- Dashboard.
- Empresas e usuários.
- Clientes.
- Imóveis rurais.
- Serviços.
- Documentos.
- Checklists documentais.
- Tags de clientes.
- Portal do cliente.
- Geoprocessamento básico.
- Financeiro.
- Relatórios e dossiês.

## Funções reorganizadas
- Dados do cônjuge deixaram de ser uma função principal separada no menu e passaram a ser tratados como dados opcionais dentro do cadastro do cliente.
- Funções técnicas continuam disponíveis no banco, mas a navegação principal ficou mais focada no uso comercial.
- O dossiê do cliente passa a ser uma ação direta no cadastro do cliente, com opção de gerar somente cliente ou cliente + cônjuge.

## Correções e melhorias aplicadas
- Adicionada migration `0010_commercial_readiness_cleanup.sql`.
- Adicionados campos de cônjuge diretamente em `clients`.
- Adicionados campos de foto do cliente em `clients`.
- Mantida compatibilidade com `client_spouses` para ambientes que já usavam tabela separada.
- Adicionado botão para anexar foto do cliente ao cadastro.
- Adicionada geração de dossiê premium do cliente.
- Adicionada geração de dossiê com cônjuge opcional.
- Exportação de clientes passa a considerar dados do cônjuge do próprio cadastro e fallback da tabela antiga.
- Menu de clientes foi simplificado, removendo cônjuges como item separado.
- Migration adiciona RLS e constraints para tags, vínculos, cônjuge e documentos de checklist.

## Dossiê do cliente
O novo dossiê foi estruturado para uso corporativo e impressão, contendo:
- Capa/cabeçalho premium.
- Dados do cliente.
- Foto do cliente, se cadastrada.
- Dados do cônjuge quando solicitado.
- Imóveis vinculados.
- Serviços/processos.
- Checklists documentais.
- Documentos solicitados/validados.
- Documentos do cliente.
- Pendências.
- Financeiro.
- Observações.
- Área de assinatura/conferência.

## Botões corrigidos/adicionados
- Anexar foto do cliente.
- Gerar dossiê do cliente.
- Gerar dossiê cliente + cônjuge.
- Ficha do cliente mantida.
- Exportação de contato mantida.

## Riscos restantes
- Algumas telas ainda usam CRUD genérico e podem precisar de selects no lugar de UUID manual.
- O arquivo `components/nex-rural-app.tsx` ainda é grande; a refatoração completa deve ser feita em uma sprint futura.
- Upload de foto usa Storage por meio do fluxo de documentos; em produção é necessário garantir bucket e policy corretos.
- É necessário aplicar as migrations no Supabase antes de testar em produção.

## Checklist para usar com primeiras empresas
- Rodar `npm install`.
- Rodar `npm run build`.
- Aplicar migrations até `0010_commercial_readiness_cleanup.sql`.
- Conferir variáveis na Vercel.
- Confirmar Admin Master Global.
- Criar empresa piloto.
- Criar admin da empresa.
- Criar cliente.
- Anexar foto do cliente.
- Cadastrar dados opcionais do cônjuge.
- Gerar dossiê somente do cliente.
- Gerar dossiê com cônjuge.
- Criar checklist documental.
- Liberar documentos ao portal.
- Validar portal do cliente.
