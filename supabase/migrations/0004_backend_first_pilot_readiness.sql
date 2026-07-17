create extension if not exists "uuid-ossp";

alter table user_profiles add column if not exists email text;
alter table user_profiles add column if not exists client_id uuid references clients(id) on delete set null;
alter table user_profiles add column if not exists last_login_at timestamptz;

alter table rural_properties add column if not exists responsible_id uuid references user_profiles(id) on delete set null;
alter table documents add column if not exists original_name text;
alter table documents add column if not exists mime_type text;
alter table documents add column if not exists extension text;
alter table documents add column if not exists size bigint;
alter table documents add column if not exists version integer not null default 1;
alter table documents add column if not exists approved_by uuid references auth.users(id);
alter table documents add column if not exists approved_at timestamptz;
alter table documents add column if not exists rejected_reason text;
alter table documents add column if not exists deleted_at timestamptz;
alter table documents alter column status set default 'Recebido';
alter table financial_entries add column if not exists visible_on_portal boolean not null default false;
alter table audit_logs add column if not exists user_role text;
alter table audit_logs add column if not exists entity text;
alter table audit_logs add column if not exists entity_id uuid;
alter table audit_logs add column if not exists user_agent text;

create table if not exists roles (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  slug app_role not null,
  description text,
  system_role boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, slug)
);

create table if not exists permissions (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists user_permissions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, permission_id)
);

create table if not exists client_portal_access (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  active boolean not null default true,
  invited_at timestamptz,
  last_access_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, client_id, user_id)
);

create table if not exists document_library_items (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  process_type text not null,
  document_name text not null,
  description text,
  required boolean not null default true,
  provided_by text not null default 'cliente',
  validity_days integer,
  template_id uuid,
  notes text,
  checklist_order integer not null default 0,
  visible_on_portal boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists official_templates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  category text not null,
  body text not null,
  variables text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists due_diligence_risks (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  case_id uuid references due_diligence_cases(id) on delete cascade,
  title text not null,
  category text not null,
  description text,
  origin text,
  document_id uuid references documents(id) on delete set null,
  impact integer not null default 1,
  probability integer not null default 1,
  severity text generated always as (
    case
      when impact * probability >= 16 then 'Critico'
      when impact * probability >= 9 then 'Alto'
      when impact * probability >= 4 then 'Medio'
      else 'Baixo'
    end
  ) stored,
  recommendation text,
  responsible_id uuid references user_profiles(id) on delete set null,
  status text not null default 'Aberto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists aged_gta_records (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  number text,
  series text,
  species text,
  quantity numeric(14,2),
  origin text,
  destination text,
  purpose text,
  transporter text,
  vehicle text,
  issued_at date,
  expires_at date,
  status text not null default 'Registrada',
  document_id uuid references documents(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists car_records (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete cascade,
  car_number text,
  receipt text,
  state_agency text,
  app_area numeric(14,4),
  legal_reserve_area numeric(14,4),
  consolidated_area numeric(14,4),
  productive_area numeric(14,4),
  environmental_status text,
  analysis_status text,
  divergences text,
  overlap_status text,
  downloaded_documents jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ccir_records (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete cascade,
  incra_code text,
  ccir_number text,
  fiscal_year text,
  issued_at date,
  fee_value numeric(14,2),
  payment_document_id uuid references documents(id) on delete set null,
  status text,
  pending_notes text,
  sncr_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists itr_records (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete cascade,
  fiscal_year text,
  holder text,
  cib text,
  total_area numeric(14,4),
  taxable_area numeric(14,4),
  exempt_areas numeric(14,4),
  declared_value numeric(14,2),
  darf_document_id uuid references documents(id) on delete set null,
  receipt_document_id uuid references documents(id) on delete set null,
  sent_at date,
  status text,
  deadline date,
  late_alert boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sigef_records (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete cascade,
  protocol_number text,
  certification_status text,
  technical_responsible_id uuid references user_profiles(id) on delete set null,
  art text,
  spreadsheet_document_id uuid references documents(id) on delete set null,
  map_document_id uuid references documents(id) on delete set null,
  memorial_document_id uuid references documents(id) on delete set null,
  certification_document_id uuid references documents(id) on delete set null,
  overlap_status text,
  requirement_notes text,
  sent_at date,
  approved_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cib_nirf_records (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete cascade,
  number text,
  record_type text not null default 'CIB',
  holder text,
  status text,
  proof_document_id uuid references documents(id) on delete set null,
  divergences text,
  updated_on date,
  official_check_id uuid references official_checks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from user_profiles where id = auth.uid() and active = true
$$;

create or replace function current_user_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from user_profiles where id = auth.uid() and active = true
$$;

create or replace function current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from user_profiles where id = auth.uid() and active = true
$$;

create or replace function is_admin_master()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from user_profiles where id = auth.uid() and role = 'admin_master' and active = true)
$$;

create or replace function is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_user_role() in ('admin_master','gestor','tecnico','administrativo','financeiro')
$$;

alter table roles enable row level security;
alter table permissions enable row level security;
alter table user_permissions enable row level security;
alter table client_portal_access enable row level security;
alter table document_library_items enable row level security;
alter table official_templates enable row level security;
alter table due_diligence_risks enable row level security;
alter table aged_gta_records enable row level security;
alter table car_records enable row level security;
alter table ccir_records enable row level security;
alter table itr_records enable row level security;
alter table sigef_records enable row level security;
alter table cib_nirf_records enable row level security;

drop policy if exists "clients isolation" on clients;
drop policy if exists "properties isolation" on rural_properties;
drop policy if exists "services isolation" on services;
drop policy if exists "pending isolation" on pending_items;
drop policy if exists "documents isolation" on documents;
drop policy if exists "financial isolation" on financial_entries;
drop policy if exists "audit read by admins" on audit_logs;

create policy "clients role aware select" on clients
  for select using (
    company_id = current_company_id()
    and (is_internal_user() or (current_user_role() = 'cliente' and id = current_client_id()))
  );
create policy "clients internal write" on clients
  for all using (company_id = current_company_id() and current_user_role() in ('admin_master','gestor','administrativo'))
  with check (company_id = current_company_id() and current_user_role() in ('admin_master','gestor','administrativo'));

create policy "properties role aware select" on rural_properties
  for select using (
    company_id = current_company_id()
    and (
      current_user_role() in ('admin_master','gestor','administrativo','financeiro')
      or (current_user_role() = 'tecnico' and responsible_id = auth.uid())
      or (current_user_role() = 'cliente' and client_id = current_client_id())
    )
  );
create policy "properties internal write" on rural_properties
  for all using (company_id = current_company_id() and current_user_role() in ('admin_master','gestor','tecnico','administrativo'))
  with check (company_id = current_company_id() and current_user_role() in ('admin_master','gestor','tecnico','administrativo'));

create policy "services role aware select" on services
  for select using (
    company_id = current_company_id()
    and (
      current_user_role() in ('admin_master','gestor','administrativo','financeiro')
      or (current_user_role() = 'tecnico' and responsible_id = auth.uid())
      or (current_user_role() = 'cliente' and client_id = current_client_id())
    )
  );
create policy "services internal write" on services
  for all using (company_id = current_company_id() and current_user_role() in ('admin_master','gestor','tecnico','administrativo'))
  with check (company_id = current_company_id() and current_user_role() in ('admin_master','gestor','tecnico','administrativo'));

create policy "pending role aware select" on pending_items
  for select using (
    company_id = current_company_id()
    and (
      is_internal_user()
      or (current_user_role() = 'cliente' and client_id = current_client_id() and visible_on_portal = true)
    )
  );
create policy "pending internal write" on pending_items
  for all using (company_id = current_company_id() and current_user_role() in ('admin_master','gestor','tecnico','administrativo'))
  with check (company_id = current_company_id() and current_user_role() in ('admin_master','gestor','tecnico','administrativo'));

create policy "documents role aware select" on documents
  for select using (
    company_id = current_company_id()
    and deleted_at is null
    and (
      is_internal_user()
      or (current_user_role() = 'cliente' and client_id = current_client_id() and visible_on_portal = true)
      or uploaded_by = auth.uid()
    )
  );
create policy "documents internal client write" on documents
  for all using (
    company_id = current_company_id()
    and (
      current_user_role() in ('admin_master','gestor','tecnico','administrativo')
      or (current_user_role() = 'cliente' and client_id = current_client_id())
    )
  )
  with check (
    company_id = current_company_id()
    and (
      current_user_role() in ('admin_master','gestor','tecnico','administrativo')
      or (current_user_role() = 'cliente' and client_id = current_client_id())
    )
  );

create policy "financial role aware select" on financial_entries
  for select using (
    company_id = current_company_id()
    and (
      current_user_role() in ('admin_master','gestor','financeiro')
      or (current_user_role() = 'cliente' and client_id = current_client_id() and visible_on_portal = true)
    )
  );
create policy "financial role aware write" on financial_entries
  for all using (company_id = current_company_id() and current_user_role() in ('admin_master','gestor','financeiro'))
  with check (company_id = current_company_id() and current_user_role() in ('admin_master','gestor','financeiro'));

create policy "audit read by admin master" on audit_logs
  for select using (company_id = current_company_id() and current_user_role() = 'admin_master');
create policy "audit insert own company" on audit_logs
  for insert with check (company_id = current_company_id() or company_id is null);

create policy "roles admin read write" on roles
  for all using (company_id = current_company_id() and current_user_role() = 'admin_master')
  with check (company_id = current_company_id() and current_user_role() = 'admin_master');
create policy "permissions internal read" on permissions
  for select using (is_internal_user());
create policy "user permissions admin" on user_permissions
  for all using (company_id = current_company_id() and current_user_role() = 'admin_master')
  with check (company_id = current_company_id() and current_user_role() = 'admin_master');
create policy "portal access scoped" on client_portal_access
  for all using (
    company_id = current_company_id()
    and (is_internal_user() or (current_user_role() = 'cliente' and user_id = auth.uid() and client_id = current_client_id()))
  )
  with check (company_id = current_company_id() and is_internal_user());

create policy "document library company access" on document_library_items
  for all using (company_id = current_company_id() and is_internal_user())
  with check (company_id = current_company_id() and is_internal_user());
create policy "official templates company access" on official_templates
  for all using (company_id = current_company_id() and is_internal_user())
  with check (company_id = current_company_id() and is_internal_user());
create policy "due diligence risks company access" on due_diligence_risks
  for all using (company_id = current_company_id() and is_internal_user())
  with check (company_id = current_company_id() and is_internal_user());

create policy "aged gta company access" on aged_gta_records
  for all using (company_id = current_company_id() and is_internal_user())
  with check (company_id = current_company_id() and is_internal_user());
create policy "car company access" on car_records
  for all using (company_id = current_company_id() and is_internal_user())
  with check (company_id = current_company_id() and is_internal_user());
create policy "ccir company access" on ccir_records
  for all using (company_id = current_company_id() and is_internal_user())
  with check (company_id = current_company_id() and is_internal_user());
create policy "itr company access" on itr_records
  for all using (company_id = current_company_id() and is_internal_user())
  with check (company_id = current_company_id() and is_internal_user());
create policy "sigef company access" on sigef_records
  for all using (company_id = current_company_id() and is_internal_user())
  with check (company_id = current_company_id() and is_internal_user());
create policy "cib nirf company access" on cib_nirf_records
  for all using (company_id = current_company_id() and is_internal_user())
  with check (company_id = current_company_id() and is_internal_user());

insert into permissions (code, description) values
  ('settings.manage', 'Gerenciar configuracoes criticas'),
  ('documents.approve', 'Aprovar e reprovar documentos'),
  ('portal.release', 'Liberar itens no portal do cliente'),
  ('finance.manage', 'Gerenciar financeiro'),
  ('geo.manage', 'Alterar geoprocessamento'),
  ('audit.read', 'Consultar auditoria')
on conflict (code) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('nex-rural-documents', 'nex-rural-documents', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists "nex rural storage read" on storage.objects;
drop policy if exists "nex rural storage write" on storage.objects;

create policy "nex rural storage read" on storage.objects
  for select using (
    bucket_id = 'nex-rural-documents'
    and exists (
      select 1
      from documents d
      where d.storage_path = storage.objects.name
        and d.company_id = current_company_id()
        and (
          is_internal_user()
          or (current_user_role() = 'cliente' and d.client_id = current_client_id() and d.visible_on_portal = true)
          or d.uploaded_by = auth.uid()
        )
    )
  );

create policy "nex rural storage write" on storage.objects
  for insert with check (
    bucket_id = 'nex-rural-documents'
    and (is_internal_user() or current_user_role() = 'cliente')
  );
