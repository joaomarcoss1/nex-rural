# Relatorio Tecnico - Nex Rural Multiempresa

Data da validacao: 2026-07-05

## Entrega

Sistema Nex Rural atualizado para operacao SaaS multiempresa, com separacao por empresa, Admin Master Global, Admin da Empresa, usuarios internos, portal do cliente e geoprocessamento premium.

## Principais melhorias

- Admin Master Global para `joaomarcosgpp@hotmail.com`, sem exigencia de codigo de empresa.
- Admin da Empresa com login por e-mail, senha e `company_code`.
- Codigo de empresa unico com geracao por sequencia + ano, exemplo `3272026`.
- Tela `Empresas` exclusiva do Admin Master Global.
- Tela `Usuarios` para Admin Master Global, Admin da Empresa e Admin Master legado.
- Bloqueio/reativacao de empresa e usuario.
- Promocao/remocao de Admin da Empresa.
- Portal `/portal` com codigo da empresa, nome completo e codigo seguro do cliente.
- Middleware ajustado para permitir portal publico com validacao propria.
- Endpoint `/api/portal/lookup` para validacao server-side do portal no Supabase.
- Endpoint `/api/admin/users` protegido por JWT Supabase e checagem de permissao.
- Migration `0005_multiempresa_global_geo_reports.sql` com novos perfis, colunas, tabelas, policies e storage global.
- Migration `0007_emergency_pilot_fixes.sql` com reforco de policies por texto, matricula numerica, indices e funcoes de seguranca.
- Logout tolerante a falha de auditoria/Supabase e refresh tabela a tabela.
- Login com tres acessos separados: Admin Master, Empresa e Cliente.
- Logo SVG oficial com fallback PNG.
- Exportacoes PDF/Excel com cabecalho e resumo mais profissionais.
- PWA instalavel com manifesto, icones, service worker, cache de shell e botao de instalacao.
- Ajustes mobile com menu lateral responsivo, cards empilhados e geoprocessamento sem overflow horizontal.

## Geoprocessamento

A Central Tecnica do Imovel Rural possui abas funcionais:

- Visao Geral Tecnica
- Mapa Leaflet com poligono, vertices e fallback offline
- Importar Coordenadas
- Vertices
- Confrontantes
- Arquivos Tecnicos
- Comparacao de Areas
- Conferencias Oficiais
- Relatorios

Funcoes implementadas:

- Importacao CSV de vertices.
- Registro de arquivos KML, KMZ, GeoJSON, CSV, SHP ZIP, DXF, DWG e PDF.
- Calculo aproximado de area e perimetro.
- Salvamento de comparacao tecnica em `technical_area_comparisons`.
- Abertura de pendencia tecnica a partir da comparacao.
- Dossie tecnico em PDF e historico em `reports` e `report_exports`.

## Credenciais demo

Senha de todos os perfis demo: `nexrural`.

- Admin Master Global: `joaomarcosgpp@hotmail.com`, sem codigo.
- Admin Empresa 327: `admin327@nexrural.local`, codigo `3272026`.
- Admin Empresa 328: `admin328@nexrural.local`, codigo `3282026`.
- Gestor: `gestor@nexrural.local`, codigo `3272026`.
- Tecnico: `tecnico@nexrural.local`, codigo `3272026`.
- Portal cliente: empresa `3272026`, nome `Joao Ferreira da Silva`, codigo `2201`.

## Validacoes executadas

- `npm run lint`: aprovado.
- `npm run build`: aprovado.
- `npm run doctor`: aprovado para arquivos principais, migrations, manifesto PWA, service worker e icones.
- `npm audit --audit-level=moderate --cache .npm-cache`: 0 vulnerabilidades.
- `npm run test:pilot`: aprovado para paginas, health, manifest, service worker e logo SVG.
- Browser local em `http://127.0.0.1:3000`: aprovado.
- Login Admin Master Global: aprovado.
- Tela Empresas com matriculas numericas como `3272026` e `3282026`: aprovado.
- Login Admin da Empresa `3272026`: aprovado, sem acesso ao modulo Empresas e com acesso a Usuarios.
- Portal do cliente por codigo/nome/codigo seguro: aprovado.
- Geoprocessamento com abas e mapa Leaflet: aprovado.
- Mobile 390x844: dashboard, menu lateral e geoprocessamento aprovados sem overflow horizontal da pagina.
- PWA: `/manifest.webmanifest` e `/sw.js` servidos com status HTTP 200.

## Mobile e offline

O app pode ser instalado como PWA em navegadores compativeis. No Android/Chrome, o botao `Instalar app` aparece quando o navegador dispara o evento de instalacao. No iOS/Safari, a instalacao e feita pelo menu de compartilhamento do Safari.

O offline e parcial e seguro:

- interface, rotas principais e assets ficam em cache apos o primeiro acesso;
- modo demo continua navegavel usando `localStorage`;
- em producao, consultas e gravacoes no Supabase exigem conexao;
- nao ha fila de sincronizacao offline de cadastros ou uploads nesta versao.

## Rotas relevantes

- `/`: painel interno.
- `/master`: area global do Admin Master Global.
- `/portal`: portal do cliente.
- `/api/bootstrap/admin`: bootstrap inicial protegido por `BOOTSTRAP_SECRET`.
- `/api/admin/users`: criacao de usuarios protegida por JWT de administrador.
- `/api/portal/lookup`: validacao do portal do cliente.

## Observacoes para producao

- Rodar todas as migrations em ordem ate `0007`.
- Configurar `NEXT_PUBLIC_DEMO_MODE=false`.
- Configurar Supabase URL, anon key, service role key e `BOOTSTRAP_SECRET`.
- Criar o Admin Master Global via `/api/bootstrap/admin`.
- Criar empresas e admins pelo modulo `Empresas`/bootstrap.
- Revisar politicas de backup, dominio, e-mail transacional e storage antes do piloto pago.
- Para offline completo em producao, implementar fila local criptografada, resolucao de conflitos e sincronizacao quando voltar a conexao.
