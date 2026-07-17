# Guia de Teste Piloto - Nex Rural

## Antes de testar

Execute:

```bash
npm install
npm run lint
npm run build
npm run verify:supabase
npm run doctor
```

Inicie:

```bash
npm run dev
```

## Fluxo 1 - Admin Master Global

- [ ] Login sem codigo de empresa.
- [ ] Acessar painel global.
- [ ] Abrir modulo Empresas.
- [ ] Criar empresa piloto.
- [ ] Confirmar codigo de empresa gerado.
- [ ] Bloquear e desbloquear empresa.
- [ ] Criar Admin da Empresa.

## Fluxo 2 - Admin da Empresa

- [ ] Login com e-mail, senha e codigo da empresa.
- [ ] Confirmar que nao acessa modulo global indevido.
- [ ] Criar funcionario.
- [ ] Criar cliente.
- [ ] Criar imovel rural.
- [ ] Criar servico.
- [ ] Criar pendencia.

## Fluxo 3 - Documentos e Storage

- [ ] Fazer upload de PDF.
- [ ] Confirmar registro em `documents`.
- [ ] Confirmar arquivo no bucket `nex-rural-documents`.
- [ ] Baixar arquivo.
- [ ] Liberar no portal.
- [ ] Ocultar do portal.

## Fluxo 4 - Portal do cliente

- [ ] Gerar codigo do portal para cliente.
- [ ] Acessar `/portal`.
- [ ] Informar codigo da empresa, nome completo e codigo seguro.
- [ ] Confirmar que aparecem apenas dados do cliente.
- [ ] Enviar documento pelo portal.
- [ ] Baixar documento liberado.
- [ ] Conferir logs em `portal_access_attempts`.
- [ ] Fazer tentativas invalidas e validar rate limiting.
- [ ] Confirmar botao `Sair` limpando sessao e voltando para o acesso correto.

## Fluxo 5 - Multiempresa

Crie Empresa A e Empresa B.

- [ ] Usuario da Empresa A nao ve clientes da Empresa B.
- [ ] Usuario da Empresa B nao ve documentos da Empresa A.
- [ ] Cliente A nao ve dados do Cliente B.
- [ ] Admin Master Global ve ambas.

## Fluxo 6 - Geoprocessamento

- [ ] Criar imovel.
- [ ] Abrir Geoprocessamento.
- [ ] Importar CSV com header:

```csv
codigo,latitude,longitude,utmE,utmN,fuso,datum,altitude,confrontante,tipoLimite,observacao
M-001,-7.2012,-48.2148,790881,9203310,22S,SIRGAS 2000,0,Fazenda Norte,Cerca,Vertice 1
```

- [ ] Validar vertices apos reload.
- [ ] Exportar CSV.
- [ ] Gerar comparacao de areas.
- [ ] Criar pendencia tecnica.

## Fluxo 7 - Relatorios

- [ ] Exportar clientes em CSV.
- [ ] Exportar financeiro.
- [ ] Gerar PDF de dossie rural.
- [ ] Confirmar que relatorios usam dados da empresa logada.

## Resultado esperado

O piloto so deve seguir para cliente real se todos os fluxos essenciais forem aprovados e documentados.

## Mobile e PWA

- [ ] Abrir em 390x844 ou dispositivo real.
- [ ] Validar menu lateral, tabelas com rolagem horizontal e geoprocessamento.
- [ ] Instalar como PWA no Android/Chrome ou pelo menu de compartilhamento no iOS/Safari.
- [ ] Desconectar internet e confirmar que o shell abre; em producao, dados Supabase exigem conexao.
