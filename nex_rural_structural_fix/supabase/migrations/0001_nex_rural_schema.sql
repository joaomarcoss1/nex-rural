create extension if not exists "uuid-ossp";

create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  trade_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table company_units (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  city text,
  state text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type app_role as enum ('admin_master','gestor','tecnico','administrativo','financeiro','cliente');

create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  full_name text not null,
  role app_role not null default 'administrativo',
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  type text not null,
  name text not null,
  document text,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  state text,
  responsible_id uuid references user_profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  created_by uuid references auth.users(id),
  name text not null,
  phone text,
  email text,
  document text,
  city text,
  state text,
  interest_type text,
  origin text,
  channel text,
  responsible_id uuid references user_profiles(id),
  status text not null default 'Novo lead',
  priority text not null default 'Media',
  estimated_value numeric(14,2) default 0,
  next_contact date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rural_properties (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  name text not null,
  property_type text,
  municipality text,
  state text,
  rural_address text,
  declared_area numeric(14,4),
  measured_area numeric(14,4),
  registered_area numeric(14,4),
  area_unit text default 'ha',
  registry_number text,
  registry_office text,
  ccir text,
  car text,
  itr text,
  cib text,
  nirf text,
  sigef text,
  incra text,
  latitude text,
  longitude text,
  coordinates jsonb default '[]',
  documental_status text,
  registry_status text,
  environmental_status text,
  tax_status text,
  land_status text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table service_types (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table services (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  property_id uuid references rural_properties(id) on delete set null,
  service_type_id uuid references service_types(id),
  created_by uuid references auth.users(id),
  responsible_id uuid references user_profiles(id),
  status text not null default 'Novo',
  priority text not null default 'Media',
  start_date date,
  expected_end_date date,
  contracted_value numeric(14,2) default 0,
  payment_method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table checklist_items (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  service_type_id uuid references service_types(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table service_checklists (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  checklist_item_id uuid references checklist_items(id),
  title text not null,
  status text not null default 'Pendente',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table protocols (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  agency text not null,
  protocol_number text,
  protocol_date date,
  responsible_id uuid references user_profiles(id),
  status text not null default 'Protocolado',
  expected_deadline date,
  return_date date,
  external_link text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pending_items (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  responsible_id uuid references user_profiles(id),
  title text not null,
  description text,
  category text not null,
  due_date date,
  priority text not null default 'Media',
  status text not null default 'Aberta',
  visible_on_portal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  protocol_id uuid references protocols(id) on delete set null,
  pending_item_id uuid references pending_items(id) on delete set null,
  category text not null,
  name text not null,
  storage_path text not null,
  status text not null default 'Enviado',
  visible_on_portal boolean not null default false,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table document_versions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  version integer not null,
  storage_path text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table service_tasks (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  responsible_id uuid references user_profiles(id),
  title text not null,
  description text,
  due_date date,
  priority text not null default 'Media',
  status text not null default 'Aberta',
  task_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table inspections (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  technician_id uuid references user_profiles(id),
  scheduled_at timestamptz,
  location text,
  status text not null default 'Agendada',
  objective text,
  coordinates jsonb default '{}',
  checklist jsonb default '[]',
  result text,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table calendar_events (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  responsible_id uuid references user_profiles(id),
  title text not null,
  event_type text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  status text not null default 'Agendado',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table financial_entries (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  entry_type text not null,
  category text not null,
  amount numeric(14,2) not null,
  due_date date,
  paid_at date,
  payment_method text,
  status text not null default 'A receber',
  notes text,
  receipt_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  sender_id uuid references auth.users(id),
  recipient_id uuid references auth.users(id),
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  content text not null,
  visibility text not null default 'Interna',
  status text not null default 'Aberta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text,
  notification_type text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  record_table text,
  record_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create table property_dossiers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  property_id uuid not null references rural_properties(id) on delete cascade,
  generated_by uuid references auth.users(id),
  pdf_path text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function current_company_id()
returns uuid
language sql
stable
as $$
  select company_id from user_profiles where id = auth.uid()
$$;

create or replace function is_admin_master()
returns boolean
language sql
stable
as $$
  select exists(select 1 from user_profiles where id = auth.uid() and role = 'admin_master')
$$;

alter table companies enable row level security;
alter table company_units enable row level security;
alter table user_profiles enable row level security;
alter table clients enable row level security;
alter table leads enable row level security;
alter table rural_properties enable row level security;
alter table service_types enable row level security;
alter table services enable row level security;
alter table checklist_items enable row level security;
alter table service_checklists enable row level security;
alter table protocols enable row level security;
alter table pending_items enable row level security;
alter table documents enable row level security;
alter table document_versions enable row level security;
alter table service_tasks enable row level security;
alter table inspections enable row level security;
alter table calendar_events enable row level security;
alter table financial_entries enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;
alter table property_dossiers enable row level security;

create policy "company members read own company" on companies
  for select using (id = current_company_id());

create policy "users read own profile company" on user_profiles
  for select using (company_id = current_company_id() or id = auth.uid());

create policy "admins manage profiles" on user_profiles
  for all using (company_id = current_company_id() and is_admin_master())
  with check (company_id = current_company_id() and is_admin_master());

create policy "company_units isolation" on company_units
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "clients isolation" on clients
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "leads isolation" on leads
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "properties isolation" on rural_properties
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "services isolation" on services
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "service types isolation" on service_types
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "checklist isolation" on checklist_items
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "service checklist isolation" on service_checklists
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "protocols isolation" on protocols
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "pending isolation" on pending_items
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "documents isolation" on documents
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "document versions isolation" on document_versions
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "tasks isolation" on service_tasks
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "inspections isolation" on inspections
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "calendar isolation" on calendar_events
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "financial isolation" on financial_entries
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "messages isolation" on messages
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "notifications own user" on notifications
  for select using (company_id = current_company_id() and user_id = auth.uid());

create policy "audit read by admins" on audit_logs
  for select using (company_id = current_company_id() and is_admin_master());

create policy "dossiers isolation" on property_dossiers
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());
