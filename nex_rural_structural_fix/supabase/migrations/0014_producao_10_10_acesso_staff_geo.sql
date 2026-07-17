-- =========================================================
-- Nex Rural 0014 - Produção 10/10: acesso por CPF, funcionários, sessões e Geo Storage
-- =========================================================
create extension if not exists pgcrypto;

create or replace function public.nex_digits(value text)
returns text
language sql
immutable
as $$ select regexp_replace(coalesce(value, ''), '\\D', '', 'g') $$;

create or replace function public.nex_normalize_text(value text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(lower(translate(coalesce(value, ''),
    'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
    'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
  )), '\\s+', ' ', 'g'))
$$;

alter table if exists public.clients
  add column if not exists normalized_name text,
  add column if not exists normalized_cpf text,
  add column if not exists portal_status text default 'Ativo',
  add column if not exists last_portal_access_at timestamptz;

update public.clients
set normalized_name = public.nex_normalize_text(coalesce(full_name, name, '')),
    normalized_cpf = public.nex_digits(coalesce(cpf_cnpj, document, ''))
where normalized_name is null or normalized_cpf is null;

create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  normalized_name text not null,
  cpf text not null,
  normalized_cpf text not null,
  role text not null,
  department text,
  phone text,
  email text,
  active boolean not null default true,
  status text not null default 'Ativo',
  permissions jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists staff_profiles_company_idx on public.staff_profiles(company_id);
create index if not exists staff_profiles_cpf_idx on public.staff_profiles(normalized_cpf);
create index if not exists staff_profiles_name_cpf_idx on public.staff_profiles(normalized_name, normalized_cpf);
create unique index if not exists staff_profiles_company_cpf_active_idx on public.staff_profiles(company_id, normalized_cpf) where deleted_at is null;

create or replace function public.staff_profiles_normalize_trigger()
returns trigger
language plpgsql
as $$
begin
  new.normalized_name := public.nex_normalize_text(new.full_name);
  new.normalized_cpf := public.nex_digits(new.cpf);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists staff_profiles_normalize_before on public.staff_profiles;
create trigger staff_profiles_normalize_before
before insert or update on public.staff_profiles
for each row execute function public.staff_profiles_normalize_trigger();

create or replace function public.clients_normalize_access_trigger()
returns trigger
language plpgsql
as $$
begin
  new.normalized_name := public.nex_normalize_text(coalesce(new.full_name, new.name, ''));
  new.normalized_cpf := public.nex_digits(coalesce(new.cpf_cnpj, new.document, ''));
  return new;
end;
$$;

drop trigger if exists clients_normalize_access_before on public.clients;
create trigger clients_normalize_access_before
before insert or update on public.clients
for each row execute function public.clients_normalize_access_trigger();

create table if not exists public.access_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_type text not null check (actor_type in ('client','staff')),
  actor_id uuid not null,
  role text,
  session_token_hash text not null,
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists access_sessions_company_idx on public.access_sessions(company_id);
create index if not exists access_sessions_actor_idx on public.access_sessions(actor_type, actor_id);
create index if not exists access_sessions_hash_idx on public.access_sessions(session_token_hash);

alter table if exists public.audit_logs
  add column if not exists actor_type text,
  add column if not exists actor_id uuid,
  add column if not exists entity_type text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists ip_address text;

alter table if exists public.geo_files
  add column if not exists client_id uuid,
  add column if not exists original_filename text,
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists extension text,
  add column if not exists size bigint,
  add column if not exists uploaded_by uuid,
  add column if not exists uploaded_at timestamptz;

insert into storage.buckets (id, name, public)
values ('geo-files', 'geo-files', false)
on conflict (id) do nothing;

create table if not exists public.generated_document_checklist_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  generated_document_id uuid not null references public.generated_documents(id) on delete cascade,
  generated_checklist_id uuid references public.generated_checklists(id) on delete set null,
  generated_checklist_item_id uuid references public.generated_checklist_items(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists generated_document_checklist_items_company_idx on public.generated_document_checklist_items(company_id);
create index if not exists generated_document_checklist_items_document_idx on public.generated_document_checklist_items(generated_document_id);

alter table if exists public.generated_documents
  add column if not exists generation_metadata jsonb default '{}'::jsonb;

alter table if exists public.generated_checklist_items
  add column if not exists requested_at timestamptz,
  add column if not exists received_at timestamptz,
  add column if not exists in_review_at timestamptz,
  add column if not exists not_applicable_at timestamptz,
  add column if not exists due_days integer,
  add column if not exists portal_instruction text,
  add column if not exists internal_instruction text,
  add column if not exists rejection_reason text,
  add column if not exists active boolean not null default true;

alter table public.staff_profiles enable row level security;
alter table public.access_sessions enable row level security;
alter table public.generated_document_checklist_items enable row level security;

drop policy if exists staff_profiles_admin_access on public.staff_profiles;
create policy staff_profiles_admin_access on public.staff_profiles
for all
using (public.is_admin_master_global() or company_id = public.current_company_id())
with check (public.is_admin_master_global() or company_id = public.current_company_id());

drop policy if exists access_sessions_admin_access on public.access_sessions;
create policy access_sessions_admin_access on public.access_sessions
for all
using (public.is_admin_master_global() or company_id = public.current_company_id())
with check (public.is_admin_master_global() or company_id = public.current_company_id());

drop policy if exists generated_document_checklist_items_admin_access on public.generated_document_checklist_items;
create policy generated_document_checklist_items_admin_access on public.generated_document_checklist_items
for all
using (public.is_admin_master_global() or company_id = public.current_company_id())
with check (public.is_admin_master_global() or company_id = public.current_company_id());

-- Storage policies para geo-files com validação de UUID antes do cast.
drop policy if exists geo_files_company_storage_read on storage.objects;
create policy geo_files_company_storage_read on storage.objects
for select
using (
  bucket_id = 'geo-files'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (public.is_admin_master_global() or split_part(name, '/', 1)::uuid = public.current_company_id())
);

drop policy if exists geo_files_company_storage_insert on storage.objects;
create policy geo_files_company_storage_insert on storage.objects
for insert
with check (
  bucket_id = 'geo-files'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (public.is_admin_master_global() or split_part(name, '/', 1)::uuid = public.current_company_id())
);

select 'Nex Rural 0014 produção 10/10 aplicada com sucesso' as status;
