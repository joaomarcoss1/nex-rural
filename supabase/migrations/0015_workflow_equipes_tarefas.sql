-- =========================================================
-- 0015 - Workflow, Equipes e Tarefas - Nex Gestão Rural
-- Módulo operacional multiempresa com tarefas, Kanban,
-- equipes, notificações, anexos e modelos de workflow.
-- =========================================================

create extension if not exists pgcrypto;

-- Buckets necessários para anexos do workflow.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workflow-attachments', 'workflow-attachments', false, 52428800, null)
on conflict (id) do nothing;

-- Status customizáveis por empresa.
create table if not exists public.workflow_statuses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  color_class text default 'bg-stone-100 text-stone-700',
  icon text default '•',
  sort_order integer default 0,
  internal_type text default 'custom',
  is_done boolean default false,
  is_blocked boolean default false,
  active boolean default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  category text,
  status text default 'Ativo',
  version integer not null default 1,
  active boolean default true,
  settings jsonb default '{}',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.workflow_template_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid not null references public.workflow_templates(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null default '{}',
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid references public.workflow_templates(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer default 0,
  default_status text default 'Não iniciada',
  default_due_days integer default 3,
  default_responsible_role text,
  required boolean default true,
  rules jsonb default '{}',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.workflow_transitions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid references public.workflow_templates(id) on delete cascade,
  from_stage_id uuid references public.workflow_stages(id) on delete cascade,
  to_stage_id uuid references public.workflow_stages(id) on delete cascade,
  rules jsonb default '{}',
  active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid references public.workflow_templates(id),
  template_version integer default 1,
  name text not null,
  client_id uuid,
  property_id uuid,
  service_id uuid,
  responsible_id uuid,
  team_id uuid,
  current_stage text,
  status text default 'Ativo',
  progress integer default 0 check (progress between 0 and 100),
  started_at timestamptz default now(),
  due_date date,
  completed_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.workflow_instance_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workflow_instance_id uuid not null references public.workflow_instances(id) on delete cascade,
  template_stage_id uuid references public.workflow_stages(id),
  name text not null,
  sort_order integer default 0,
  status text default 'Não iniciada',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.workflow_teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  leader_id uuid,
  leader_name text,
  sector text,
  services_supported text[],
  status text default 'Ativa',
  capacity integer default 0,
  color text,
  icon text,
  permissions jsonb default '{}',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.workflow_team_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  team_id uuid not null references public.workflow_teams(id) on delete cascade,
  member_id uuid not null,
  member_type text default 'staff',
  member_name text,
  role text default 'member',
  active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, member_id)
);

create table if not exists public.workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text,
  status text default 'Não iniciada',
  stage text,
  priority text default 'Normal',
  start_date date,
  due_date date,
  completed_at timestamptz,
  created_by uuid,
  creator_name text,
  assigned_to uuid,
  assignee_name text,
  responsible_id uuid,
  team_id uuid references public.workflow_teams(id),
  progress integer default 0 check (progress between 0 and 100),
  visibility text default 'Pública na empresa',
  sort_order bigint default 0,
  origin text default 'Manual',
  type text default 'Operacional',
  client_id uuid,
  property_id uuid,
  service_id uuid,
  lead_id uuid,
  contract_id uuid,
  schedule_id uuid,
  document_id uuid,
  financial_entry_id uuid,
  workflow_instance_id uuid references public.workflow_instances(id) on delete set null,
  requires_approval boolean default false,
  shared_with_client boolean default false,
  estimated_minutes integer,
  logged_minutes integer default 0,
  recurrence_rule text,
  private_notes text,
  custom_fields jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.workflow_task_participants (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid not null references public.workflow_tasks(id) on delete cascade,
  participant_id uuid not null,
  participant_type text default 'staff',
  role text not null default 'collaborator',
  permissions jsonb default '{}',
  created_at timestamptz not null default now(),
  unique(task_id, participant_id, role)
);

create table if not exists public.workflow_task_checklists (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid not null references public.workflow_tasks(id) on delete cascade,
  title text not null,
  description text,
  responsible_id uuid,
  due_date date,
  required boolean default false,
  completed boolean default false,
  status text default 'Pendente',
  sort_order integer default 0,
  completed_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.workflow_task_subtasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid not null references public.workflow_tasks(id) on delete cascade,
  title text not null,
  status text default 'Não iniciada',
  priority text default 'Normal',
  assigned_to uuid,
  assignee_name text,
  due_date date,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.workflow_task_comments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid not null references public.workflow_tasks(id) on delete cascade,
  parent_id uuid references public.workflow_task_comments(id) on delete cascade,
  body text not null,
  visible_to_client boolean default false,
  is_internal boolean default true,
  created_by uuid,
  created_by_name text,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.workflow_task_attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid not null references public.workflow_tasks(id) on delete cascade,
  file_name text not null,
  file_type text,
  mime_type text,
  size_bytes bigint,
  storage_path text,
  visibility text default 'Interno',
  shared_with_client boolean default false,
  uploaded_by uuid,
  uploaded_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.workflow_task_dependencies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid not null references public.workflow_tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.workflow_tasks(id) on delete cascade,
  required boolean default true,
  created_at timestamptz not null default now(),
  constraint workflow_task_dependency_no_self check (task_id <> depends_on_task_id),
  unique(task_id, depends_on_task_id)
);

create table if not exists public.workflow_task_approvals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid not null references public.workflow_tasks(id) on delete cascade,
  approver_id uuid not null,
  approver_name text,
  decision text default 'Pendente',
  comment text,
  reviewed_version text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_task_tags (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, name)
);

create table if not exists public.workflow_task_tag_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid not null references public.workflow_tasks(id) on delete cascade,
  tag_id uuid not null references public.workflow_task_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(task_id, tag_id)
);

create table if not exists public.workflow_task_time_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid not null references public.workflow_tasks(id) on delete cascade,
  user_id uuid not null,
  minutes integer not null check (minutes > 0),
  description text,
  worked_at date default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  recipient_id uuid not null,
  title text not null,
  message text,
  type text default 'workflow',
  priority text default 'Normal',
  entity_type text,
  entity_id uuid,
  link text,
  read_at timestamptz,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.workflow_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null,
  category text not null,
  enabled boolean default true,
  muted_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, user_id, category)
);

create table if not exists public.workflow_automation_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  trigger_type text not null,
  conditions jsonb default '{}',
  actions jsonb default '[]',
  active boolean default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.workflow_automation_executions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  rule_id uuid references public.workflow_automation_rules(id) on delete set null,
  entity_type text,
  entity_id uuid,
  status text default 'Pendente',
  result jsonb default '{}',
  error text,
  attempts integer default 0,
  executed_at timestamptz default now()
);

create table if not exists public.workflow_activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid references public.workflow_tasks(id) on delete set null,
  workflow_instance_id uuid references public.workflow_instances(id) on delete set null,
  actor_id uuid,
  actor_name text,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Índices de performance.
create index if not exists workflow_tasks_company_status_idx on public.workflow_tasks(company_id, status, due_date);
create index if not exists workflow_tasks_assigned_idx on public.workflow_tasks(company_id, assigned_to);
create index if not exists workflow_tasks_client_idx on public.workflow_tasks(company_id, client_id);
create index if not exists workflow_tasks_property_idx on public.workflow_tasks(company_id, property_id);
create index if not exists workflow_tasks_instance_idx on public.workflow_tasks(company_id, workflow_instance_id);
create index if not exists workflow_comments_task_idx on public.workflow_task_comments(task_id, created_at desc);
create index if not exists workflow_checklists_task_idx on public.workflow_task_checklists(task_id, sort_order);
create index if not exists workflow_subtasks_task_idx on public.workflow_task_subtasks(task_id);
create index if not exists workflow_attachments_task_idx on public.workflow_task_attachments(task_id);
create index if not exists workflow_notifications_recipient_idx on public.workflow_notifications(company_id, recipient_id, read_at, created_at desc);
create index if not exists workflow_activity_task_idx on public.workflow_activity_logs(company_id, task_id, created_at desc);
create index if not exists workflow_team_members_team_idx on public.workflow_team_members(company_id, team_id);

-- RLS multiempresa.
alter table public.workflow_statuses enable row level security;
alter table public.workflow_templates enable row level security;
alter table public.workflow_template_versions enable row level security;
alter table public.workflow_stages enable row level security;
alter table public.workflow_transitions enable row level security;
alter table public.workflow_instances enable row level security;
alter table public.workflow_instance_stages enable row level security;
alter table public.workflow_tasks enable row level security;
alter table public.workflow_task_participants enable row level security;
alter table public.workflow_task_checklists enable row level security;
alter table public.workflow_task_subtasks enable row level security;
alter table public.workflow_task_comments enable row level security;
alter table public.workflow_task_attachments enable row level security;
alter table public.workflow_task_dependencies enable row level security;
alter table public.workflow_task_approvals enable row level security;
alter table public.workflow_task_tags enable row level security;
alter table public.workflow_task_tag_links enable row level security;
alter table public.workflow_task_time_entries enable row level security;
alter table public.workflow_teams enable row level security;
alter table public.workflow_team_members enable row level security;
alter table public.workflow_notifications enable row level security;
alter table public.workflow_notification_preferences enable row level security;
alter table public.workflow_automation_rules enable row level security;
alter table public.workflow_automation_executions enable row level security;
alter table public.workflow_activity_logs enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'workflow_statuses','workflow_templates','workflow_template_versions','workflow_stages','workflow_transitions','workflow_instances','workflow_instance_stages','workflow_tasks','workflow_task_participants','workflow_task_checklists','workflow_task_subtasks','workflow_task_comments','workflow_task_attachments','workflow_task_dependencies','workflow_task_approvals','workflow_task_tags','workflow_task_tag_links','workflow_task_time_entries','workflow_teams','workflow_team_members','workflow_notifications','workflow_notification_preferences','workflow_automation_rules','workflow_automation_executions','workflow_activity_logs'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_company_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_company_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_company_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_company_delete', t);
    execute format('create policy %I on public.%I for select using (public.is_admin_master_global() or company_id = public.current_company_id())', t || '_company_select', t);
    execute format('create policy %I on public.%I for insert with check (public.is_admin_master_global() or company_id = public.current_company_id())', t || '_company_insert', t);
    execute format('create policy %I on public.%I for update using (public.is_admin_master_global() or company_id = public.current_company_id()) with check (public.is_admin_master_global() or company_id = public.current_company_id())', t || '_company_update', t);
    execute format('create policy %I on public.%I for delete using (public.is_admin_master_global() or company_id = public.current_company_id())', t || '_company_delete', t);
  end loop;
end $$;

-- Storage policies seguras para workflow-attachments.
drop policy if exists workflow_attachments_read on storage.objects;
drop policy if exists workflow_attachments_insert on storage.objects;
drop policy if exists workflow_attachments_update on storage.objects;
drop policy if exists workflow_attachments_delete on storage.objects;

create policy workflow_attachments_read on storage.objects
for select using (
  bucket_id = 'workflow-attachments'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (public.is_admin_master_global() or split_part(name, '/', 1)::uuid = public.current_company_id())
);

create policy workflow_attachments_insert on storage.objects
for insert with check (
  bucket_id = 'workflow-attachments'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (public.is_admin_master_global() or split_part(name, '/', 1)::uuid = public.current_company_id())
);

create policy workflow_attachments_update on storage.objects
for update using (
  bucket_id = 'workflow-attachments'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (public.is_admin_master_global() or split_part(name, '/', 1)::uuid = public.current_company_id())
) with check (
  bucket_id = 'workflow-attachments'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (public.is_admin_master_global() or split_part(name, '/', 1)::uuid = public.current_company_id())
);

create policy workflow_attachments_delete on storage.objects
for delete using (
  bucket_id = 'workflow-attachments'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (public.is_admin_master_global() or split_part(name, '/', 1)::uuid = public.current_company_id())
);

-- Seed de status e modelos editáveis para empresas existentes.
do $$
declare
  c record;
  v_template_id uuid;
  v_regularizacao text[] := array['Recebimento da demanda','Cadastro do cliente','Cadastro do imóvel','Solicitação de documentos','Conferência documental','Análise técnica','Pendências','Elaboração','Revisão','Protocolo','Acompanhamento','Entrega','Encerramento'];
  v_car text[] := array['Cadastro da solicitação','Coleta de documentos','Análise da propriedade','Levantamento de informações','Elaboração do cadastro','Revisão','Envio','Acompanhamento','Entrega'];
  v_geo text[] := array['Abertura do serviço','Planejamento','Documentação','Agendamento de campo','Levantamento','Processamento','Planta e memorial','Revisão técnica','Certificação','Registro','Entrega'];
  v_itr text[] := array['Recebimento','Conferência de dados','Cálculo','Revisão','Aprovação do cliente','Transmissão','Emissão de comprovante','Entrega'];
  arr text[];
  stage_name text;
  i integer;
  tpl_name text;
  tpl_category text;
begin
  for c in select id from public.companies loop
    insert into public.workflow_statuses(company_id, name, color_class, icon, sort_order, internal_type, is_done, is_blocked)
    values
      (c.id, 'Não iniciada', 'bg-stone-100 text-stone-700', '○', 1, 'todo', false, false),
      (c.id, 'Em andamento', 'bg-sky-50 text-sky-700', '▶', 2, 'doing', false, false),
      (c.id, 'Aguardando', 'bg-amber-50 text-amber-700', '⏳', 3, 'waiting', false, true),
      (c.id, 'Em revisão', 'bg-violet-50 text-violet-700', '◇', 4, 'review', false, false),
      (c.id, 'Correção solicitada', 'bg-orange-50 text-orange-700', '!', 5, 'correction', false, false),
      (c.id, 'Concluída', 'bg-emerald-50 text-emerald-700', '✓', 6, 'done', true, false),
      (c.id, 'Cancelada', 'bg-red-50 text-red-700', '×', 7, 'cancelled', true, false)
    on conflict do nothing;

    for tpl_name, tpl_category, arr in
      select 'Regularização de imóvel rural', 'Regularização rural', v_regularizacao union all
      select 'Cadastro Ambiental Rural', 'Ambiental', v_car union all
      select 'Georreferenciamento', 'Geoprocessamento', v_geo union all
      select 'ITR e obrigações rurais', 'Fiscal rural', v_itr
    loop
      insert into public.workflow_templates(company_id, name, description, category, status, version, active)
      select c.id, tpl_name, 'Modelo inicial editável do Nex Gestão Rural.', tpl_category, 'Ativo', 1, true
      where not exists(select 1 from public.workflow_templates wt where wt.company_id = c.id and wt.name = tpl_name)
      returning id into v_template_id;

      if v_template_id is null then
        select id into v_template_id from public.workflow_templates where company_id = c.id and name = tpl_name limit 1;
      end if;

      i := 1;
      foreach stage_name in array arr loop
        insert into public.workflow_stages(company_id, template_id, name, sort_order, default_due_days, required)
        select c.id, v_template_id, stage_name, i, greatest(2, i + 1), true
        where not exists(select 1 from public.workflow_stages ws where ws.company_id = c.id and ws.template_id = v_template_id and ws.name = stage_name);
        i := i + 1;
      end loop;
      v_template_id := null;
    end loop;
  end loop;
end $$;
