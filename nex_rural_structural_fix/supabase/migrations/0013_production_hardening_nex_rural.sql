-- =========================================================
-- 0013 - Hardening final para produção inicial do Nex Rural
-- - separa metadados de geração DOCX
-- - cria vínculo entre documento gerado e item específico de checklist
-- - adiciona campos de status operacional em itens de checklist
-- - mantém compatibilidade com bancos que já rodaram migrations anteriores
-- =========================================================

alter table if exists public.generated_documents
  add column if not exists generation_metadata jsonb not null default '{}'::jsonb;

alter table if exists public.generated_checklist_items
  add column if not exists requested_at timestamptz,
  add column if not exists received_at timestamptz,
  add column if not exists in_review_at timestamptz,
  add column if not exists not_applicable_at timestamptz;

alter table if exists public.checklist_template_items
  add column if not exists due_days integer,
  add column if not exists portal_instruction text,
  add column if not exists internal_instruction text,
  add column if not exists active boolean not null default true;

create table if not exists public.generated_document_checklist_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  generated_document_id uuid not null references public.generated_documents(id) on delete cascade,
  generated_checklist_id uuid references public.generated_checklists(id) on delete set null,
  generated_checklist_item_id uuid references public.generated_checklist_items(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists generated_document_checklist_items_company_idx
  on public.generated_document_checklist_items(company_id, generated_document_id, generated_checklist_item_id);

alter table public.generated_document_checklist_items enable row level security;

drop policy if exists "generated_document_checklist_items company isolation" on public.generated_document_checklist_items;
create policy "generated_document_checklist_items company isolation" on public.generated_document_checklist_items
  for all
  using (
    public.is_admin_master_global()
    or company_id = public.current_company_id()
  )
  with check (
    public.is_admin_master_global()
    or company_id = public.current_company_id()
  );

-- Garante que modelos antigos não pareçam oficiais em produção.
update public.document_templates
set source_type = coalesce(source_type, 'Modelo manual'),
    description = case
      when source_type ilike '%exemplo%' or name ilike '%exemplo%' then coalesce(description, '')
      when storage_path is null then concat(coalesce(description, ''), case when coalesce(description, '') = '' then '' else E'\n' end, 'Modelo demonstrativo/manual — edite antes de usar ou envie um DOCX da empresa.')
      else description
    end,
    updated_at = now()
where storage_path is null
  and deleted_at is null;

select '0013 production hardening aplicado com sucesso' as status;
