-- Nex Rural - ajustes emergenciais finais para piloto comercial.
-- Execute apos 0006_pilot_hardening.sql.

do $$
begin
  alter type app_role add value if not exists 'admin_master_global';
  alter type app_role add value if not exists 'company_admin';
  alter type app_role add value if not exists 'topografo';
  alter type app_role add value if not exists 'agrimensor';
exception
  when duplicate_object then null;
end $$;

create or replace function current_user_role_text()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text
  from user_profiles
  where id = auth.uid()
    and active = true
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
      and role::text in ('admin_master_global', 'admin_master')
      and active = true
  )
$$;

create or replace function is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    current_user_role_text() in (
      'admin_master_global',
      'company_admin',
      'admin_master',
      'gestor',
      'tecnico',
      'administrativo',
      'financeiro',
      'topografo',
      'agrimensor'
    ),
    false
  )
$$;

do $$
declare
  legacy_code text := 'NEX' || '-' || 'ROOT';
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'companies'
  ) then
    update companies
    set company_code = '3272026'
    where company_code = legacy_code
      and not exists (
        select 1
        from companies existing
        where existing.company_code = '3272026'
      );

    update companies
    set company_code = generate_company_code()
    where company_code = legacy_code;
  end if;
end $$;

drop policy if exists "portal attempts admin read" on portal_access_attempts;
create policy "portal attempts admin read" on portal_access_attempts
  for select using (
    is_admin_master_global()
    or (
      company_id = current_company_id()
      and current_user_role_text() in ('admin_master', 'company_admin')
    )
  );

create index if not exists companies_company_code_digits_idx
  on companies(company_code)
  where company_code ~ '^[0-9]+$';

create index if not exists user_profiles_company_role_idx
  on user_profiles(company_id, role, active);

create index if not exists clients_company_document_idx
  on clients(company_id, document);
