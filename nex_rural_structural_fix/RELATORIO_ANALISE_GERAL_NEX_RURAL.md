# Relatorio de Analise Geral - Nex Rural

Data da analise: 2026-07-04  
Projeto analisado: `Nex Rural`  
Diretorio: `C:\Users\joaom\Documents\Codex\2026-07-03\ao\work\nex-rural-src`

## 1. Resumo executivo

O sistema esta funcional como MVP avancado e demo guiada, com boa base para um piloto controlado. A entrega atual ja possui interface completa, multiplos modulos, login demo, estrutura multiempresa, portal do cliente, geoprocessamento basico, PWA instalavel, migrations Supabase, RLS, Storage, exportacoes e rotas administrativas.

Mesmo assim, a versao analisada ainda nao deve ser considerada pronta para producao real com primeiros clientes pagantes sem uma etapa adicional de hardening e validacao em Supabase real. O principal motivo e que a validacao local foi feita em modo demo, usando `localStorage`, e o proprio `doctor` reportou `demo_mode=true` e `supabase_configured=false`. A arquitetura de backend real existe, mas precisa ser aplicada, testada e homologada em um projeto Supabase limpo.

Conclusao curta:

- Apresentacao comercial: pronto.
- Demo guiada: pronto.
- Teste interno: pronto.
- Piloto com 1 empresa: parcialmente pronto, desde que seja feito setup real do Supabase e testes E2E.
- Piloto multiempresa: parcialmente pronto, exige validacao forte de RLS e isolamento entre empresas.
- Producao real: ainda nao pronto.

## 2. Validacoes executadas

Foram executadas verificacoes de instalacao, qualidade, build, saude local e seguranca de dependencias.

| Verificacao | Resultado | Observacao |
| --- | --- | --- |
| `npm install --ignore-scripts --no-audit --no-fund --prefer-offline` | Aprovado | Dependencias instaladas/atualizadas. |
| `npm run lint` | Aprovado | Sem erros de lint. |
| `npm run build` | Aprovado | Build Next.js concluido sem erro de TypeScript. |
| `npm run doctor` | Aprovado | Arquivos principais, app, logo, migrations, manifest, service worker, icones e servidor local OK. |
| Health local | Aprovado com ressalva | Retornou `demo_mode=true` e `supabase_configured=false`. |
| `npm audit --audit-level=moderate --cache .npm-cache` | Aprovado | 0 vulnerabilidades encontradas. |

Rotas detectadas no build:

- `/`
- `/master`
- `/portal`
- `/api/admin/users`
- `/api/bootstrap/admin`
- `/api/health`
- `/api/portal/lookup`

## 3. Arquitetura geral

Stack identificada:

- Next.js App Router.
- React 18.
- TypeScript.
- Tailwind CSS.
- Supabase Auth, PostgreSQL, Storage e RLS.
- React Hook Form e Zod.
- Leaflet.
- Recharts.
- jsPDF.
- PWA com manifest e service worker.

Arquivos centrais:

- `components/nex-rural-app.tsx`: principal superficie da aplicacao, modulos, tabelas, formularios, dashboard, geoprocessamento, relatorios e acoes.
- `lib/services/base.ts`: servico generico de CRUD, documentos, Storage, auditoria e alternancia demo/Supabase.
- `lib/services/auth.ts`: login demo e login Supabase.
- `lib/env.ts`: variaveis de ambiente e controle de modo demo.
- `app/api/admin/users/route.ts`: criacao de usuarios com service role e validacao de perfil administrativo.
- `app/api/bootstrap/admin/route.ts`: bootstrap de Admin Master Global/Admin Empresa via segredo.
- `app/api/portal/lookup/route.ts`: validacao server-side do portal do cliente.
- `supabase/migrations`: schema, modulos, RLS, Storage e ajustes multiempresa.

Ponto forte: a arquitetura ja separa demo e producao, usa Supabase para backend real e tem migrations extensas.

Ponto de risco: a UI principal esta muito concentrada em `components/nex-rural-app.tsx`, o que dificulta manutencao, testes finos e evolucao por modulo.

## 4. Backend real versus modo demo

O sistema tem dois modos de operacao:

1. Modo demo:
   - Ativado por `NEXT_PUBLIC_DEMO_MODE=true`.
   - Login usa perfis simulados.
   - Dados persistem em `localStorage`.
   - Continua navegavel offline depois do primeiro carregamento.

2. Modo producao:
   - Requer `NEXT_PUBLIC_DEMO_MODE=false`.
   - Requer Supabase configurado:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `BOOTSTRAP_SECRET`
   - Login interno usa Supabase Auth.
   - CRUD usa tabelas Supabase.
   - Upload usa Supabase Storage.
   - Isolamento depende das policies RLS.

Situacao atual validada:

- A execucao local esta em modo demo.
- Supabase nao esta configurado localmente.
- Portanto, a persistencia real em banco nao foi comprovada neste ambiente.

Veredito: a estrutura backend-first existe, mas a homologacao real ainda precisa ser feita.

## 5. Banco de dados, migrations e RLS

Foram encontradas 5 migrations:

1. `0001_nex_rural_schema.sql`
2. `0002_advanced_nex_rural_modules.sql`
3. `0003_pilot_modules_aged_iterma_contracts.sql`
4. `0004_backend_first_pilot_readiness.sql`
5. `0005_multiempresa_global_geo_reports.sql`

Analise estatica das migrations:

- 59 tabelas criadas.
- RLS habilitado nas tabelas criadas.
- 101 policies identificadas.
- 4 policies relacionadas a `storage.objects`.
- Tabelas sem `company_id`: `companies` e `permissions`, aparentemente por desenho.
- As tabelas modulares expostas na UI possuem `company_id` e `updated_at`, o que combina com o CRUD generico atual.

Pontos positivos:

- Boa cobertura de RLS.
- Estrutura multiempresa bem encaminhada.
- Policies para Admin Master Global, Admin da Empresa, tecnicos e clientes.
- Storage privado previsto para documentos.

Riscos:

- As policies sao complexas e precisam de teste real com usuarios de empresas diferentes.
- Nao ha evidencia de testes automatizados de RLS.
- RLS em SQL pode estar correto estaticamente, mas so fica confiavel apos validacao em Supabase real.
- O CRUD generico depende de `updated_at`; se no futuro ele editar tabelas sem esse campo, pode falhar.

Veredito: desenho de banco bom para piloto, mas nao homologado para producao.

## 6. Autenticacao e acessos

### Admin Master Global

Existe caminho para Admin Master Global:

- Pode entrar sem codigo de empresa no modo demo.
- Em producao, o perfil depende de Supabase Auth e `user_profiles`.
- A migration inclui role `admin_master_global`.
- A API de criacao de usuarios bloqueia criacao desse perfil por usuarios que nao sejam globais.

Status: funcional em demo e bem desenhado para producao.

### Admin da Empresa e usuarios internos

Existe caminho para:

- `company_admin`
- `admin_master`
- `gestor`
- `tecnico`
- `topografo`
- `agrimensor`
- `administrativo`
- `financeiro`

Em producao, o login valida:

- email e senha pelo Supabase Auth;
- perfil em `user_profiles`;
- empresa vinculada;
- codigo da empresa para perfis nao globais;
- usuario ativo;
- empresa nao bloqueada/suspensa.

Status: bom desenho funcional, precisa E2E real.

### Portal do cliente

O portal `/portal` valida:

- codigo da empresa;
- nome completo;
- codigo seguro do cliente;
- cliente ativo;
- portal habilitado.

Risco importante: o portal usa validacao propria em `/api/portal/lookup` com service role e retorna um perfil pseudo-cliente para a UI. Nao e uma sessao Supabase Auth completa com JWT do cliente. Para piloto pode servir, mas para producao deve ser reforcado.

Melhorias recomendadas:

- Rate limiting no endpoint `/api/portal/lookup`.
- Bloqueio temporario por tentativas invalidas.
- Sessao assinada ou token curto para portal.
- Logs de tentativa de acesso.

## 7. Multiempresa

O sistema tem base multiempresa real:

- `companies`.
- `company_code` unico.
- empresas bloqueaveis.
- usuarios vinculados a empresa.
- filtros em demo por `company_id`.
- RLS para separar dados em producao.
- Admin Master Global com acesso global.
- Admin da Empresa limitado a propria empresa.

Pontos positivos:

- Existe tela de Empresas para o global.
- Existe tela de Usuarios para administradores.
- O codigo da empresa participa do login.
- O demo ja simula mais de uma empresa.

Riscos:

- A seguranca multiempresa em producao depende totalmente de RLS estar aplicada corretamente.
- Falta uma bateria automatizada de testes tentando acessar dados de outra empresa.
- O CRUD generico usa `select("*")` e confia no RLS para limitar os dados, o que e correto se as policies estiverem perfeitas.

Veredito: multiempresa esta bem encaminhado, mas precisa homologacao real antes de cliente pagante.

## 8. Modulos e funcionalidades

Foram identificados 27 modulos configurados na aplicacao:

1. Empresas
2. Usuarios
3. CRM
4. Clientes
5. Imoveis
6. Servicos
7. Checklists
8. Protocolos
9. Pendencias
10. Biblioteca
11. Conferencias
12. Cartorio
13. Certidoes
14. Due Diligence
15. Riscos DD
16. AGED
17. GTA/e-GTA
18. ITERMA
19. Contratos
20. Financeiro
21. Equipamentos
22. Templates
23. CAR
24. CCIR/SNCR
25. ITR/DITR
26. SIGEF
27. CIB/NIRF

Cada modulo usa tabelas reais ou demo equivalente e possui campos estruturados. Ha criacao, edicao, exclusao, busca, exportacao CSV, geracao PDF simples e algumas acoes por linha.

Acoes por linha identificadas:

- converter lead em cliente;
- criar checklist;
- gerar contrato;
- liberar/ocultar no portal;
- aprovar/reprovar;
- gerar PDF;
- bloquear/desbloquear empresa;
- bloquear/desbloquear usuario;
- tornar/remover Admin da Empresa;
- gerar codigo de acesso do cliente;
- criar pendencia.

Veredito: os modulos existem e muitos botoes tem comportamento real. Entretanto, parte dos fluxos ainda e generica. Para producao, cada modulo critico precisa receber validacoes de negocio mais especificas e testes de ponta a ponta.

## 9. Botoes, formularios e acoes

### O que funciona

- Botao de novo registro.
- Edicao de registro.
- Exclusao com confirmacao.
- Busca.
- Exportacao CSV.
- Exportacao Excel HTML.
- PDF simples via jsPDF.
- Upload de documentos.
- Download de documentos.
- Liberar e ocultar informacoes no portal.
- Criar checklist a partir de servico.
- Gerar contrato.
- Converter lead.
- Gerar codigo do portal.
- Bloquear usuarios e empresas.
- Promover/remover Admin da Empresa.
- Criar pendencia tecnica no geoprocessamento.

### Pontos de atencao

- Confirmacoes destrutivas usam `window.confirm`, funcional mas simples.
- Validacoes de formulario ainda sao mais estruturais do que juridicas/operacionais.
- Campos como CPF/CNPJ, CAR, CCIR, NIRF, matricula, protocolos e coordenadas precisam mascaras e validacoes reais.
- Nem todo fluxo solicitado existe como workflow completo automatizado. Exemplo: "solicitar certidao", "criar tarefa" e "abrir protocolo" podem ser feitos parcialmente por modulos, mas ainda nao sao fluxos ricos com estados, responsaveis, SLA e notificacoes.

Veredito: funcional para operacao assistida, ainda insuficiente para operacao sem acompanhamento.

## 10. Persistencia apos reload, logout e troca de usuario

Em modo demo:

- Dados ficam em `localStorage`.
- Persistem apos reload.
- Persistem apos logout no mesmo navegador.
- Podem ser perdidos ao limpar dados do navegador.
- Nao existem no servidor.

Em producao:

- Dados devem persistir no Supabase.
- Arquivos devem persistir no Supabase Storage.
- Sessao deve persistir pelo Supabase Auth.
- Auditoria deve ir para `audit_logs`.

Risco atual:

- Como o Supabase nao esta configurado no ambiente validado, a persistencia real pos-login/pos-logout nao foi comprovada.

Veredito: persistencia demo comprovada; persistencia real desenhada, mas pendente de homologacao.

## 11. Documentos e Storage

O sistema suporta:

- upload de documentos;
- metadados de documento;
- download;
- exclusao logica/arquivamento;
- auditoria;
- Storage Supabase no bucket `nex-rural-documents`;
- signed URL para download em producao;
- data URL em demo.

Riscos:

- Bucket e policies precisam ser criados e testados no Supabase real.
- Upload/download com arquivos grandes nao foi validado.
- Nao ha antivirus, OCR, classificacao automatica ou versionamento completo na UI.

Veredito: bom para piloto, precisa teste real de Storage antes de cliente.

## 12. Geoprocessamento

O modulo de geoprocessamento existe e e uma das partes mais importantes do sistema.

Funcionalidades presentes:

- Central Tecnica do Imovel Rural.
- Abas para visao geral, mapa, importacao, vertices, confrontantes, arquivos, comparacao, conferencias e relatorios.
- Mapa Leaflet com OpenStreetMap.
- Poligono e marcadores de vertices.
- Importacao CSV de coordenadas.
- Calculo aproximado de area e perimetro.
- Registro de arquivos tecnicos.
- Aceite de formatos CSV, GeoJSON, KML, KMZ, ZIP/SHP, DXF, DWG e PDF como arquivo tecnico.
- Comparacao de areas.
- Criacao de pendencia tecnica.
- Historico em `technical_area_comparisons`, `reports` e `report_exports`.
- Exportacao PDF/CSV/Excel.

Limite importante:

- GeoJSON, KML, KMZ, SHP, DXF e DWG sao aceitos como arquivos tecnicos, mas nao ha evidencia de parse real desses formatos para gerar geometria automaticamente.
- O parse real implementado e de CSV.
- Area e perimetro sao aproximados, nao substituem motor geodesico profissional.

O que falta para geoprocessamento premium:

- Parser real de GeoJSON.
- Parser real de KML/KMZ.
- Parser real de SHP ZIP.
- Conversao/projecao com SIRGAS 2000, UTM e datum.
- Calculo geodesico robusto com biblioteca GIS.
- Validacao topologica.
- Deteccao de sobreposicao.
- Conferencia automatizada com dados oficiais, quando houver integracoes.
- Relatorio tecnico com memorial descritivo completo.

Veredito: geoprocessamento funcional para MVP e demonstracao, mas parcial para uso tecnico profissional.

## 13. Relatorios

O sistema possui:

- relatorios por tabela;
- exportacao PDF via jsPDF;
- exportacao CSV;
- exportacao Excel HTML;
- dossie rural basico;
- historico de relatorios no modulo de geoprocessamento.

Limites:

- PDFs sao simples e tabulares.
- Nao ha layout premium finalizado para cliente.
- Nao ha assinatura, capa institucional, sumario tecnico completo ou anexos automaticos.
- Nao ha geracao server-side robusta.

Veredito: suficiente para demo e auditoria interna; ainda fraco para entrega premium ao cliente final.

## 14. Due Diligence

O sistema possui:

- casos de due diligence;
- riscos de due diligence;
- matriz basica de risco;
- relatorios simples;
- relacionamento com cliente/imovel.

Limites:

- O fluxo ainda nao parece ser uma esteira completa de due diligence rural.
- Faltam checklists juridicos e tecnicos mais profundos.
- Faltam etapas, responsaveis, pareceres, evidencias, anexos obrigatorios e conclusao formal.
- Falta relatorio final premium.

Veredito: modulo inicial funcional, mas ainda nao e uma due diligence completa de escritorio rural.

## 15. Cartorio, TJMA, AGED/MA, ITERMA e orgaos

Ha modulos especificos para:

- cartorio;
- certidoes;
- conferencias oficiais;
- AGED;
- GTA/e-GTA;
- ITERMA;
- CAR;
- CCIR/SNCR;
- ITR/DITR;
- SIGEF;
- CIB/NIRF.

Pontos positivos:

- O sistema mapeia bem o universo operacional rural.
- Existem tabelas e formularios para registrar dados.
- Ha possibilidade de anexar documentos e gerar relatorios.

Limites:

- Nao foram encontradas integracoes reais com sistemas oficiais.
- Nao ha automacao real de consulta em TJMA, AGED, ITERMA ou cartorios.
- Os modulos funcionam como controle interno estruturado, nao como integrador oficial.

Veredito: bom para organizacao operacional; nao e automacao oficial ponta a ponta.

## 16. Portal do cliente

O portal do cliente entrega:

- acesso separado em `/portal`;
- validacao por codigo da empresa, nome e codigo seguro;
- visibilidade controlada por flags como `visible_on_portal`;
- acesso a documentos, pendencias, contratos e dados liberados.

Pontos positivos:

- Bom para demonstrar transparencia ao cliente.
- Simples de operar.
- Evita expor o painel administrativo.

Riscos:

- Falta rate limiting.
- Falta sessao assinada mais forte.
- Falta expiracao de token/codigo.
- Falta recuperacao segura de acesso.
- Falta trilha detalhada de acessos do cliente.

Veredito: util para piloto controlado; precisa reforco de seguranca para producao.

## 17. Mobile, PWA e instalacao do app

O app possui:

- `public/manifest.webmanifest`;
- `public/sw.js`;
- icones PWA 192x192 e 512x512;
- registro automatico de service worker;
- botao de instalacao quando o navegador dispara `beforeinstallprompt`;
- indicador de status offline;
- layout responsivo com menu lateral mobile;
- geoprocessamento ajustado para viewport pequeno.

Como instalar:

- Android/Chrome: usar o botao "Instalar app" quando aparecer ou a opcao do navegador.
- iPhone/iPad: Safari, menu compartilhar, "Adicionar a Tela de Inicio".

Offline:

- A interface e assets principais podem ficar em cache apos o primeiro acesso.
- Em modo demo, os dados ficam em `localStorage`, entao a navegacao continua funcionando offline.
- Em producao, consultas, gravacoes, login real e uploads dependem de internet.
- Nao existe fila de sincronizacao offline para operacoes pendentes.

Veredito: app instalavel como PWA, mas offline real de producao ainda e parcial.

## 18. UX, UI e ajuste mobile

Pontos fortes:

- Interface ampla e coerente para sistema operacional rural.
- Dashboard, modulos, tabelas, filtros e acoes estao presentes.
- Menu responsivo.
- PWA bem sinalizado.
- Geoprocessamento visualmente utilizavel.

Pontos de melhoria:

- Tabelas extensas em mobile podem exigir tratamento mais especifico por modulo.
- Alguns formularios podem ficar longos para celular.
- Falta teste manual completo de todos os modais e acoes em telas pequenas.
- O arquivo principal da UI e grande, o que aumenta risco de regressao em mudancas futuras.

Veredito: bom para uso assistido; precisa refinamento de ergonomia para uso diario pesado no celular.

## 19. Seguranca

Pontos positivos:

- RLS foi considerada desde o desenho.
- Supabase Auth previsto para usuarios internos.
- Service role fica apenas em rotas server-side.
- API de criacao de usuario valida Bearer token e permissao do ator.
- Bootstrap exige `BOOTSTRAP_SECRET`.
- Empresas e usuarios podem ser bloqueados.

Riscos:

- Portal publico sem rate limiting.
- Bootstrap deve ser protegido com segredo forte e preferencialmente desabilitado apos provisionamento inicial.
- Falta evidencia de testes de permissao automatizados.
- Falta hardening de headers, logs e monitoramento.
- Falta validacao real de isolamento multiempresa.

Veredito: bom desenho inicial, precisa hardening antes de producao.

## 20. Bugs, riscos e melhorias encontradas

### Criticos antes de producao

1. Ambiente validado esta em modo demo, sem Supabase configurado.
2. Falta homologar migrations em projeto Supabase limpo.
3. Falta testar RLS com usuarios reais de empresas diferentes.
4. Falta E2E de login, CRUD, portal, Storage e multiempresa.
5. Portal do cliente precisa rate limiting e sessao mais robusta.
6. Offline de producao nao sincroniza dados.

### Altos para piloto

1. Geoprocessamento aceita muitos formatos, mas parse real completo so esta evidente para CSV.
2. Relatorios PDF ainda sao basicos.
3. Due diligence ainda e modulo inicial, nao workflow completo.
4. Form validation precisa regras especificas de negocio.
5. Upload/download real no Supabase Storage precisa ser testado com arquivos reais.
6. Fluxos de usuario, reset de senha, convite e provisionamento precisam validacao real.

### Medios

1. UI principal concentrada em arquivo grande.
2. Confirmacoes usam `window.confirm`.
3. Tabelas mobile podem melhorar em uso intensivo.
4. Falta cobertura automatizada de testes.
5. Alguns modulos sao cadastros estruturados, nao automacoes completas.

## 21. Pontuacao por area

Notas de 0 a 10:

| Area | Nota | Comentario |
| --- | ---: | --- |
| Arquitetura geral | 7.5 | Boa base, mas UI monolitica. |
| Autenticacao | 6.5 | Boa em desenho, demo validado, producao pendente. |
| Banco e migrations | 8.0 | Amplo e bem modelado. |
| RLS e seguranca | 7.0 | Boa cobertura, precisa teste real. |
| Multiempresa | 7.5 | Conceito bem implementado, falta homologacao. |
| Usuarios e permissoes | 6.5 | Roles existem, permissao granular precisa evoluir. |
| Clientes | 7.0 | Cadastro e portal encaminhados. |
| Imoveis | 7.0 | Estrutura boa. |
| Documentos e Storage | 6.5 | Funcional, mas Storage real pendente. |
| Geoprocessamento | 6.0 | Bom MVP, parcial para uso tecnico premium. |
| Cartorio/TJMA | 5.5 | Controle interno, sem integracao oficial. |
| AGED/MA | 5.5 | Registro interno, sem automacao oficial. |
| ITERMA | 5.5 | Registro interno, sem integracao oficial. |
| Due Diligence | 5.5 | Base inicial, workflow incompleto. |
| Relatorios | 5.0 | Exportacoes existem, qualidade premium pendente. |
| Portal Cliente | 6.5 | Funcional para piloto, seguranca precisa reforco. |
| UX/UI | 7.5 | Boa apresentacao e operabilidade. |
| Persistencia | 6.0 | Demo comprovada, Supabase real pendente. |
| Botoes/CRUD | 7.0 | Muitas acoes funcionam, fluxos ricos pendentes. |
| Pronto para piloto | 6.5 | Sim, com restricoes e setup real. |
| Pronto para producao | 4.5 | Ainda nao. |

Nota geral para MVP/piloto controlado: 6.8/10.  
Nota geral para producao real hoje: 4.8/10.

## 22. Pronto para primeiros clientes?

Resposta objetiva: ainda nao para clientes pagantes em producao aberta. Sim para demonstracao, validacao comercial e piloto controlado com uma empresa parceira, desde que o ambiente seja configurado em Supabase real e os riscos sejam assumidos.

Checklist minimo antes do primeiro cliente real:

- Criar projeto Supabase real.
- Rodar todas as migrations em ordem.
- Configurar variaveis de ambiente com `NEXT_PUBLIC_DEMO_MODE=false`.
- Criar Admin Master Global via bootstrap.
- Criar primeira empresa piloto e Admin da Empresa.
- Validar login real dos perfis.
- Validar CRUD real em pelo menos 5 modulos criticos.
- Validar isolamento entre 2 empresas.
- Validar portal do cliente.
- Validar upload/download no Storage.
- Validar relatorios.
- Validar mobile em Android e iOS.
- Definir backup, dominio, SSL, monitoramento e politica de suporte.

## 23. Prioridades recomendadas

### Prioridade 1 - Bloqueadores de producao

1. Configurar Supabase real e rodar migrations em ambiente limpo.
2. Criar script de seed/provisionamento controlado.
3. Validar RLS com matriz de usuarios e empresas.
4. Criar testes E2E para login, CRUD, portal e Storage.
5. Reforcar `/api/portal/lookup` com rate limiting, logs e sessao assinada.
6. Desativar modo demo em producao.
7. Testar deploy Vercel com variaveis reais.

### Prioridade 2 - Piloto operacional

1. Melhorar validacoes de CPF/CNPJ, CAR, CCIR, NIRF, protocolos e datas.
2. Testar upload/download de documentos grandes.
3. Melhorar PDFs de relatorio e dossie.
4. Criar fluxo de convite/reset de senha.
5. Criar testes manuais guiados por modulo.
6. Melhorar tabelas e formularios em mobile.

### Prioridade 3 - Produto premium

1. Parser real de GeoJSON, KML/KMZ e SHP ZIP.
2. Calculo geodesico profissional.
3. Workflow completo de due diligence.
4. Relatorio tecnico premium com anexos.
5. Permissoes granulares editaveis pela UI.
6. Notificacoes e tarefas com responsaveis, prazo e SLA.

### Prioridade 4 - Evolucao futura

1. Sincronizacao offline real com fila local e resolucao de conflitos.
2. App nativo via wrapper ou lojas.
3. Integracoes oficiais quando juridica e tecnicamente viaveis.
4. Assinatura digital, webhooks, e-mail transacional e automacoes.

## 24. Veredito final

O Nex Rural esta acima de um prototipo visual. Ele ja tem estrutura de SaaS rural, multiempresa, modulos amplos, portal, geoprocessamento inicial, documentos, PWA e base Supabase.

Mas a validacao feita ate aqui confirma principalmente o modo demo e a integridade de build. Para entregar aos primeiros clientes com seguranca, o proximo passo nao deve ser adicionar mais modulos. O proximo passo deve ser transformar a base existente em ambiente real homologado: Supabase configurado, migrations aplicadas, RLS testado, Storage validado, portal protegido e testes E2E cobrindo os fluxos principais.

Minha recomendacao: tratar a versao atual como "release candidata para piloto interno" e executar uma sprint curta de hardening para "release piloto real".

## 25. Prompt recomendado para o proximo Codex

Use este prompt para a proxima etapa:

```text
Atue como desenvolvedor senior full-stack e engenheiro de produto. Pegue o projeto Nex Rural atual e execute uma sprint de hardening para transformar a release candidata em piloto real com Supabase.

Objetivo:
- Nao adicionar novos modulos grandes.
- Validar e corrigir o que impede uso real com a primeira empresa piloto.

Tarefas obrigatorias:
1. Configurar o projeto para modo producao com Supabase real, mantendo modo demo separado.
2. Revisar todas as migrations e criar um guia de aplicacao em ambiente limpo.
3. Criar seed/bootstrap seguro para Admin Master Global e primeira empresa.
4. Criar testes E2E ou scripts de verificacao para:
   - Admin Master Global;
   - Admin da Empresa;
   - tecnico/gestor;
   - cliente no portal;
   - isolamento entre duas empresas;
   - CRUD de clientes, imoveis, documentos, pendencias e financeiro;
   - upload/download no Storage.
5. Reforcar o portal do cliente com rate limiting, logs e sessao/token mais seguro.
6. Validar e corrigir Storage, RLS e permissoes.
7. Melhorar validacoes basicas de formulario para campos rurais criticos.
8. Entregar um relatorio final com:
   - o que foi corrigido;
   - o que foi testado;
   - evidencias;
   - riscos restantes;
   - checklist para colocar o primeiro cliente real.

Ao final, gere um zip completo pronto para deploy piloto e informe exatamente como rodar, configurar e validar.
```

