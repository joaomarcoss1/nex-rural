create table property_maps (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  property_id uuid not null references rural_properties(id) on delete cascade,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  center_latitude numeric(12,8),
  center_longitude numeric(12,8),
  polygon_geojson jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table geo_files (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  property_id uuid not null references rural_properties(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  name text not null,
  file_type text not null,
  category text not null,
  storage_path text not null,
  version text default 'v1',
  status text not null default 'Recebido',
  visible_on_portal boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table property_neighbors (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  property_id uuid not null references rural_properties(id) on delete cascade,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  name text not null,
  document text,
  neighbor_type text,
  neighbor_property_name text,
  phone text,
  email text,
  address text,
  consent_status text not null default 'Nao solicitado',
  boundary_section text,
  last_contact_date date,
  contact_responsible_id uuid references user_profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table property_vertices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  property_id uuid not null references rural_properties(id) on delete cascade,
  neighbor_id uuid references property_neighbors(id) on delete set null,
  source_geo_file_id uuid references geo_files(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  code text not null,
  perimeter_order integer not null,
  latitude numeric(12,8),
  longitude numeric(12,8),
  utm_easting text,
  utm_northing text,
  zone text,
  datum text default 'SIRGAS 2000',
  altitude numeric(12,3),
  monument_type text,
  boundary_type text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table field_equipment (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  name text not null,
  equipment_type text not null,
  brand text,
  model text,
  serial_number text,
  asset_tag text,
  conservation_state text,
  current_responsible_id uuid references user_profiles(id),
  unit_id uuid references company_units(id),
  status text not null default 'Disponivel',
  acquired_at date,
  last_maintenance_at date,
  next_maintenance_at date,
  last_calibration_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table equipment_movements (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  equipment_id uuid not null references field_equipment(id) on delete cascade,
  inspection_id uuid,
  created_by uuid references auth.users(id),
  movement_type text not null,
  responsible_id uuid references user_profiles(id),
  occurred_at timestamptz not null default now(),
  condition_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table registry_records (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  registry_office text not null,
  jurisdiction text,
  municipality text,
  state text,
  registry_number text,
  cnm text,
  book text,
  page text,
  act_type text not null,
  protocol_number text,
  prenotation_number text,
  prenotation_date date,
  prenotation_deadline date,
  fees numeric(14,2) default 0,
  title_status text not null default 'Em preparacao',
  responsible_id uuid references user_profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table registry_requirements (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  registry_record_id uuid not null references registry_records(id) on delete cascade,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  requirement_type text not null,
  description text not null,
  issued_at date,
  due_date date,
  responsible_id uuid references user_profiles(id),
  status text not null default 'Aberta',
  required_documents text,
  response_sent text,
  fulfilled_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table due_diligence_cases (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  current_owner text,
  purpose text not null,
  technical_responsible_id uuid references user_profiles(id),
  legal_responsible_id uuid references user_profiles(id),
  start_date date,
  expected_end_date date,
  status text not null default 'Iniciada',
  risk_level text not null default 'Indefinido',
  conclusion text,
  recommendations text,
  final_report_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table due_diligence_checklist_items (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  due_diligence_case_id uuid not null references due_diligence_cases(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  item_group text not null,
  title text not null,
  status text not null default 'Nao iniciado',
  responsible_id uuid references user_profiles(id),
  risk_level text not null default 'Indefinido',
  notes text,
  recommendation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table ownership_chain (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  property_id uuid not null references rural_properties(id) on delete cascade,
  due_diligence_case_id uuid references due_diligence_cases(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  chronological_order integer not null,
  previous_owner text,
  owner_at_time text,
  acquisition_type text,
  base_document text,
  registration_number text,
  registry_office text,
  act_date date,
  informed_area text,
  inconsistencies text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table property_certificates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  certificate_type text not null,
  issuer text,
  municipality text,
  state text,
  requested_at date,
  issued_at date,
  valid_until date,
  status text not null default 'Solicitada',
  cost numeric(14,2) default 0,
  responsible_id uuid references user_profiles(id),
  file_path text,
  visible_on_portal boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table official_checks (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  property_id uuid not null references rural_properties(id) on delete cascade,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  check_type text not null,
  platform text not null,
  checked_at date,
  responsible_id uuid references user_profiles(id),
  result text,
  divergence text,
  attachment_path text,
  status text not null default 'Nao consultado',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table rural_calendar_alerts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  title text not null,
  alert_type text not null,
  responsible_id uuid references user_profiles(id),
  alert_date date not null,
  priority text not null default 'Media',
  status text not null default 'Pendente',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table commercial_templates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  name text not null,
  template_type text not null,
  body text not null,
  variables jsonb not null default '[]',
  status text not null default 'Ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table generated_commercial_documents (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  template_id uuid references commercial_templates(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  title text not null,
  generated_payload jsonb not null default '{}',
  pdf_path text,
  signed_file_path text,
  signed boolean not null default false,
  visible_on_portal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table property_maps enable row level security;
alter table geo_files enable row level security;
alter table property_neighbors enable row level security;
alter table property_vertices enable row level security;
alter table field_equipment enable row level security;
alter table equipment_movements enable row level security;
alter table registry_records enable row level security;
alter table registry_requirements enable row level security;
alter table due_diligence_cases enable row level security;
alter table due_diligence_checklist_items enable row level security;
alter table ownership_chain enable row level security;
alter table property_certificates enable row level security;
alter table official_checks enable row level security;
alter table rural_calendar_alerts enable row level security;
alter table commercial_templates enable row level security;
alter table generated_commercial_documents enable row level security;

create policy "property_maps isolation" on property_maps for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "geo_files isolation" on geo_files for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "property_neighbors isolation" on property_neighbors for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "property_vertices isolation" on property_vertices for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "field_equipment isolation" on field_equipment for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "equipment_movements isolation" on equipment_movements for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "registry_records isolation" on registry_records for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "registry_requirements isolation" on registry_requirements for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "due_diligence_cases isolation" on due_diligence_cases for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "due_diligence_checklist isolation" on due_diligence_checklist_items for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "ownership_chain isolation" on ownership_chain for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "property_certificates isolation" on property_certificates for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "official_checks isolation" on official_checks for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "rural_calendar_alerts isolation" on rural_calendar_alerts for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "commercial_templates isolation" on commercial_templates for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "generated_commercial_documents isolation" on generated_commercial_documents for all using (company_id = current_company_id()) with check (company_id = current_company_id());

create policy "portal reads released geo files" on geo_files
  for select using (company_id = current_company_id() and visible_on_portal = true);

create policy "portal reads released certificates" on property_certificates
  for select using (company_id = current_company_id() and visible_on_portal = true);

create policy "portal reads released commercial documents" on generated_commercial_documents
  for select using (company_id = current_company_id() and visible_on_portal = true);
