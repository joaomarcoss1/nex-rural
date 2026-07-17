-- Nex Rural - Commercial readiness cleanup
-- Foco: dossie premium, conjuge opcional dentro do cliente, foto do cliente, checklists e RLS.
-- Execute depois da 0009. Script idempotente, nao apaga dados.

-- Campos do cliente usados pelo cadastro profissional e dossie.
alter table public.clients add column if not exists photo_url text;
alter table public.clients add column if not exists photo_storage_path text;
alter table public.clients add column if not exists marital_status text;
alter table public.clients add column if not exists has_spouse boolean not null default false;
alter table public.clients add column if not exists marriage_regime text;
alter table public.clients add column if not exists spouse_id uuid;
alter table public.clients add column if not exists spouse_full_name text;
alter table public.clients add column if not exists spouse_cpf text;
alter table public.clients add column if not exists spouse_rg text;
alter table public.clients add column if not exists spouse_issuing_agency text;
alter table public.clients add column if not exists spouse_birth_date date;
alter table public.clients add column if not exists spouse_nationality text;
alter table public.clients add column if not exists spouse_profession text;
alter table public.clients add column if not exists spouse_phone text;
alter table public.clients add column if not exists spouse_whatsapp text;
alter table public.clients add column if not exists spouse_email text;
alter table public.clients add column if not exists spouse_address text;
alter table public.clients add column if not exists spouse_notes text;
alter table public.clients add column if not exists tags_summary text;
alter table public.clients add column if not exists notes_private text;
alter table public.clients add column if not exists notes_public text;
alter table public.clients add column if not exists deleted_at timestamptz;

-- Garantir tabelas estruturais criadas pela sprint 0009, caso o ambiente limpo tenha falhado parcialmente.
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

create table if not exists public.checklist_item_documents (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  generated_checklist_item_id uuid references public.generated_checklist_items(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (company_id, generated_checklist_item_id, document_id)
);

-- Constraints unicas uteis sem predicates com funcoes nao imutaveis.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tags_company_name_unique') then
    alter table public.tags add constraint tags_company_name_unique unique (company_id, name);
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='checklist_templates')
     and not exists (select 1 from pg_constraint where conname = 'checklist_templates_company_name_unique') then
    alter table public.checklist_templates add constraint checklist_templates_company_name_unique unique (company_id, name);
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='checklist_template_items')
     and not exists (select 1 from pg_constraint where conname = 'checklist_template_items_template_document_unique') then
    alter table public.checklist_template_items add constraint checklist_template_items_template_document_unique unique (template_id, document_name);
  end if;
exception
  when duplicate_object then null;
end $$;

-- Indices simples, sem now(), sem role::text e sem funcoes no predicate.
create index if not exists clients_company_status_idx on public.clients(company_id, status);
create index if not exists clients_company_document_idx on public.clients(company_id, document);
create index if not exists clients_company_cpf_cnpj_idx on public.clients(company_id, cpf_cnpj);
create index if not exists client_spouses_company_client_idx on public.client_spouses(company_id, client_id);
create index if not exists tags_company_active_idx on public.tags(company_id, active);
create index if not exists client_tags_company_client_idx on public.client_tags(company_id, client_id);
create index if not exists checklist_item_documents_company_item_idx on public.checklist_item_documents(company_id, generated_checklist_item_id);

-- RLS para tabelas novas/relacionadas.
alter table public.tags enable row level security;
alter table public.client_tags enable row level security;
alter table public.client_spouses enable row level security;
alter table public.checklist_item_documents enable row level security;

drop policy if exists "tags company scoped 0010" on public.tags;
create policy "tags company scoped 0010" on public.tags
  for all using (
    public.is_admin_master_global()
    or company_id = public.current_company_id()
  ) with check (
    public.is_admin_master_global()
    or company_id = public.current_company_id()
  );

drop policy if exists "client tags company scoped 0010" on public.client_tags;
create policy "client tags company scoped 0010" on public.client_tags
  for all using (
    public.is_admin_master_global()
    or company_id = public.current_company_id()
  ) with check (
    public.is_admin_master_global()
    or company_id = public.current_company_id()
  );

drop policy if exists "client spouses company scoped 0010" on public.client_spouses;
create policy "client spouses company scoped 0010" on public.client_spouses
  for all using (
    public.is_admin_master_global()
    or company_id = public.current_company_id()
    or (public.current_user_role_text() = 'cliente' and client_id = public.current_client_id())
  ) with check (
    public.is_admin_master_global()
    or company_id = public.current_company_id()
  );

drop policy if exists "checklist item documents company scoped 0010" on public.checklist_item_documents;
create policy "checklist item documents company scoped 0010" on public.checklist_item_documents
  for all using (
    public.is_admin_master_global()
    or company_id = public.current_company_id()
  ) with check (
    public.is_admin_master_global()
    or company_id = public.current_company_id()
  );

-- Comentarios operacionais.
comment on column public.clients.spouse_full_name is 'Dados opcionais do conjuge dentro do cadastro do cliente. Evita cadastro separado quando o conjuge e apenas parte documental.';
comment on column public.clients.photo_storage_path is 'Caminho no Supabase Storage da foto usada no cadastro, ficha e dossie do cliente.';
