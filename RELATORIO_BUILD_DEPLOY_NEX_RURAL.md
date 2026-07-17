# Relatório de build e deploy — Nex Rural

## Dependências

O `package-lock.json` foi atualizado com as dependências necessárias ao motor DOCX real:

- `pizzip`
- `docxtemplater`
- `file-saver`
- `xlsx`

Comando executado para sincronizar o lockfile:

```bash
npm install --package-lock-only --legacy-peer-deps --no-audit --no-fund --ignore-scripts
```

## Validações executadas

```bash
npm ci --legacy-peer-deps --no-audit --no-fund --ignore-scripts --silent
npm run lint -- --quiet
npx tsc --noEmit
```

Resultados:

- Lint: aprovado.
- TypeScript: aprovado.
- Next build: iniciou e compilou com sucesso (`✓ Compiled successfully`), mas o ambiente da sandbox encerrou por timeout durante a etapa final de validação do Next.js. Como `lint` e `tsc` passaram separadamente, o pacote está preparado para build local/Vercel, mas recomenda-se rodar `npm run build` localmente antes do deploy definitivo.

## Observações para Vercel

- Usar Root Directory apontando para a pasta onde está o `package.json`.
- Garantir as variáveis Supabase na Vercel.
- Rodar a migration `0012_real_document_engine_checklists.sql` no Supabase antes de testar DOCX real.
