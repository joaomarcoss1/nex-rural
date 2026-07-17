-- Nex Rural - UI, modelos, checklists e dossie profissional.
-- Migration segura: nao apaga dados, apenas garante colunas e sementes operacionais.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

alter table if exists public.clients add column if not exists photo_url text;
alter table if exists public.clients add column if not exists photo_storage_path text;
alter table if exists public.clients add column if not exists has_spouse boolean not null default false;
alter table if exists public.clients add column if not exists marital_status text;
alter table if exists public.clients add column if not exists marriage_regime text;
alter table if exists public.clients add column if not exists spouse_full_name text;
alter table if exists public.clients add column if not exists spouse_cpf text;
alter table if exists public.clients add column if not exists spouse_rg text;
alter table if exists public.clients add column if not exists spouse_issuing_agency text;
alter table if exists public.clients add column if not exists spouse_birth_date date;
alter table if exists public.clients add column if not exists spouse_nationality text;
alter table if exists public.clients add column if not exists spouse_profession text;
alter table if exists public.clients add column if not exists spouse_phone text;
alter table if exists public.clients add column if not exists spouse_whatsapp text;
alter table if exists public.clients add column if not exists spouse_email text;
alter table if exists public.clients add column if not exists spouse_address text;
alter table if exists public.clients add column if not exists spouse_notes text;
alter table if exists public.clients add column if not exists notes_public text;
alter table if exists public.clients add column if not exists notes_private text;
alter table if exists public.clients add column if not exists tags_summary text;

create table if not exists public.document_templates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  type text,
  category text,
  description text,
  body text,
  variables jsonb not null default '[]'::jsonb,
  version text default '1.0',
  active boolean not null default true,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.document_templates add column if not exists body text;
alter table public.document_templates add column if not exists variables jsonb not null default '[]'::jsonb;
alter table public.document_templates add column if not exists description text;
alter table public.document_templates add column if not exists version text default '1.0';
alter table public.document_templates add column if not exists deleted_at timestamptz;

update public.document_templates
set body = coalesce(nullif(body, ''), description, 'Modelo operacional editavel. Revise conforme cartorio, orgao, municipio, UF e situacao do imovel.')
where body is null or trim(body) = '';

-- Garante colunas de visibilidade usadas no app.
alter table if exists public.documents add column if not exists visible_on_portal boolean not null default false;
alter table if exists public.documents add column if not exists visible_to_client boolean not null default false;
alter table if exists public.generated_checklists add column if not exists visible_on_portal boolean not null default false;
alter table if exists public.generated_checklists add column if not exists visible_to_client boolean not null default false;
alter table if exists public.generated_checklist_items add column if not exists visible_to_client boolean not null default true;
alter table if exists public.generated_checklist_items add column if not exists visible_on_portal boolean not null default true;
alter table if exists public.checklist_item_documents add column if not exists visible_to_client boolean not null default true;
alter table if exists public.checklist_item_documents add column if not exists visible_on_portal boolean not null default true;

-- Bucket opcional para fotos de clientes. Se ja existir, nao altera.
insert into storage.buckets (id, name, public)
values ('client-photos', 'client-photos', true)
on conflict (id) do nothing;

-- Modelos documentais completos e editaveis por empresa.
do $$
declare
  c record;
begin
  for c in select id from public.companies loop
    insert into public.document_templates(company_id, name, type, category, description, body, variables, active)
    select c.id, x.name, x.type, x.category, x.description, x.body, x.variables, true
    from (values
      ('Declaração de posse rural','Declaração','Rural','Modelo operacional editável para declaração de posse rural.','Eu, {{cliente_nome}}, inscrito(a) no CPF/CNPJ nº {{cliente_cpf}}, declaro, para fins administrativos e documentais, exercer posse mansa e pacífica sobre o imóvel rural denominado {{imovel_nome}}, localizado no município de {{municipio}}, com área aproximada de {{area_total}}. Declaro que as informações prestadas são verdadeiras e assumo responsabilidade por sua veracidade.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}', jsonb_build_array('cliente_nome','cliente_cpf','imovel_nome','municipio','area_total','data_atual')),
      ('Declaração de residência rural','Declaração','Cliente','Modelo para declaração de residência em zona rural.','Eu, {{cliente_nome}}, CPF/CNPJ nº {{cliente_cpf}}, declaro residir no endereço rural vinculado ao imóvel {{imovel_nome}}, situado em {{municipio}}. A presente declaração é emitida para fins de instrução documental.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}', jsonb_build_array('cliente_nome','cliente_cpf','imovel_nome','municipio','data_atual')),
      ('Declaração de atividade rural','Declaração','Rural','Declaração operacional de exercício de atividade rural.','Eu, {{cliente_nome}}, CPF/CNPJ nº {{cliente_cpf}}, declaro exercer atividade rural no imóvel {{imovel_nome}}, situado em {{municipio}}, desenvolvendo atividades compatíveis com a finalidade rural da propriedade/posse.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}', jsonb_build_array('cliente_nome','cliente_cpf','imovel_nome','municipio','data_atual')),
      ('Declaração de confrontantes','Declaração','Cartório','Modelo para registrar ciência/identificação de confrontantes.','Declaramos, para fins de instrução documental do imóvel {{imovel_nome}}, matrícula/cadastro {{matricula}}, localizado em {{municipio}}, que os confrontantes relacionados foram informados para conferência dos limites do imóvel. Este modelo deve ser revisado conforme exigência do cartório ou órgão competente.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\nResponsável pela conferência', jsonb_build_array('imovel_nome','matricula','municipio','data_atual')),
      ('Declaração de anuência de confrontantes','Declaração','Cartório','Modelo operacional para anuência de confrontantes.','Eu, abaixo assinado, na qualidade de confrontante do imóvel {{imovel_nome}}, localizado em {{municipio}}, declaro ciência dos limites informados e, quando aplicável, anuência para fins de regularização, retificação, georreferenciamento ou procedimento correlato.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\nConfrontante', jsonb_build_array('imovel_nome','municipio','data_atual')),
      ('Autorização para protocolo','Autorização','Cliente','Autorização para empresa protocolar ou acompanhar procedimento.','Eu, {{cliente_nome}}, CPF/CNPJ nº {{cliente_cpf}}, autorizo {{company_name}} a protocolar, acompanhar, retirar exigências e apresentar documentos relacionados ao procedimento {{servico_tipo}}, referente ao imóvel {{imovel_nome}}.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}', jsonb_build_array('cliente_nome','cliente_cpf','company_name','servico_tipo','imovel_nome','municipio','data_atual')),
      ('Procuração simples para acompanhamento administrativo','Procuração','Cliente','Modelo simples para acompanhamento administrativo, sem substituir procuração pública quando exigida.','Por este instrumento particular, {{cliente_nome}}, CPF/CNPJ nº {{cliente_cpf}}, autoriza {{company_name}} a acompanhar administrativamente o procedimento {{servico_tipo}}, solicitar informações, apresentar documentos e receber comunicações, quando aceito pelo órgão ou serventia competente.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}', jsonb_build_array('cliente_nome','cliente_cpf','company_name','servico_tipo','municipio','data_atual')),
      ('Requerimento de averbação','Requerimento','Cartório','Requerimento operacional para averbação em matrícula.','Ao Cartório competente,\n\n{{cliente_nome}}, CPF/CNPJ nº {{cliente_cpf}}, vem requerer a averbação referente ao imóvel de matrícula {{matricula}}, localizado em {{municipio}}, conforme documentos anexos e orientações da serventia.\n\nTermos em que pede deferimento.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}', jsonb_build_array('cliente_nome','cliente_cpf','matricula','municipio','data_atual')),
      ('Requerimento de retificação de matrícula','Requerimento','Cartório','Requerimento operacional para retificação de dados ou área.','Ao Cartório competente,\n\n{{cliente_nome}}, CPF/CNPJ nº {{cliente_cpf}}, requer a análise de retificação da matrícula {{matricula}}, referente ao imóvel {{imovel_nome}}, conforme documentos técnicos, declarações e peças anexas.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}', jsonb_build_array('cliente_nome','cliente_cpf','matricula','imovel_nome','municipio','data_atual')),
      ('Requerimento para certidão de inteiro teor','Requerimento','Cartório','Requerimento para solicitação de certidão de inteiro teor.','Ao Cartório competente,\n\nSolicita-se a emissão de certidão de inteiro teor referente à matrícula {{matricula}}, vinculada ao imóvel {{imovel_nome}}, para fins de instrução do procedimento {{servico_tipo}}.\n\n{{municipio}}, {{data_atual}}.', jsonb_build_array('matricula','imovel_nome','servico_tipo','municipio','data_atual')),
      ('Termo de entrega de documentos','Termo','Cliente','Termo profissional para recebimento de documentos do cliente.','TERMO DE ENTREGA DE DOCUMENTOS\n\nEmpresa: {{company_name}}\nCliente: {{cliente_nome}}\nCPF/CNPJ: {{cliente_cpf}}\nServiço/Procedimento: {{servico_tipo}}\nData: {{data_atual}}\n\nDeclaramos que foram recebidos os documentos relacionados para fins de análise, organização e acompanhamento do procedimento solicitado.\n\nAssinaturas:\n\n__________________________________\nResponsável pelo recebimento\n\n__________________________________\nCliente/Representante', jsonb_build_array('company_name','cliente_nome','cliente_cpf','servico_tipo','data_atual')),
      ('Termo de ciência de pendências','Termo','Documento','Termo para ciência de pendências documentais.','Eu, {{cliente_nome}}, CPF/CNPJ nº {{cliente_cpf}}, declaro estar ciente das pendências documentais relacionadas ao procedimento {{servico_tipo}}, comprometendo-me a providenciar as informações ou documentos necessários para continuidade do atendimento.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}', jsonb_build_array('cliente_nome','cliente_cpf','servico_tipo','municipio','data_atual')),
      ('Recibo de entrega de documentos ao cliente','Recibo','Cliente','Recibo para entrega/devolução de documentos ao cliente.','RECIBO\n\nRecebi de {{company_name}} os documentos relacionados ao procedimento {{servico_tipo}}, referente ao cliente {{cliente_nome}} e ao imóvel {{imovel_nome}}.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\nCliente/Representante', jsonb_build_array('company_name','servico_tipo','cliente_nome','imovel_nome','municipio','data_atual')),
      ('Declaração de responsabilidade pelas informações','Declaração','Cliente','Declaração de responsabilidade pelas informações fornecidas.','Eu, {{cliente_nome}}, CPF/CNPJ nº {{cliente_cpf}}, declaro que as informações e documentos apresentados para o procedimento {{servico_tipo}} são verdadeiros, responsabilizando-me por sua origem, autenticidade e atualização.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}', jsonb_build_array('cliente_nome','cliente_cpf','servico_tipo','municipio','data_atual')),
      ('Solicitação de documentos ao cliente','Solicitação','Documento','Modelo para orientar o cliente sobre documentos pendentes.','Prezado(a) {{cliente_nome}},\n\nPara dar continuidade ao procedimento {{servico_tipo}} referente ao imóvel {{imovel_nome}}, solicitamos o envio dos documentos pendentes indicados no checklist. Envie arquivos legíveis em PDF, JPG ou PNG.\n\nAtenciosamente,\n{{company_name}}', jsonb_build_array('cliente_nome','servico_tipo','imovel_nome','company_name'))
    ) as x(name,type,category,description,body,variables)
    where not exists (
      select 1 from public.document_templates dt
      where dt.company_id = c.id and lower(dt.name) = lower(x.name)
    );
  end loop;
end $$;

-- Checklists principais preenchidos. Usa prefixo de chave para evitar ids fixos conflitantes.
do $$
declare
  c record;
  v_template_id uuid;
  chk record;
begin
  for c in select id from public.companies loop
    for chk in select * from (values
      ('AVERB','Checklist de Averbação','Cartório','Averbação',array['Matrícula atualizada do imóvel','Documentos pessoais do proprietário','Documentos do cônjuge, se aplicável','Requerimento de averbação','Documento que comprova o ato a ser averbado','Comprovante de emolumentos, se houver','Procuração, se representado por terceiro']),
      ('REG','Checklist de Escritura e Registro','Cartório','Escritura e Registro',array['Documentos pessoais das partes','Certidão de matrícula atualizada','Comprovante de endereço','Certidões exigidas pela serventia','Comprovante de pagamento de tributos','Escritura ou título apresentado','Procuração, se houver representante']),
      ('RET-MAT','Checklist de Retificação de Matrícula','Cartório','Retificação',array['Matrícula atualizada','Requerimento de retificação','Planta e memorial, se envolver área','ART/RRT','Anuência de confrontantes quando exigida','Documentos pessoais','Notas devolutivas anteriores']),
      ('RET-AREA','Checklist de Retificação de Área','Cartório','Retificação de Área',array['Matrícula atualizada','Planta e memorial','ART/RRT','Anuência de confrontantes','Requerimento','Documentos pessoais','Certidões complementares']),
      ('DESM','Checklist de Desmembramento','Cartório','Desmembramento',array['Matrícula atualizada','Requerimento','Planta e memorial','ART/RRT','Aprovação municipal quando exigida','Documentos pessoais','Certidões']),
      ('REM','Checklist de Remembramento','Cartório','Remembramento',array['Matrículas atualizadas','Requerimento','Planta e memorial','ART/RRT','Aprovação municipal quando exigida','Documentos pessoais','Certidões']),
      ('GEO','Checklist de Georreferenciamento','Geo','Georreferenciamento',array['Matrícula ou documento de posse','Documentos pessoais do proprietário/possuidor','CAR e CCIR, se existentes','Levantamento de campo','Planta','Memorial descritivo','ART/RRT','Arquivo técnico/planilha SIGEF','Declaração de confrontantes, se aplicável']),
      ('SIGEF','Checklist de SIGEF','Geo','SIGEF',array['Matrícula ou documento base','Planta e memorial descritivo','ART/RRT','Planilha SIGEF','Arquivo técnico validado','Documentos do responsável técnico','Comprovante de submissão/certificação']),
      ('CAR','Checklist de CAR','Ambiental','CAR',array['Documentos pessoais do proprietário/possuidor','Comprovante de propriedade ou posse','Dados do imóvel rural','Mapa ou arquivo técnico, se houver','Recibo CAR anterior, se retificação','Informações ambientais do imóvel']),
      ('CAR-RET','Checklist de Retificação de CAR','Ambiental','Retificação de CAR',array['Recibo CAR anterior','Documentos pessoais','Documento do imóvel','Mapa/arquivo técnico atualizado','Informações ambientais corrigidas','Justificativa da retificação']),
      ('CCIR','Checklist de CCIR/SNCR','INCRA','CCIR/SNCR',array['Documentos pessoais','Comprovante de propriedade ou posse','Dados do imóvel','Área total e exploração','Comprovantes anteriores','Procuração, se aplicável']),
      ('ITR','Checklist de ITR/DITR','Fiscal','ITR/DITR',array['CPF/CNPJ do titular','Dados do imóvel','Área total e áreas de utilização','CAR/CCIR quando houver','Recibos anteriores','Informações fiscais necessárias']),
      ('CIB','Checklist de CIB/NIRF','Fiscal','CIB/NIRF',array['CPF/CNPJ do titular','Dados do imóvel','Matrícula/documento de posse','CAR/CCIR quando houver','Comprovantes anteriores','Dados fiscais para atualização']),
      ('AGED','Checklist AGED - Produtor/Propriedade','AGED','AGED',array['Documentos pessoais do produtor','Comprovante de endereço','Dados da propriedade','Documentos do imóvel','Informações de exploração pecuária','Procuração ou autorização quando aplicável']),
      ('ITERMA','Checklist ITERMA - Regularização Fundiária','ITERMA','ITERMA',array['Documentos pessoais','Comprovante de residência','Declaração de posse','Documentos do imóvel','Croqui ou localização','Declarações complementares','Fotos/documentos de ocupação quando aplicável']),
      ('USUC','Checklist de Usucapião Rural','Cartório','Usucapião Rural',array['Documentos pessoais','Comprovantes de posse','Planta e memorial','ART/RRT','Certidões do imóvel e confrontantes','Declarações testemunhais','Documentos do cônjuge, se aplicável']),
      ('INV','Checklist de Inventário Rural','Cartório','Inventário Rural',array['Documentos pessoais dos herdeiros','Certidão de óbito','Documentos do imóvel','Matrícula atualizada','Certidões fiscais','Partilha ou plano de divisão','Procuração quando aplicável']),
      ('CV','Checklist de Compra e Venda Rural','Cartório','Compra e Venda Rural',array['Documentos pessoais das partes','Matrícula atualizada','CAR/CCIR/ITR quando aplicável','Certidões fiscais e registrais','Contrato ou minuta','Comprovantes de pagamento','Procuração se houver representante']),
      ('DD','Checklist de Due Diligence Rural','Dossiê','Due Diligence Rural',array['Matrícula atualizada e cadeia dominial','Certidões do imóvel e proprietários','CAR, CCIR, ITR e CIB/NIRF','Planta, memorial e arquivos técnicos','Pendências financeiras, ambientais e cartoriais','Histórico de protocolos','Relatório final de riscos']),
      ('DOSSIE','Checklist de Dossiê Rural','Dossiê','Dossiê Rural',array['Ficha completa do cliente','Documentos pessoais','Dados do cônjuge, se houver','Documentos do imóvel','Matrícula/certidão atualizada','CAR','CCIR','ITR','CIB/NIRF','Documentos técnicos','Pendências','Histórico de atendimentos'])
    ) as t(key,name,category,service,items) loop
      insert into public.checklist_templates(company_id, name, description, category, service_type, procedure_type, target_entity, source_notice, is_global_default, is_editable, active)
      values (c.id, chk.name, chk.name || ' com documentos operacionais editáveis para empresas rurais/cartoriais.', chk.category, chk.service, chk.service, 'Serviço', 'Modelo operacional editável. Revise conforme cartório, órgão, município, UF e situação do imóvel.', true, true, true)
      on conflict do nothing;

      select id into v_template_id from public.checklist_templates where company_id = c.id and lower(name) = lower(chk.name) limit 1;
      if v_template_id is not null then
        insert into public.checklist_template_items(company_id, template_id, document_name, description, required, who_provides, requires_spouse, requires_property, requires_geo_file, visible_to_client, portal_instruction, internal_instruction, source_name, sort_order, active)
        select c.id, v_template_id, item_name, item_name || ' para instrução do procedimento ' || chk.service || '.', ord <= 5,
          case when item_name ~* 'planta|memorial|ART|levantamento|arquivo técnico|SIGEF' then 'Técnico' when item_name ~* 'requerimento|certidões|histórico|pendências' then 'Empresa' else 'Cliente' end,
          item_name ~* 'cônjuge|conjuge',
          item_name ~* 'imóvel|imovel|matrícula|matricula|CAR|CCIR|ITR|CIB|área|area|planta|memorial',
          item_name ~* 'planta|memorial|arquivo técnico|SIGEF|levantamento',
          not (item_name ~* 'histórico|pendências|levantamento'),
          'Envie ou confirme: ' || item_name || '.',
          'Conferir ' || item_name || ' antes de protocolar o procedimento ' || chk.service || '.',
          'Modelo operacional editável', ord, true
        from unnest(chk.items) with ordinality as u(item_name, ord)
        where not exists (
          select 1 from public.checklist_template_items i
          where i.template_id = v_template_id and lower(i.document_name) = lower(u.item_name)
        );
      end if;
    end loop;
  end loop;
end $$;

create index if not exists document_templates_company_active_idx on public.document_templates(company_id, active, category);
create index if not exists clients_photo_idx on public.clients(company_id, photo_storage_path);

select 'Nex Rural migration 0011 templates, UI e dossie executada com sucesso' as status;
