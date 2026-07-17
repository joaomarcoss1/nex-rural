-- Nex Rural - hardening para piloto real
-- Execute apos 0005_multiempresa_global_geo_reports.sql.

alter table audit_logs add column if not exists ip_address text;
alter table audit_logs add column if not exists failure_reason text;

alter table clients add column if not exists client_access_code_expires_at timestamptz;
alter table clients add column if not exists portal_blocked_until timestamptz;
alter table clients add column if not exists portal_last_access_at timestamptz;

create table if not exists portal_access_attempts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete set null,
  company_code_attempted text,
  full_name_attempted text,
  client_identifier_attempted text,
  success boolean not null default false,
  failure_reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table portal_access_attempts enable row level security;

drop policy if exists "portal attempts admin read" on portal_access_attempts;
create policy "portal attempts admin read" on portal_access_attempts
  for select using (
    is_admin_master_global()
    or (
      company_id = current_company_id()
      and current_user_role_text() in ('admin_master', 'company_admin')
    )
  );

drop policy if exists "portal attempts service insert" on portal_access_attempts;

create index if not exists portal_attempts_company_created_idx on portal_access_attempts(company_id, created_at desc);
create index if not exists portal_attempts_ip_created_idx on portal_access_attempts(ip_address, created_at desc);
create index if not exists audit_logs_company_created_idx on audit_logs(company_id, created_at desc);
create index if not exists documents_company_client_portal_idx on documents(company_id, client_id, visible_on_portal);
create index if not exists pending_company_client_portal_idx on pending_items(company_id, client_id, visible_on_portal);
create index if not exists finance_company_client_portal_idx on financial_entries(company_id, client_id, visible_on_portal);
create index if not exists services_company_client_idx on services(company_id, client_id);
create index if not exists properties_company_client_idx on rural_properties(company_id, client_id);
create index if not exists geo_files_company_property_portal_idx on geo_files(company_id, property_id, visible_on_portal);
create index if not exists vertices_company_property_idx on property_vertices(company_id, property_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'property_vertices_latitude_range'
  ) then
    alter table property_vertices
      add constraint property_vertices_latitude_range
      check (latitude is null or (latitude >= -90 and latitude <= 90));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'property_vertices_longitude_range'
  ) then
    alter table property_vertices
      add constraint property_vertices_longitude_range
      check (longitude is null or (longitude >= -180 and longitude <= 180));
  end if;
end $$;

insert into permissions (code, description)
values
  ('portal.audit.read', 'Consultar tentativas de acesso do portal'),
  ('pilot.verify', 'Executar verificacoes de piloto')
on conflict (code) do nothing;
