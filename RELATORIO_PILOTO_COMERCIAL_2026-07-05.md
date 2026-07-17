# Relatorio Piloto Comercial - Nex Rural

Data: 2026-07-05

## Escopo executado

- Login interno separado por Admin Master, Empresa e Cliente.
- Cliente direcionado para `/portal`, sem autenticar no painel interno.
- Logout robusto com limpeza local, redirecionamento e tolerancia a erro de auditoria.
- Refresh tolerante: cada tabela carrega de forma independente.
- Portal com estados de erro visiveis, botao de retorno e dados liberados de documentos, pendencias, financeiro, relatorios e certidoes.
- Criacao de usuarios via API protegida por JWT Supabase.
- Matricula numerica padrao `3272026` no bootstrap e nos guias.
- Logo SVG oficial em `public/nex-rural-logo.svg`.
- UX com cards premium, animacoes leves, estados vazios e controles com loading.
- Exportacoes PDF e Excel com cabecalho, resumo e formatacao melhorada.
- Migração `0007_emergency_pilot_fixes.sql` para policies por texto, indices e saneamento de matricula legada.
- PWA atualizado para cachear shell, logo SVG, manifest e icones.

## Veredito tecnico

O projeto esta pronto para rodar localmente, subir para GitHub/Vercel e iniciar testes comerciais controlados. Para o primeiro cliente real, ainda e obrigatorio aplicar migrations em um Supabase real, configurar variaveis de ambiente e validar RLS com pelo menos duas empresas.

## Evidencias executadas

- `npm install --ignore-scripts --no-audit --no-fund --prefer-offline`: aprovado.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.
- `npm run doctor`: aprovado com health local HTTP 200.
- `npm audit --audit-level=moderate --cache .npm-cache`: aprovado com 0 vulnerabilidades.
- `npm run test:pilot`: aprovado para paginas principais e assets PWA.

## Pontos validados por codigo

- `.env.example` nao contem chave real.
- `SUPABASE_SERVICE_ROLE_KEY` fica apenas em rotas/scripts server-side.
- `NEXT_PUBLIC_DEMO_MODE=false` exige Supabase configurado.
- `current_user_role_text()` e usado na policy nova de tentativas do portal.
- `deleted_at` e `updated_at` sao usados apenas em tabelas conhecidas pelos servicos base.
- Portal opera por token curto server-side, nao por service role no navegador.

## Limitacoes conscientes

- Offline de producao e parcial: o shell do app abre sem internet, mas gravacoes, uploads e consultas reais dependem do Supabase online.
- Geoprocessamento ja possui mapa, vertices, CSV, arquivos tecnicos e comparacao de areas, mas parser nativo de SHP/DXF/DWG/KMZ ainda deve ser evoluido para uma fase posterior.
- Middleware adiciona headers e classificacao de area; a protecao principal ainda esta em Supabase Auth, rotas server-side e RLS.

## Checklist antes do teste comercial

1. Aplicar migrations `0001` a `0007`.
2. Configurar `.env.local` e variaveis da Vercel.
3. Rodar `npm run verify:supabase`.
4. Rodar `npm run bootstrap:admin`.
5. Validar login Admin Master Global.
6. Criar duas empresas e validar isolamento.
7. Criar usuario interno por equipe.
8. Criar cliente e codigo do portal.
9. Validar upload/download de documentos.
10. Executar `GUIA_TESTE_PILOTO.md`.
