-- Nex Rural - Checklists documentais, tags, conjuge, ficha do cliente e reorganizacao funcional.
-- Execute apos 0008/ajustes de usuarios. Migration segura: nao apaga dados.

create extension if not exists "uuid-ossp";

-- Roles adicionais usadas pelo app. Rode em query separada se o Postgres pedir commit do enum antes de usar.
do $$
begin
  alter type public.app_role add value if not exists 'admin_master_global';
  alter type public.app_role add value if not exists 'company_admin';
  alter type public.app_role add value if not exists 'topografo';
  alter type public.app_role add value if not exists 'agrimensor';
exception when duplicate_object then null;
end $$;

-- Campos adicionais no cliente para ficha, dossie e portal.
alter table public.clients add column if not exists full_name text;
alter table public.clients add column if not exists cpf_cnpj text;
alter table public.clients add column if not exists portal_enabled boolean not null default false;
alter table public.clients add column if not exists client_access_code text;
alter table public.clients add column if not exists active boolean not null default true;
alter table public.clients add column if not exists status text not null default 'Ativo';
alter table public.clients add column if not exists photo_url text;
alter table public.clients add column if not exists photo_storage_path text;
alter table public.clients add column if not exists marital_status text;
alter table public.clients add column if not exists has_spouse boolean not null default false;
alter table public.clients add column if not exists marriage_regime text;
alter table public.clients add column if not exists spouse_id uuid;
alter table public.clients add column if not exists tags_summary text;
alter table public.clients add column if not exists notes_private text;
alter table public.clients add column if not exists notes_public text;
alter table public.clients add column if not exists deleted_at timestamptz;

-- Funcoes auxiliares resilientes para RLS.
create or replace function public.current_user_role_text()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select up.role::text
  from public.user_profiles up
  where up.id = auth.uid()
    and up.active = true
  limit 1
$$;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select up.company_id
  from public.user_profiles up
  where up.id = auth.uid()
    and up.active = true
  limit 1
$$;

create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select up.client_id
  from public.user_profiles up
  where up.id = auth.uid()
    and up.active = true
  limit 1
$$;

create or replace function public.is_admin_master_global()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.active = true
      and up.role::text = 'admin_master_global'
  )
$$;

create or replace function public.is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role_text() in (
    'admin_master_global','company_admin','admin_master','gestor','tecnico','topografo','agrimensor','administrativo','financeiro'
  ), false)
$$;

-- =========================================================
-- Tabelas de checklists documentais
-- =========================================================
create table if not exists public.checklist_templates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  category text,
  service_type text,
  procedure_type text,
  target_entity text,
  source_notice text default 'Modelo de apoio operacional. As exigencias podem variar conforme cartorio, orgao, municipio ou situacao do imovel. Revise antes de protocolar.',
  is_global_default boolean not null default false,
  is_editable boolean not null default true,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.checklist_template_items (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references public.checklist_templates(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  document_name text not null,
  description text,
  required boolean not null default true,
  item_type text default 'Documento',
  who_provides text default 'Cliente',
  accepted_formats text,
  validity_days integer,
  requires_signature boolean not null default false,
  requires_notarization boolean not null default false,
  requires_original boolean not null default false,
  requires_copy boolean not null default true,
  requires_spouse boolean not null default false,
  requires_property boolean not null default false,
  requires_geo_file boolean not null default false,
  visible_to_client boolean not null default true,
  portal_instruction text,
  internal_instruction text,
  source_name text,
  source_url text,
  source_date date,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.generated_checklists (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid references public.checklist_templates(id) on delete set null,
  client_id uuid references public.clients(id) on delete cascade,
  property_id uuid references public.rural_properties(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  title text not null,
  status text not null default 'Nao iniciado',
  progress_percent integer not null default 0,
  visible_on_portal boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.generated_checklist_items (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  generated_checklist_id uuid not null references public.generated_checklists(id) on delete cascade,
  template_item_id uuid references public.checklist_template_items(id) on delete set null,
  document_name text not null,
  description text,
  required boolean not null default true,
  status text not null default 'Pendente',
  responsible_type text default 'Cliente',
  responsible_user_id uuid references public.user_profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete cascade,
  due_date date,
  received_at timestamptz,
  validated_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  visible_to_client boolean not null default true,
  portal_instruction text,
  internal_notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.checklist_item_documents (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  generated_checklist_item_id uuid references public.generated_checklist_items(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.checklist_sources (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid references public.checklist_templates(id) on delete cascade,
  item_id uuid references public.checklist_template_items(id) on delete cascade,
  source_name text,
  source_url text,
  source_type text,
  state text,
  city text,
  registry_office text,
  checked_at date,
  reliability text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.document_templates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  type text,
  category text,
  description text,
  body text not null,
  variables jsonb not null default '[]'::jsonb,
  version text default '1.0',
  active boolean not null default true,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);


-- Compatibilidade robusta para document_templates já existente.
alter table if exists public.document_templates add column if not exists company_id uuid;
alter table if exists public.document_templates add column if not exists name text;
alter table if exists public.document_templates add column if not exists type text;
alter table if exists public.document_templates add column if not exists category text;
alter table if exists public.document_templates add column if not exists description text;
alter table if exists public.document_templates add column if not exists body text;
alter table if exists public.document_templates add column if not exists variables jsonb not null default '[]'::jsonb;
alter table if exists public.document_templates add column if not exists version text default '1.0';
alter table if exists public.document_templates add column if not exists active boolean not null default true;
alter table if exists public.document_templates add column if not exists created_by uuid;
alter table if exists public.document_templates add column if not exists updated_by uuid;
alter table if exists public.document_templates add column if not exists created_at timestamptz not null default now();
alter table if exists public.document_templates add column if not exists updated_at timestamptz not null default now();
alter table if exists public.document_templates add column if not exists deleted_at timestamptz;

do $$
declare v_type text;
begin
  select data_type into v_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'document_templates'
    and column_name = 'variables'
  limit 1;

  if v_type = 'ARRAY' then
    alter table public.document_templates alter column variables drop default;
    alter table public.document_templates alter column variables type jsonb using to_jsonb(variables);
    alter table public.document_templates alter column variables set default '[]'::jsonb;
    alter table public.document_templates alter column variables set not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'document_templates'
      and column_name = 'content'
  ) then
    execute 'update public.document_templates set body = coalesce(body, content) where body is null';
  end if;
end $$;

-- Tags de clientes e exportacoes
create table if not exists public.tags (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  color text default 'Verde',
  description text,
  category text default 'Cliente',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.client_tags (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (company_id, client_id, tag_id)
);

create table if not exists public.client_spouses (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  full_name text not null,
  cpf text,
  rg text,
  issuing_agency text,
  birth_date date,
  nationality text,
  profession text,
  marital_status text,
  marriage_regime text,
  marriage_date date,
  phone text,
  whatsapp text,
  email text,
  address text,
  photo_storage_path text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.client_exports (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  export_type text not null,
  scope text,
  filters jsonb default '{}',
  row_count integer default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);


-- Compatibilidade com colunas de portal/cliente usadas pelo app.
alter table if exists public.documents add column if not exists visible_on_portal boolean not null default false;
alter table if exists public.documents add column if not exists visible_to_client boolean not null default false;
alter table if exists public.generated_checklists add column if not exists visible_on_portal boolean not null default false;
alter table if exists public.generated_checklists add column if not exists visible_to_client boolean not null default false;
alter table if exists public.generated_checklist_items add column if not exists visible_on_portal boolean not null default true;
alter table if exists public.generated_checklist_items add column if not exists visible_to_client boolean not null default true;
alter table if exists public.checklist_item_documents add column if not exists visible_on_portal boolean not null default true;
alter table if exists public.checklist_item_documents add column if not exists visible_to_client boolean not null default true;
alter table if exists public.checklist_item_documents add column if not exists status text default 'Vinculado';
alter table if exists public.checklist_item_documents add column if not exists validation_status text;
alter table if exists public.checklist_item_documents add column if not exists rejection_reason text;
alter table if exists public.checklist_item_documents add column if not exists updated_at timestamptz not null default now();
alter table if exists public.checklist_item_documents add column if not exists deleted_at timestamptz;

-- RLS das novas tabelas.
do $$
declare t text;
begin
  foreach t in array array[
    'checklist_templates','checklist_template_items','generated_checklists','generated_checklist_items',
    'checklist_item_documents','checklist_sources','document_templates','tags','client_tags','client_spouses','client_exports'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s company isolation" on public.%I', t, t);
    execute format('create policy "%s company isolation" on public.%I for all using (public.is_admin_master_global() or company_id = public.current_company_id()) with check (public.is_admin_master_global() or company_id = public.current_company_id())', t, t);
  end loop;
end $$;

-- Politicas especificas para cliente consultar apenas itens liberados no portal.
drop policy if exists "generated_checklists client portal read" on public.generated_checklists;
create policy "generated_checklists client portal read" on public.generated_checklists
  for select using (
    company_id = public.current_company_id()
    and public.current_user_role_text() = 'cliente'
    and client_id = public.current_client_id()
    and visible_on_portal = true
  );

drop policy if exists "generated_checklist_items client portal read" on public.generated_checklist_items;
create policy "generated_checklist_items client portal read" on public.generated_checklist_items
  for select using (
    company_id = public.current_company_id()
    and public.current_user_role_text() = 'cliente'
    and client_id = public.current_client_id()
    and visible_to_client = true
  );

-- Indices sem funcoes volateis em predicates.
create index if not exists checklist_templates_company_idx on public.checklist_templates(company_id, active, category);
create index if not exists checklist_template_items_template_idx on public.checklist_template_items(template_id, sort_order);
create index if not exists generated_checklists_client_idx on public.generated_checklists(company_id, client_id, status);
create index if not exists generated_checklist_items_checklist_idx on public.generated_checklist_items(generated_checklist_id, status, visible_to_client);
create index if not exists tags_company_idx on public.tags(company_id, active, category);
create index if not exists client_tags_client_idx on public.client_tags(company_id, client_id);
create index if not exists client_spouses_client_idx on public.client_spouses(company_id, client_id, active);
create index if not exists clients_tags_summary_idx on public.clients(company_id, status);

-- Seeds iniciais por empresa existente. Todos editaveis.
do $$
declare c record;
  v_template_id uuid;
begin
  for c in select id from public.companies loop
    -- Tags padrao
    insert into public.tags(company_id, name, color, category, description)
    select c.id, x.name, x.color, x.category, x.description
    from (values
      ('Produtor rural','Verde','Cliente','Cliente pessoa fisica/produtor rural'),
      ('Urgente','Vermelho','Documento','Demanda com prazo curto'),
      ('Aguardando documento','Dourado','Documento','Existe pendencia documental'),
      ('Cartorio pendente','Azul','Cartorio','Processo aguardando cartorio'),
      ('Geo pendente','Roxo','Geo','Pendente de geoprocessamento'),
      ('Inadimplente','Vermelho','Financeiro','Pendencia financeira'),
      ('Finalizado','Cinza','Cliente','Atendimento concluido')
    ) as x(name,color,category,description)
    where not exists (select 1 from public.tags t where t.company_id = c.id and lower(t.name) = lower(x.name));

    -- Modelos de declaracoes
    insert into public.document_templates(company_id, name, type, category, description, body, variables, active)
    select c.id, x.name, x.type, x.category, x.description, x.body, x.variables, true
    from (values
      ('Declaracao de posse','Declaracao','Rural','Modelo de declaracao de posse rural','Eu, {{cliente_nome}}, declaro exercer posse sobre o imovel {{imovel_nome}}, localizado em {{municipio}}.', jsonb_build_array('cliente_nome','imovel_nome','municipio')),
      ('Declaracao de confrontantes','Declaracao','Cartorio','Modelo para coleta de dados/anuencia de confrontantes','Declaro para fins de regularizacao do imovel {{imovel_nome}} que os confrontantes foram cientificados.', jsonb_build_array('cliente_nome','imovel_nome')),
      ('Requerimento de averbacao','Requerimento','Cartorio','Requerimento basico para averbar ato na matricula','Ao Cartorio competente, requer-se a averbacao referente ao imovel matricula {{matricula}}.', jsonb_build_array('cliente_nome','matricula','cartorio')),
      ('Termo de entrega de documentos','Termo','Cliente','Controle de entrega de documentos pelo cliente','Recebemos de {{cliente_nome}} os documentos listados para o procedimento {{servico_tipo}}.', jsonb_build_array('cliente_nome','servico_tipo','data_atual'))
    ) as x(name,type,category,description,body,variables)
    where not exists (select 1 from public.document_templates dt where dt.company_id = c.id and lower(dt.name) = lower(x.name));

    -- Funcao local: cria template e itens se ainda nao existir.
    insert into public.checklist_templates(company_id, name, description, category, service_type, procedure_type, target_entity, is_global_default, is_editable, active)
    select c.id, 'Checklist de Averbacao', 'Documentos de apoio para averbar ato na matricula do imovel rural.', 'Cartorio', 'Averbacao', 'Averbacao', 'Servico', true, true, true
    where not exists (
      select 1 from public.checklist_templates ct
      where ct.company_id = c.id and lower(ct.name) = lower('Checklist de Averbacao')
    );
    select id into v_template_id from public.checklist_templates where company_id = c.id and name = 'Checklist de Averbacao' limit 1;
    if v_template_id is not null then
      insert into public.checklist_template_items(company_id, template_id, document_name, description, required, who_provides, requires_spouse, requires_property, visible_to_client, portal_instruction, source_name, sort_order)
      select c.id, v_template_id, x.document_name, x.description, x.required, x.who_provides, x.requires_spouse, x.requires_property, true, x.portal_instruction, 'Modelo operacional editavel', x.sort_order
      from (values
        ('Matricula atualizada do imovel','Certidao/matricula recente para verificar atos e proprietarios.', true, 'Cliente', false, true, 'Envie a matricula atualizada em PDF.', 1),
        ('Documentos pessoais do proprietario','RG/CNH e CPF do proprietario.', true, 'Cliente', false, false, 'Envie documento com foto e CPF.', 2),
        ('Documentos do conjuge, se aplicavel','CPF/RG do conjuge quando o ato exigir anuencia.', false, 'Cliente', true, false, 'Se casado(a), envie documentos do conjuge.', 3),
        ('Requerimento de averbacao','Requerimento assinado conforme modelo da serventia.', true, 'Empresa', false, true, 'A empresa preparara o requerimento para assinatura.', 4),
        ('Comprovante de pagamento de emolumentos','Comprovante das custas do cartorio quando exigido.', false, 'Cliente', false, false, 'Envie o comprovante quando solicitado.', 5)
      ) as x(document_name,description,required,who_provides,requires_spouse,requires_property,portal_instruction,sort_order)
      where not exists (select 1 from public.checklist_template_items i where i.template_id = v_template_id and i.document_name = x.document_name);
    end if;

    insert into public.checklist_templates(company_id, name, description, category, service_type, procedure_type, target_entity, is_global_default, is_editable, active)
    select c.id, 'Checklist de Georreferenciamento', 'Documentos tecnicos para levantamento, planta, memorial e certificacao.', 'Geo', 'Georreferenciamento', 'Georreferenciamento', 'Servico', true, true, true
    where not exists (
      select 1 from public.checklist_templates ct
      where ct.company_id = c.id and lower(ct.name) = lower('Checklist de Georreferenciamento')
    );
    select id into v_template_id from public.checklist_templates where company_id = c.id and name = 'Checklist de Georreferenciamento' limit 1;
    if v_template_id is not null then
      insert into public.checklist_template_items(company_id, template_id, document_name, description, required, who_provides, requires_geo_file, requires_property, visible_to_client, portal_instruction, source_name, sort_order)
      select c.id, v_template_id, x.document_name, x.description, x.required, x.who_provides, x.requires_geo_file, true, x.visible_to_client, x.portal_instruction, 'Modelo operacional editavel', x.sort_order
      from (values
        ('Matricula ou documento de posse','Documento base do imovel para iniciar o levantamento.', true, 'Cliente', false, true, 'Envie matricula, escritura ou comprovante de posse.', 1),
        ('CAR e CCIR, se existentes','Dados cadastrais para cruzamento documental.', false, 'Cliente', false, true, 'Envie recibos/codigos CAR e CCIR.', 2),
        ('Levantamento de campo','Coleta tecnica de coordenadas e limites.', true, 'Tecnico', true, false, 'Etapa executada pela equipe tecnica.', 3),
        ('Planta e memorial descritivo','Pecas tecnicas do responsavel habilitado.', true, 'Tecnico', true, false, 'Documento sera disponibilizado apos elaboracao.', 4),
        ('ART/RRT do responsavel tecnico','Comprovante de responsabilidade tecnica.', true, 'Tecnico', false, false, 'A equipe anexara a ART/RRT.', 5),
        ('Planilha SIGEF/arquivo tecnico','Arquivo tecnico usado para validacao/certificacao.', true, 'Tecnico', true, false, 'Etapa interna da equipe tecnica.', 6)
      ) as x(document_name,description,required,who_provides,requires_geo_file,visible_to_client,portal_instruction,sort_order)
      where not exists (select 1 from public.checklist_template_items i where i.template_id = v_template_id and i.document_name = x.document_name);
    end if;

    insert into public.checklist_templates(company_id, name, description, category, service_type, procedure_type, target_entity, is_global_default, is_editable, active)
    select c.id, 'Checklist de CAR', 'Documentos para inscricao, retificacao ou acompanhamento do CAR.', 'Ambiental', 'CAR', 'CAR', 'Servico', true, true, true
    where not exists (
      select 1 from public.checklist_templates ct
      where ct.company_id = c.id and lower(ct.name) = lower('Checklist de CAR')
    );
    select id into v_template_id from public.checklist_templates where company_id = c.id and name = 'Checklist de CAR' limit 1;
    if v_template_id is not null then
      insert into public.checklist_template_items(company_id, template_id, document_name, description, required, who_provides, requires_property, visible_to_client, portal_instruction, source_name, sort_order)
      select c.id, v_template_id, x.document_name, x.description, x.required, x.who_provides, true, true, x.portal_instruction, 'Modelo operacional editavel', x.sort_order
      from (values
        ('Documentos pessoais do proprietario','RG/CNH e CPF do titular/possuidor.', true, 'Cliente', 'Envie documento pessoal do proprietario ou possuidor.', 1),
        ('Comprovante de propriedade ou posse','Matricula, escritura, contrato, declaracao ou documento correlato.', true, 'Cliente', 'Envie documento que comprove a relacao com o imovel.', 2),
        ('Dados do imovel rural','Nome, municipio, area, localizacao e informacoes ambientais.', true, 'Empresa', 'A equipe consolidara os dados do imovel.', 3),
        ('Mapa/arquivo geo quando disponivel','Arquivo tecnico para apoiar a delimitacao.', false, 'Tecnico', 'Envie KML/GeoJSON/planta se possuir.', 4),
        ('Recibo CAR anterior, se retificacao','Necessario para retificar cadastro existente.', false, 'Cliente', 'Envie o recibo CAR anterior, se houver.', 5)
      ) as x(document_name,description,required,who_provides,portal_instruction,sort_order)
      where not exists (select 1 from public.checklist_template_items i where i.template_id = v_template_id and i.document_name = x.document_name);
    end if;

    insert into public.checklist_templates(company_id, name, description, category, service_type, procedure_type, target_entity, is_global_default, is_editable, active)
    select c.id, 'Checklist de Due Diligence Rural', 'Checklist amplo para compra, venda, regularizacao ou auditoria do imovel rural.', 'Dossie', 'Due diligence rural', 'Due diligence', 'Imovel', true, true, true
    where not exists (
      select 1 from public.checklist_templates ct
      where ct.company_id = c.id and lower(ct.name) = lower('Checklist de Due Diligence Rural')
    );
    select id into v_template_id from public.checklist_templates where company_id = c.id and name = 'Checklist de Due Diligence Rural' limit 1;
    if v_template_id is not null then
      insert into public.checklist_template_items(company_id, template_id, document_name, description, required, who_provides, requires_property, visible_to_client, portal_instruction, source_name, sort_order)
      select c.id, v_template_id, x.document_name, x.description, x.required, x.who_provides, true, x.visible_to_client, x.portal_instruction, 'Modelo operacional editavel', x.sort_order
      from (values
        ('Matricula atualizada e cadeia dominial','Verificacao registral e historico de propriedade.', true, 'Cliente', true, 'Envie matricula/certidao atualizada do imovel.', 1),
        ('Certidoes do imovel e proprietarios','Certidoes para analise de risco documental.', true, 'Empresa', false, 'A equipe informara as certidoes necessarias.', 2),
        ('CAR, CCIR, ITR e CIB/NIRF','Bases rurais, fiscais e ambientais para conferencia.', true, 'Cliente', true, 'Envie recibos, codigos e comprovantes existentes.', 3),
        ('Planta, memorial e arquivos tecnicos','Conferencia de area, limites e sobreposicoes.', false, 'Tecnico', false, 'A equipe analisara arquivos tecnicos existentes.', 4),
        ('Pendencias financeiras, ambientais e cartoriais','Mapeamento de riscos antes da conclusao.', true, 'Empresa', false, 'A equipe consolidara pendencias encontradas.', 5)
      ) as x(document_name,description,required,who_provides,visible_to_client,portal_instruction,sort_order)
      where not exists (select 1 from public.checklist_template_items i where i.template_id = v_template_id and i.document_name = x.document_name);
    end if;
  end loop;
end $$;


select 'Nex Rural migration 0009 corrigida executada com sucesso' as status;
