-- Nex Rural - Motor real de documentos DOCX, modelos da empresa e checklists próprios.
-- Migration segura: não apaga dados e não depende de seeds oficiais inventados.

create extension if not exists "uuid-ossp";

-- Buckets usados pelo motor documental.
insert into storage.buckets (id, name, public)
values
  ('document-templates', 'document-templates', false),
  ('generated-documents', 'generated-documents', false),
  ('client-photos', 'client-photos', false)
on conflict (id) do nothing;

-- Garantias em document_templates.
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

alter table public.document_templates add column if not exists file_type text;
alter table public.document_templates add column if not exists original_filename text;
alter table public.document_templates add column if not exists storage_path text;
alter table public.document_templates add column if not exists public_url text;
alter table public.document_templates add column if not exists body text;
alter table public.document_templates add column if not exists variables jsonb not null default '[]'::jsonb;
alter table public.document_templates add column if not exists variable_map jsonb not null default '{}'::jsonb;
alter table public.document_templates add column if not exists status text not null default 'Ativo';
alter table public.document_templates add column if not exists is_fillable boolean not null default true;
alter table public.document_templates add column if not exists source_type text not null default 'Modelo da empresa';
alter table public.document_templates add column if not exists active boolean not null default true;
alter table public.document_templates add column if not exists created_by uuid;
alter table public.document_templates add column if not exists updated_by uuid;
alter table public.document_templates add column if not exists created_at timestamptz not null default now();
alter table public.document_templates add column if not exists updated_at timestamptz not null default now();
alter table public.document_templates add column if not exists deleted_at timestamptz;

-- Se variables antiga for text[] em algum banco, transformar para jsonb preservando dados.
do $$
declare col_type text;
begin
  select data_type into col_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'document_templates' and column_name = 'variables';

  if col_type = 'ARRAY' then
    alter table public.document_templates add column if not exists variables_jsonb_tmp jsonb default '[]'::jsonb;
    update public.document_templates set variables_jsonb_tmp = to_jsonb(variables) where variables_jsonb_tmp is null or variables_jsonb_tmp = '[]'::jsonb;
    alter table public.document_templates drop column variables;
    alter table public.document_templates rename column variables_jsonb_tmp to variables;
  end if;
end $$;

-- Documentos gerados a partir dos modelos.
create table if not exists public.generated_documents (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid references public.document_templates(id) on delete set null,
  client_id uuid references public.clients(id) on delete cascade,
  property_id uuid references public.rural_properties(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  checklist_id uuid references public.generated_checklists(id) on delete set null,
  title text not null,
  output_type text not null default 'docx',
  storage_path text,
  public_url text,
  portal_visible boolean not null default false,
  status text not null default 'Gerado',
  generated_by uuid references auth.users(id),
  generated_at timestamptz default now(),
  released_to_portal_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.template_variables (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid not null references public.document_templates(id) on delete cascade,
  variable_key text not null,
  label text,
  source_entity text,
  source_field text,
  required boolean not null default false,
  created_at timestamptz not null default now(),
  unique(company_id, template_id, variable_key)
);

alter table if exists public.checklist_templates add column if not exists source_notice text default 'Checklist criado pela empresa. Revise documentos conforme procedimento, cartório, órgão, município, UF e situação do imóvel.';
alter table if exists public.checklist_template_items add column if not exists linked_template_id uuid references public.document_templates(id) on delete set null;
alter table if exists public.generated_checklists add column if not exists visible_on_portal boolean not null default false;
alter table if exists public.generated_checklist_items add column if not exists visible_to_client boolean not null default true;
alter table if exists public.generated_checklist_items add column if not exists visible_on_portal boolean not null default true;
alter table if exists public.generated_checklist_items add column if not exists linked_template_id uuid references public.document_templates(id) on delete set null;
alter table if exists public.generated_checklist_items add column if not exists property_id uuid;
alter table if exists public.generated_checklist_items add column if not exists service_id uuid;
alter table if exists public.checklist_item_documents add column if not exists generated_document_id uuid references public.generated_documents(id) on delete set null;

alter table if exists public.clients add column if not exists photo_url text;
alter table if exists public.clients add column if not exists photo_storage_path text;
alter table if exists public.clients add column if not exists has_spouse boolean not null default false;
alter table if exists public.clients add column if not exists spouse_full_name text;
alter table if exists public.clients add column if not exists spouse_cpf text;
alter table if exists public.clients add column if not exists spouse_rg text;
alter table if exists public.clients add column if not exists spouse_phone text;
alter table if exists public.clients add column if not exists spouse_email text;
alter table if exists public.clients add column if not exists marriage_regime text;

-- Templates antigos sem arquivo passam a ser exemplos manuais, não modelos oficiais.
update public.document_templates
set source_type = coalesce(source_type, 'Modelo manual'),
    status = coalesce(status, 'Ativo'),
    is_fillable = coalesce(is_fillable, false)
where storage_path is null;

-- Índices úteis.
create index if not exists document_templates_company_status_idx on public.document_templates(company_id, status, active);
create index if not exists document_templates_file_type_idx on public.document_templates(company_id, file_type);
create index if not exists generated_documents_client_idx on public.generated_documents(company_id, client_id, portal_visible, created_at desc);
create index if not exists generated_documents_template_idx on public.generated_documents(company_id, template_id, created_at desc);
create index if not exists template_variables_template_idx on public.template_variables(company_id, template_id);
create index if not exists checklist_template_items_linked_template_idx on public.checklist_template_items(company_id, linked_template_id);
create index if not exists generated_checklist_items_linked_template_idx on public.generated_checklist_items(company_id, linked_template_id);

-- RLS.
alter table public.document_templates enable row level security;
alter table public.generated_documents enable row level security;
alter table public.template_variables enable row level security;

drop policy if exists "document_templates company isolation" on public.document_templates;
create policy "document_templates company isolation" on public.document_templates
  for all using (public.is_admin_master_global() or company_id = public.current_company_id())
  with check (public.is_admin_master_global() or company_id = public.current_company_id());

drop policy if exists "generated_documents company isolation" on public.generated_documents;
create policy "generated_documents company isolation" on public.generated_documents
  for all using (public.is_admin_master_global() or company_id = public.current_company_id())
  with check (public.is_admin_master_global() or company_id = public.current_company_id());

drop policy if exists "generated_documents client portal read" on public.generated_documents;
create policy "generated_documents client portal read" on public.generated_documents
  for select using (
    company_id = public.current_company_id()
    and public.current_user_role_text() = 'cliente'
    and client_id = public.current_client_id()
    and portal_visible = true
  );

drop policy if exists "template_variables company isolation" on public.template_variables;
create policy "template_variables company isolation" on public.template_variables
  for all using (public.is_admin_master_global() or company_id = public.current_company_id())
  with check (public.is_admin_master_global() or company_id = public.current_company_id());

-- Políticas Storage por pasta company_id.
drop policy if exists "document_templates internal read" on storage.objects;
create policy "document_templates internal read" on storage.objects
  for select using (
    bucket_id = 'document-templates'
    and (public.is_admin_master_global() or (split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and split_part(name, '/', 1)::uuid = public.current_company_id()))
  );

drop policy if exists "generated_documents internal read" on storage.objects;
create policy "generated_documents internal read" on storage.objects
  for select using (
    bucket_id = 'generated-documents'
    and (public.is_admin_master_global() or (split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and split_part(name, '/', 1)::uuid = public.current_company_id()))
  );

select 'Nex Rural migration 0012 - motor real de documentos aplicada com sucesso' as status;
