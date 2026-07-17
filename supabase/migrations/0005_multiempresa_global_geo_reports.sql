alter type app_role add value if not exists 'admin_master_global';
alter type app_role add value if not exists 'company_admin';
alter type app_role add value if not exists 'topografo';
alter type app_role add value if not exists 'agrimensor';

create sequence if not exists company_code_sequence start 327 increment 1;

create or replace function generate_company_code()
returns text
language sql
as $$
  select nextval('company_code_sequence')::text || extract(year from now())::int::text;
$$;

alter table companies add column if not exists company_code text;
alter table companies add column if not exists cnpj text;
alter table companies add column if not exists email text;
alter table companies add column if not exists phone text;
alter table companies add column if not exists address text;
alter table companies add column if not exists city text;
alter table companies add column if not exists state text;
alter table companies add column if not exists status text not null default 'Ativa';
alter table companies add column if not exists plan text not null default 'Pilot Premium';
alter table companies add column if not exists responsible_name text;
alter table companies add column if not exists blocked_at timestamptz;
alter table companies add column if not exists blocked_reason text;
alter table companies add column if not exists notes text;
alter table companies add column if not exists created_by uuid;
alter table companies add column if not exists updated_by uuid;

create unique index if not exists companies_company_code_key on companies(company_code) where company_code is not null;

create or replace function set_company_code()
returns trigger
language plpgsql
as $$
begin
  if new.company_code is null or btrim(new.company_code) = '' then
    new.company_code := generate_company_code();
  end if;
  return new;
end;
$$;

drop trigger if exists companies_set_company_code on companies;
create trigger companies_set_company_code
before insert on companies
for each row execute function set_company_code();

alter table user_profiles add column if not exists company_code text;
alter table user_profiles add column if not exists department text;
alter table user_profiles add column if not exists phone text;
alter table user_profiles add column if not exists status text not null default 'Ativo';
alter table user_profiles add column if not exists blocked_at timestamptz;
alter table user_profiles add column if not exists blocked_reason text;

create or replace function set_user_profile_company_code()
returns trigger
language plpgsql
as $$
begin
  if new.company_id is not null then
    select company_code into new.company_code from companies where id = new.company_id;
  end if;
  return new;
end;
$$;

drop trigger if exists user_profiles_set_company_code on user_profiles;
create trigger user_profiles_set_company_code
before insert or update of company_id on user_profiles
for each row execute function set_user_profile_company_code();

alter table clients add column if not exists full_name text;
alter table clients add column if not exists cpf_cnpj text;
alter table clients add column if not exists client_access_code text;
alter table clients add column if not exists portal_enabled boolean not null default false;
alter table clients add column if not exists active boolean not null default true;
alter table clients add column if not exists blocked_at timestamptz;
alter table clients add column if not exists blocked_reason text;

update clients
set full_name = coalesce(full_name, name),
    cpf_cnpj = coalesce(cpf_cnpj, document)
where full_name is null or cpf_cnpj is null;

create unique index if not exists clients_company_portal_code_key
  on clients(company_id, client_access_code)
  where client_access_code is not null;

create table if not exists technical_area_comparisons (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  property_id uuid references rural_properties(id) on delete set null,
  property_name text,
  declared_area numeric,
  measured_area numeric,
  registry_area numeric,
  car_area numeric,
  difference_area numeric,
  difference_percent numeric,
  tolerance_percent numeric default 5,
  status text not null default 'Pendente',
  recommended_action text,
  checked_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references user_profiles(id) on delete set null
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  report_type text not null,
  title text not null,
  status text not null default 'Gerado',
  generated_by uuid references user_profiles(id) on delete set null,
  generated_by_name text,
  generated_at timestamptz default now(),
  payload jsonb default '{}'::jsonb,
  visible_on_portal boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists report_exports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  report_id uuid references reports(id) on delete cascade,
  export_type text not null,
  file_name text not null,
  storage_path text,
  status text not null default 'Disponivel',
  created_at timestamptz default now(),
  created_by uuid references user_profiles(id) on delete set null
);

alter table technical_area_comparisons enable row level security;
alter table reports enable row level security;
alter table report_exports enable row level security;

create or replace function current_user_role_text()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from user_profiles where id = auth.uid() and active = true
$$;

create or replace function current_company_code()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.company_code
  from user_profiles up
  join companies c on c.id = up.company_id
  where up.id = auth.uid() and up.active = true
$$;

create or replace function is_admin_master_global()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from user_profiles
    where id = auth.uid()
      and active = true
      and role::text = 'admin_master_global'
  )
$$;

create or replace function is_admin_master()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from user_profiles
    where id = auth.uid()
      and active = true
      and role::text in ('admin_master_global', 'company_admin', 'admin_master')
  )
$$;

create or replace function is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from user_profiles
    where id = auth.uid()
      and active = true
      and role::text in ('admin_master_global', 'company_admin', 'admin_master', 'gestor', 'tecnico', 'topografo', 'agrimensor', 'administrativo', 'financeiro')
  )
$$;

drop policy if exists "company members read own company" on companies;
drop policy if exists "companies global access" on companies;
drop policy if exists "companies own company read" on companies;

create policy "companies global access" on companies
  for all using (is_admin_master_global())
  with check (is_admin_master_global());

create policy "companies own company read" on companies
  for select using (id = current_company_id());

drop policy if exists "users global access" on user_profiles;
drop policy if exists "users company admin manage own" on user_profiles;

create policy "users global access" on user_profiles
  for all using (is_admin_master_global())
  with check (is_admin_master_global());

create policy "users company admin manage own" on user_profiles
  for all using (
    company_id = current_company_id()
    and current_user_role_text() in ('company_admin', 'admin_master')
  )
  with check (
    company_id = current_company_id()
    and current_user_role_text() in ('company_admin', 'admin_master')
  );

drop policy if exists "clients role aware select" on clients;
drop policy if exists "clients internal write" on clients;
create policy "clients role aware select" on clients
  for select using (
    company_id = current_company_id()
    and (is_internal_user() or (current_user_role_text() = 'cliente' and id = current_client_id()))
  );
create policy "clients internal write" on clients
  for all using (company_id = current_company_id() and current_user_role_text() in ('admin_master_global','company_admin','admin_master','gestor','administrativo'))
  with check (company_id = current_company_id() and current_user_role_text() in ('admin_master_global','company_admin','admin_master','gestor','administrativo'));

drop policy if exists "properties role aware select" on rural_properties;
drop policy if exists "properties internal write" on rural_properties;
create policy "properties role aware select" on rural_properties
  for select using (
    company_id = current_company_id()
    and (
      current_user_role_text() in ('admin_master_global','company_admin','admin_master','gestor','administrativo','financeiro','topografo','agrimensor')
      or (current_user_role_text() = 'tecnico' and responsible_id = auth.uid())
      or (current_user_role_text() = 'cliente' and client_id = current_client_id())
    )
  );
create policy "properties internal write" on rural_properties
  for all using (company_id = current_company_id() and current_user_role_text() in ('admin_master_global','company_admin','admin_master','gestor','tecnico','topografo','agrimensor','administrativo'))
  with check (company_id = current_company_id() and current_user_role_text() in ('admin_master_global','company_admin','admin_master','gestor','tecnico','topografo','agrimensor','administrativo'));

drop policy if exists "services role aware select" on services;
drop policy if exists "services internal write" on services;
create policy "services role aware select" on services
  for select using (
    company_id = current_company_id()
    and (
      current_user_role_text() in ('admin_master_global','company_admin','admin_master','gestor','administrativo','financeiro','topografo','agrimensor')
      or (current_user_role_text() = 'tecnico' and responsible_id = auth.uid())
      or (current_user_role_text() = 'cliente' and client_id = current_client_id())
    )
  );
create policy "services internal write" on services
  for all using (company_id = current_company_id() and current_user_role_text() in ('admin_master_global','company_admin','admin_master','gestor','tecnico','topografo','agrimensor','administrativo'))
  with check (company_id = current_company_id() and current_user_role_text() in ('admin_master_global','company_admin','admin_master','gestor','tecnico','topografo','agrimensor','administrativo'));

drop policy if exists "pending role aware select" on pending_items;
drop policy if exists "pending internal write" on pending_items;
create policy "pending role aware select" on pending_items
  for select using (
    company_id = current_company_id()
    and (
      is_internal_user()
      or (current_user_role_text() = 'cliente' and client_id = current_client_id() and visible_on_portal = true)
    )
  );
create policy "pending internal write" on pending_items
  for all using (company_id = current_company_id() and current_user_role_text() in ('admin_master_global','company_admin','admin_master','gestor','tecnico','topografo','agrimensor','administrativo'))
  with check (company_id = current_company_id() and current_user_role_text() in ('admin_master_global','company_admin','admin_master','gestor','tecnico','topografo','agrimensor','administrativo'));

drop policy if exists "documents role aware select" on documents;
drop policy if exists "documents internal client write" on documents;
create policy "documents role aware select" on documents
  for select using (
    company_id = current_company_id()
    and deleted_at is null
    and (
      is_internal_user()
      or (current_user_role_text() = 'cliente' and client_id = current_client_id() and visible_on_portal = true)
      or uploaded_by = auth.uid()
    )
  );
create policy "documents internal client write" on documents
  for all using (
    company_id = current_company_id()
    and (
      current_user_role_text() in ('admin_master_global','company_admin','admin_master','gestor','tecnico','topografo','agrimensor','administrativo')
      or (current_user_role_text() = 'cliente' and client_id = current_client_id())
    )
  )
  with check (
    company_id = current_company_id()
    and (
      current_user_role_text() in ('admin_master_global','company_admin','admin_master','gestor','tecnico','topografo','agrimensor','administrativo')
      or (current_user_role_text() = 'cliente' and client_id = current_client_id())
    )
  );

drop policy if exists "financial role aware select" on financial_entries;
drop policy if exists "financial role aware write" on financial_entries;
create policy "financial role aware select" on financial_entries
  for select using (
    company_id = current_company_id()
    and (
      current_user_role_text() in ('admin_master_global','company_admin','admin_master','gestor','financeiro')
      or (current_user_role_text() = 'cliente' and client_id = current_client_id() and visible_on_portal = true)
    )
  );
create policy "financial role aware write" on financial_entries
  for all using (company_id = current_company_id() and current_user_role_text() in ('admin_master_global','company_admin','admin_master','gestor','financeiro'))
  with check (company_id = current_company_id() and current_user_role_text() in ('admin_master_global','company_admin','admin_master','gestor','financeiro'));

drop policy if exists "audit read by admin master" on audit_logs;
create policy "audit read by admin master" on audit_logs
  for select using (company_id = current_company_id() and current_user_role_text() in ('admin_master_global','company_admin','admin_master'));

drop policy if exists "roles admin read write" on roles;
create policy "roles admin read write" on roles
  for all using (company_id = current_company_id() and current_user_role_text() in ('admin_master_global','company_admin','admin_master'))
  with check (company_id = current_company_id() and current_user_role_text() in ('admin_master_global','company_admin','admin_master'));

drop policy if exists "user permissions admin" on user_permissions;
create policy "user permissions admin" on user_permissions
  for all using (company_id = current_company_id() and current_user_role_text() in ('admin_master_global','company_admin','admin_master'))
  with check (company_id = current_company_id() and current_user_role_text() in ('admin_master_global','company_admin','admin_master'));

do $$
declare
  table_name text;
  scoped_tables text[] := array[
    'company_units',
    'roles',
    'user_permissions',
    'client_portal_access',
    'leads',
    'clients',
    'rural_properties',
    'services',
    'service_checklists',
    'protocols',
    'pending_items',
    'documents',
    'geo_files',
    'property_vertices',
    'property_neighbors',
    'field_equipment',
    'equipment_movements',
    'inspections',
    'registry_records',
    'registry_requirements',
    'property_certificates',
    'official_checks',
    'document_library_items',
    'official_templates',
    'commercial_templates',
    'generated_commercial_documents',
    'due_diligence_cases',
    'due_diligence_risks',
    'ownership_chain',
    'financial_entries',
    'aged_producer_registrations',
    'aged_property_registrations',
    'aged_livestock_exploitations',
    'aged_gta_records',
    'iterma_cases',
    'rural_contracts',
    'car_records',
    'ccir_records',
    'itr_records',
    'sigef_records',
    'cib_nirf_records',
    'technical_area_comparisons',
    'reports',
    'report_exports',
    'audit_logs'
  ];
begin
  foreach table_name in array scoped_tables loop
    if to_regclass('public.' || table_name) is not null then
      execute format('drop policy if exists "global master all access" on %I', table_name);
      execute format('create policy "global master all access" on %I for all using (is_admin_master_global()) with check (is_admin_master_global())', table_name);
    end if;
  end loop;
end $$;

drop policy if exists "area comparisons company access" on technical_area_comparisons;
create policy "area comparisons company access" on technical_area_comparisons
  for all using (company_id = current_company_id() and is_internal_user())
  with check (company_id = current_company_id() and is_internal_user());

drop policy if exists "reports company access" on reports;
create policy "reports company access" on reports
  for all using (
    company_id = current_company_id()
    and (
      is_internal_user()
      or (visible_on_portal = true and client_id = current_client_id())
    )
  )
  with check (company_id = current_company_id() and is_internal_user());

drop policy if exists "report exports company access" on report_exports;
create policy "report exports company access" on report_exports
  for all using (company_id = current_company_id() and is_internal_user())
  with check (company_id = current_company_id() and is_internal_user());

drop policy if exists "nex rural storage global read" on storage.objects;
create policy "nex rural storage global read" on storage.objects
  for select using (bucket_id = 'nex-rural-documents' and is_admin_master_global());

drop policy if exists "nex rural storage global write" on storage.objects;
create policy "nex rural storage global write" on storage.objects
  for all using (bucket_id = 'nex-rural-documents' and is_admin_master_global())
  with check (bucket_id = 'nex-rural-documents' and is_admin_master_global());
