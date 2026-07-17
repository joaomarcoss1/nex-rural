# Checklist Primeiro Cliente Real - Nex Rural

## Infraestrutura

- [ ] Projeto Supabase criado.
- [ ] Projeto Vercel criado.
- [ ] Dominio definido, se houver.
- [ ] Variaveis configuradas localmente.
- [ ] Variaveis configuradas na Vercel.
- [ ] `NEXT_PUBLIC_DEMO_MODE=false`.
- [ ] Chaves reais fora do GitHub.

## Banco e seguranca

- [ ] Migrations 0001 a 0007 aplicadas.
- [ ] Bucket `nex-rural-documents` privado criado.
- [ ] `npm run verify:supabase` aprovado.
- [ ] RLS validada com duas empresas.
- [ ] Portal com rate limiting testado.
- [ ] `BOOTSTRAP_DISABLED=true` apos bootstrap.
- [ ] Backup definido no Supabase.

## Usuarios

- [ ] Admin Master Global criado.
- [ ] Empresa piloto criada.
- [ ] Codigo de empresa gerado.
- [ ] Admin da Empresa criado.
- [ ] Funcionario criado.
- [ ] Login com codigo testado.
- [ ] Empresa bloqueada testada.
- [ ] Usuario bloqueado testado.

## Operacao

- [ ] Cliente criado.
- [ ] Imovel criado.
- [ ] Servico criado.
- [ ] Checklist gerado.
- [ ] Pendencia criada.
- [ ] Documento enviado.
- [ ] Documento salvo no Storage.
- [ ] Documento liberado no portal.
- [ ] Portal do cliente testado.
- [ ] Relatorio gerado.
- [ ] Financeiro registrado.

## Mobile e PWA

- [ ] Android/Chrome testado.
- [ ] iPhone/Safari testado.
- [ ] Instalar app testado.
- [ ] Offline parcial entendido pela equipe.
- [ ] Equipe ciente de que producao ainda nao sincroniza cadastros/uploads offline.

## Go-live piloto

- [ ] Responsavel de suporte definido.
- [ ] Procedimento de backup validado.
- [ ] Dados iniciais revisados.
- [ ] Cliente avisado que e piloto controlado.
- [ ] Riscos restantes aceitos.
