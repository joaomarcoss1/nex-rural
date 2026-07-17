create table aged_producer_registrations (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  document text,
  state_registration text,
  sigama_email text,
  phone text,
  aged_status text not null default 'Pendente',
  regional_office text,
  last_update date,
  next_update date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table aged_property_registrations (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  aged_producer_id uuid references aged_producer_registrations(id) on delete cascade,
  property_id uuid references rural_properties(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  aged_code text,
  municipality text,
  main_exploitation text,
  status text not null default 'Pendente',
  possession_document_path text,
  update_receipt_path text,
  pending_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table aged_livestock_exploitations (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  aged_property_id uuid references aged_property_registrations(id) on delete cascade,
  created_by uuid references auth.users(id),
  animal_type text not null,
  declared_quantity integer default 0,
  purpose text,
  last_update date,
  status text not null default 'Ativo',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table iterma_cases (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  beneficiary_type text,
  occupation_time text,
  requested_area numeric(14,4),
  process_number text,
  status text not null default 'Triagem',
  current_stage text not null default 'Triagem',
  agency text default 'ITERMA',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table rural_contracts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references rural_properties(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  contract_type text not null,
  parties jsonb not null default '[]',
  object text,
  area text,
  term text,
  amount numeric(14,2) default 0,
  payment_terms text,
  obligations text,
  status text not null default 'Em elaboracao',
  version text default 'v1',
  pdf_path text,
  signed_file_path text,
  visible_on_portal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table aged_producer_registrations enable row level security;
alter table aged_property_registrations enable row level security;
alter table aged_livestock_exploitations enable row level security;
alter table iterma_cases enable row level security;
alter table rural_contracts enable row level security;

create policy "aged producers isolation" on aged_producer_registrations for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "aged properties isolation" on aged_property_registrations for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "aged exploitations isolation" on aged_livestock_exploitations for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "iterma isolation" on iterma_cases for all using (company_id = current_company_id()) with check (company_id = current_company_id());
create policy "rural contracts isolation" on rural_contracts for all using (company_id = current_company_id()) with check (company_id = current_company_id());

create policy "portal reads released rural contracts" on rural_contracts
  for select using (company_id = current_company_id() and visible_on_portal = true);
