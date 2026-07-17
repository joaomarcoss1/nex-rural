"use client";

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Columns3,
  Download,
  Eye,
  FileText,
  Filter,
  Flag,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Upload,
  Users,
  X
} from "lucide-react";
import { isDemoMode } from "@/lib/env";
import { supabase } from "@/lib/supabase/client";
import { createRecord, updateRecord, softDeleteRecord, type BackendRecord } from "@/lib/services/base";
import { getStoredStaffToken, type AuthProfile } from "@/lib/services/auth";

type AnyRow = BackendRecord & Record<string, any>;
type Tone = "green" | "amber" | "red" | "blue" | "gray";

type WorkflowProps = {
  rows: Record<string, AnyRow[]>;
  profile: AuthProfile;
  refresh: () => Promise<void> | void;
  toast: (message: string, tone?: Tone) => void;
};

const statusDefaults = [
  { name: "Não iniciada", type: "todo", color: "bg-stone-100 text-stone-700", icon: "○", order: 1, completion: false, blocked: false },
  { name: "Em andamento", type: "doing", color: "bg-sky-50 text-sky-700", icon: "▶", order: 2, completion: false, blocked: false },
  { name: "Aguardando", type: "waiting", color: "bg-amber-50 text-amber-700", icon: "⏳", order: 3, completion: false, blocked: true },
  { name: "Em revisão", type: "review", color: "bg-violet-50 text-violet-700", icon: "◇", order: 4, completion: false, blocked: false },
  { name: "Correção solicitada", type: "correction", color: "bg-orange-50 text-orange-700", icon: "!", order: 5, completion: false, blocked: false },
  { name: "Concluída", type: "done", color: "bg-emerald-50 text-emerald-700", icon: "✓", order: 6, completion: true, blocked: false },
  { name: "Cancelada", type: "cancelled", color: "bg-red-50 text-red-700", icon: "×", order: 7, completion: true, blocked: false }
];

const priorities = ["Baixa", "Normal", "Alta", "Urgente"];
const visibilities = ["Pública na empresa", "Pública para a equipe", "Privada", "Confidencial", "Compartilhada com cliente"];
const workflowTabs = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "mine", label: "Minhas tarefas", icon: CheckCircle2 },
  { id: "kanban", label: "Kanban", icon: Columns3 },
  { id: "list", label: "Lista", icon: ListChecks },
  { id: "calendar", label: "Calendário", icon: CalendarDays },
  { id: "workflows", label: "Workflows", icon: ClipboardCheck },
  { id: "teams", label: "Equipes", icon: Users },
  { id: "reports", label: "Relatórios", icon: FileText },
  { id: "settings", label: "Configurações", icon: ShieldCheck }
];

const ruralTemplateSeeds = [
  {
    name: "Regularização de imóvel rural",
    category: "Regularização rural",
    stages: ["Recebimento da demanda", "Cadastro do cliente", "Cadastro do imóvel", "Solicitação de documentos", "Conferência documental", "Análise técnica", "Pendências", "Elaboração", "Revisão", "Protocolo", "Acompanhamento", "Entrega", "Encerramento"]
  },
  {
    name: "Cadastro Ambiental Rural",
    category: "Ambiental",
    stages: ["Cadastro da solicitação", "Coleta de documentos", "Análise da propriedade", "Levantamento de informações", "Elaboração do cadastro", "Revisão", "Envio", "Acompanhamento", "Entrega"]
  },
  {
    name: "Georreferenciamento",
    category: "Geoprocessamento",
    stages: ["Abertura do serviço", "Planejamento", "Documentação", "Agendamento de campo", "Levantamento", "Processamento", "Planta e memorial", "Revisão técnica", "Certificação", "Registro", "Entrega"]
  },
  {
    name: "ITR e obrigações rurais",
    category: "Fiscal rural",
    stages: ["Recebimento", "Conferência de dados", "Cálculo", "Revisão", "Aprovação do cliente", "Transmissão", "Emissão de comprovante", "Entrega"]
  }
];

function text(value: unknown) {
  return String(value ?? "");
}

function dateBR(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return text(value);
  return date.toLocaleDateString("pt-BR");
}

function isOverdue(row: AnyRow) {
  if (!row.due_date || /conclu|cancel/i.test(text(row.status))) return false;
  const due = new Date(String(row.due_date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function taskTitle(row: AnyRow) {
  return text(row.title || row.name || "Tarefa sem título");
}

function priorityClass(priority: string) {
  if (/urgente/i.test(priority)) return "border-red-200 bg-red-50 text-red-700";
  if (/alta/i.test(priority)) return "border-orange-200 bg-orange-50 text-orange-700";
  if (/baixa/i.test(priority)) return "border-stone-200 bg-stone-50 text-stone-600";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: Tone }) {
  const styles = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    blue: "border-sky-200 bg-sky-50 text-sky-700",
    gray: "border-stone-200 bg-stone-50 text-stone-700"
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-black ${styles[tone]}`}>{children}</span>;
}

function Button({ children, icon: Icon, onClick, type = "button", variant = "primary", disabled }: { children: ReactNode; icon?: ElementType; onClick?: () => void; type?: "button" | "submit"; variant?: "primary" | "secondary" | "danger" | "ghost"; disabled?: boolean }) {
  const styles = {
    primary: "bg-[#163b2c] text-white hover:bg-[#1f5c42]",
    secondary: "border border-stone-200 bg-white text-[#163b2c] hover:bg-[#f7f4ec]",
    danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    ghost: "text-stone-600 hover:bg-stone-100"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]}`}>
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-[#163b2c]">{title}</h2>
          {subtitle && <p className="mt-1 text-sm font-semibold text-stone-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SelectField({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; disabled?: boolean }) {
  return (
    <label className="block text-sm font-bold text-stone-600">
      {label}
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 outline-none focus:border-[#2d6b4f] disabled:bg-stone-100">
        <option value="">Selecione</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function InputField({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block text-sm font-bold text-stone-600">
      {label}{required && <span className="text-red-500"> *</span>}
      <input type={type} value={value} required={required} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 outline-none focus:border-[#2d6b4f]" />
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block text-sm font-bold text-stone-600">
      {label}
      <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 outline-none focus:border-[#2d6b4f]" />
    </label>
  );
}

function safeId(value: unknown) {
  return String(value || "");
}

function canSeeTask(task: AnyRow, profile: AuthProfile) {
  if (profile.role === "admin_master_global" || profile.role === "company_admin" || profile.role === "admin_master" || profile.role === "gestor") return true;
  if (profile.role === "cliente") return task.shared_with_client === true || task.visibility === "Compartilhada com cliente";
  const uid = profile.staff_id || profile.id;
  if (task.created_by === uid || task.assigned_to === uid || task.responsible_id === uid) return true;
  if (task.visibility === "Pública na empresa") return true;
  return false;
}

function useAuthHeader() {
  return async (): Promise<Record<string, string>> => {
    const staffToken = getStoredStaffToken();
    if (staffToken) return { Authorization: `Bearer ${staffToken}` };
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } as any };
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
}

export function WorkflowModule({ rows, profile, refresh, toast }: WorkflowProps) {
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [selectedTask, setSelectedTask] = useState<AnyRow | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const getAuthHeader = useAuthHeader();

  const clients = rows.clients ?? [];
  const properties = rows.rural_properties ?? [];
  const services = rows.services ?? [];
  const internalUsers = [...(rows.user_profiles ?? []), ...(rows.staff_profiles ?? [])];
  const tasks = useMemo(() => (rows.workflow_tasks ?? []).filter((task) => !task.deleted_at && canSeeTask(task, profile)), [rows.workflow_tasks, profile]);
  const teams = rows.workflow_teams ?? [];
  const comments = rows.workflow_task_comments ?? [];
  const checklistItems = rows.workflow_task_checklists ?? [];
  const subtasks = rows.workflow_task_subtasks ?? [];
  const attachments = rows.workflow_task_attachments ?? [];
  const dependencies = rows.workflow_task_dependencies ?? [];
  const approvals = rows.workflow_task_approvals ?? [];
  const notifications = (rows.workflow_notifications ?? []).filter((item) => String(item.recipient_id || item.user_id || "") === String(profile.staff_id || profile.id));
  const templates = rows.workflow_templates ?? [];
  const stages = rows.workflow_stages ?? [];
  const instances = rows.workflow_instances ?? [];
  const statuses = useMemo(() => {
    const custom = (rows.workflow_statuses ?? []).filter((item) => item.active !== false).map((item) => ({ name: text(item.name), type: text(item.internal_type || item.type), color: text(item.color_class || "bg-stone-100 text-stone-700"), icon: text(item.icon || "•"), order: Number(item.sort_order || item.order || 0), completion: item.is_done === true || item.completion === true, blocked: item.is_blocked === true || item.blocked === true }));
    return (custom.length ? custom : statusDefaults).sort((a, b) => a.order - b.order);
  }, [rows.workflow_statuses]);

  useEffect(() => {
    const client = supabase;
    if (isDemoMode || !client || !profile.company_id) return;
    const channel = client
      .channel(`workflow-${profile.company_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workflow_tasks", filter: `company_id=eq.${profile.company_id}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "workflow_notifications", filter: `company_id=eq.${profile.company_id}` }, () => refresh())
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [profile.company_id, refresh]);

  const filteredTasks = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (statusFilter && task.status !== statusFilter) return false;
      if (responsibleFilter && String(task.assigned_to || task.responsible_id || "") !== responsibleFilter) return false;
      if (!lower) return true;
      const linkedClient = clients.find((client) => client.id === task.client_id);
      const linkedProperty = properties.find((property) => property.id === task.property_id);
      return [task.title, task.description, linkedClient?.name, linkedProperty?.name, task.assignee_name].some((value) => text(value).toLowerCase().includes(lower));
    });
  }, [tasks, query, statusFilter, responsibleFilter, clients, properties]);

  const myId = profile.staff_id || profile.id;
  const myTasks = filteredTasks.filter((task) => String(task.assigned_to || task.responsible_id || task.created_by || "") === String(myId));
  const overdue = filteredTasks.filter(isOverdue);
  const dueToday = filteredTasks.filter((task) => task.due_date && dateBR(String(task.due_date)) === new Date().toLocaleDateString("pt-BR") && !/conclu|cancel/i.test(text(task.status)));
  const pendingApproval = filteredTasks.filter((task) => /revisão|aprov/i.test(text(task.status)) || task.requires_approval === true);
  const completed = filteredTasks.filter((task) => /conclu/i.test(text(task.status)));

  function relationLabel(table: "client" | "property" | "service" | "user" | "team", id: unknown) {
    if (!id) return "";
    const source = table === "client" ? clients : table === "property" ? properties : table === "service" ? services : table === "team" ? teams : internalUsers;
    const row = source.find((item) => item.id === id || item.staff_id === id);
    if (!row) return "";
    if (table === "property") return `${row.name || row.property_name} ${row.municipality ? `• ${row.municipality}/${row.state || ""}` : ""}`;
    if (table === "service") return `${row.service_type || row.title || row.type} ${row.status ? `• ${row.status}` : ""}`;
    return text(row.full_name || row.name || row.title || row.trade_name);
  }

  async function notify(input: { recipientId?: string | null; title: string; message: string; entityId?: string; type?: string; priority?: string }) {
    if (!input.recipientId) return;
    await createRecord("workflow_notifications", {
      company_id: profile.company_id,
      recipient_id: input.recipientId,
      title: input.title,
      message: input.message,
      type: input.type || "workflow",
      priority: input.priority || "Normal",
      entity_type: "workflow_tasks",
      entity_id: input.entityId || null,
      link: "/workflow",
      read_at: null,
      created_by: profile.staff_id || profile.id
    } as AnyRow).catch(() => undefined);
  }

  async function logActivity(action: string, taskId?: string, metadata: Record<string, unknown> = {}) {
    await createRecord("workflow_activity_logs", {
      company_id: profile.company_id,
      task_id: taskId || null,
      actor_id: profile.staff_id || profile.id,
      actor_name: profile.full_name,
      action,
      metadata
    } as AnyRow).catch(() => undefined);
  }

  async function createTask(payload: AnyRow) {
    setSaving(true);
    try {
      const assignee = internalUsers.find((user) => String(user.id || user.staff_id) === String(payload.assigned_to));
      const created = await createRecord("workflow_tasks", {
        company_id: profile.company_id,
        title: payload.title,
        description: payload.description || null,
        status: payload.status || "Não iniciada",
        stage: payload.stage || null,
        priority: payload.priority || "Normal",
        due_date: payload.due_date || null,
        start_date: payload.start_date || null,
        completed_at: null,
        visibility: payload.visibility || "Pública na empresa",
        created_by: profile.staff_id || profile.id,
        creator_name: profile.full_name,
        assigned_to: payload.assigned_to || null,
        assignee_name: assignee?.full_name || assignee?.name || payload.assignee_name || null,
        team_id: payload.team_id || null,
        client_id: payload.client_id || null,
        property_id: payload.property_id || null,
        service_id: payload.service_id || null,
        workflow_instance_id: payload.workflow_instance_id || null,
        type: payload.type || "Operacional",
        origin: payload.origin || "Manual",
        progress: 0,
        shared_with_client: payload.visibility === "Compartilhada com cliente",
        private_notes: payload.private_notes || null,
        estimated_minutes: payload.estimated_minutes ? Number(payload.estimated_minutes) : null,
        sort_order: Date.now()
      } as AnyRow);
      await logActivity("task_created", String(created.id), { title: payload.title });
      await notify({ recipientId: safeId(payload.assigned_to), title: "Nova tarefa atribuída", message: taskTitle(created), entityId: safeId(created.id), priority: payload.priority });
      toast("Tarefa criada e persistida.", "green");
      setNewTaskOpen(false);
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao criar tarefa.", "red");
    } finally {
      setSaving(false);
    }
  }

  async function updateTask(task: AnyRow, patch: AnyRow, success = "Tarefa atualizada.") {
    setSaving(true);
    try {
      const nextPatch = { ...patch };
      if (patch.status && /conclu/i.test(String(patch.status))) nextPatch.completed_at = new Date().toISOString();
      const updated = await updateRecord("workflow_tasks", safeId(task.id), nextPatch);
      await logActivity("task_updated", safeId(task.id), { patch: nextPatch });
      if (patch.status && patch.status !== task.status) {
        await notify({ recipientId: safeId(task.created_by), title: "Status da tarefa alterado", message: `${taskTitle(task)} → ${patch.status}`, entityId: safeId(task.id) });
      }
      toast(success, "green");
      setSelectedTask((current) => current && current.id === task.id ? { ...current, ...updated } : current);
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao atualizar tarefa.", "red");
    } finally {
      setSaving(false);
    }
  }

  function completionFor(task: AnyRow) {
    const items = checklistItems.filter((item) => item.task_id === task.id && item.deleted_at == null);
    if (!items.length) return Number(task.progress || 0);
    return Math.round((items.filter((item) => item.completed === true || /conclu|valid/i.test(text(item.status))).length / items.length) * 100);
  }

  function validateMove(task: AnyRow, nextStatus: string) {
    const requiredItems = checklistItems.filter((item) => item.task_id === task.id && item.required === true && item.completed !== true && !/conclu|valid/i.test(text(item.status)));
    const blockingDeps = dependencies.filter((dep) => dep.task_id === task.id && dep.required !== false).filter((dep) => {
      const blocking = tasks.find((candidate) => candidate.id === dep.depends_on_task_id);
      return blocking && !/conclu/i.test(text(blocking.status));
    });
    if (/conclu/i.test(nextStatus) && requiredItems.length) return `Existem ${requiredItems.length} itens obrigatórios pendentes.`;
    if (/conclu|revis/i.test(nextStatus) && blockingDeps.length) return "A tarefa possui dependências obrigatórias pendentes.";
    if (/conclu/i.test(nextStatus) && task.requires_approval === true && !approvals.some((item) => item.task_id === task.id && /aprov/i.test(text(item.decision)))) return "A tarefa exige aprovação antes da conclusão.";
    return "";
  }

  async function moveTask(task: AnyRow, nextStatus: string) {
    const blocked = validateMove(task, nextStatus);
    if (blocked) {
      toast(blocked, "amber");
      return;
    }
    await updateTask(task, { status: nextStatus, sort_order: Date.now() }, `Tarefa movida para ${nextStatus}.`);
  }

  async function addChecklistItem(task: AnyRow, title: string) {
    if (!title.trim()) return;
    await createRecord("workflow_task_checklists", {
      company_id: profile.company_id,
      task_id: task.id,
      title: title.trim(),
      required: false,
      completed: false,
      status: "Pendente",
      sort_order: checklistItems.filter((item) => item.task_id === task.id).length + 1,
      created_by: profile.staff_id || profile.id
    } as AnyRow);
    await logActivity("checklist_item_created", safeId(task.id), { title });
    await refresh();
  }

  async function toggleChecklistItem(item: AnyRow) {
    await updateRecord("workflow_task_checklists", safeId(item.id), { completed: item.completed !== true, status: item.completed === true ? "Pendente" : "Concluído", completed_at: item.completed === true ? null : new Date().toISOString() } as AnyRow);
    await logActivity("checklist_item_toggled", safeId(item.task_id), { item_id: item.id });
    await refresh();
  }

  async function addSubtask(task: AnyRow, title: string, assignee?: string) {
    if (!title.trim()) return;
    const user = internalUsers.find((candidate) => String(candidate.id || candidate.staff_id) === String(assignee));
    await createRecord("workflow_task_subtasks", {
      company_id: profile.company_id,
      task_id: task.id,
      title: title.trim(),
      status: "Não iniciada",
      priority: "Normal",
      assigned_to: assignee || null,
      assignee_name: user?.full_name || user?.name || null,
      created_by: profile.staff_id || profile.id
    } as AnyRow);
    await logActivity("subtask_created", safeId(task.id), { title });
    await refresh();
  }

  async function addComment(task: AnyRow, body: string, visibleToClient = false) {
    if (!body.trim()) return;
    await createRecord("workflow_task_comments", {
      company_id: profile.company_id,
      task_id: task.id,
      body: body.trim(),
      visible_to_client: visibleToClient,
      is_internal: !visibleToClient,
      created_by: profile.staff_id || profile.id,
      created_by_name: profile.full_name
    } as AnyRow);
    await logActivity("comment_created", safeId(task.id));
    const mentions = body.match(/@([A-Za-zÀ-ÿ0-9_. -]+)/g) || [];
    for (const mention of mentions) {
      const name = mention.replace(/^@/, "").trim().toLowerCase();
      const target = internalUsers.find((user) => text(user.full_name || user.name).toLowerCase().includes(name));
      if (target && canSeeTask(task, { ...profile, id: safeId(target.id || target.staff_id), staff_id: safeId(target.staff_id || target.id) })) {
        await notify({ recipientId: safeId(target.id || target.staff_id), title: "Você foi mencionado", message: taskTitle(task), entityId: safeId(task.id), type: "mention" });
      }
    }
    await refresh();
  }

  async function uploadAttachment(task: AnyRow, file: File, shareWithClient = false) {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("task_id", safeId(task.id));
      formData.set("share_with_client", String(shareWithClient));
      const headers = await getAuthHeader();
      const response = await fetch("/api/workflow/tasks/attachments/upload", { method: "POST", headers, body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao anexar arquivo.");
      await logActivity("attachment_uploaded", safeId(task.id), { name: file.name });
      toast("Anexo enviado com segurança.", "green");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao anexar arquivo.", "red");
    } finally {
      setSaving(false);
    }
  }

  async function createTeam(name: string, leaderId?: string) {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const leader = internalUsers.find((user) => String(user.id || user.staff_id) === String(leaderId));
      await createRecord("workflow_teams", {
        company_id: profile.company_id,
        name: name.trim(),
        leader_id: leaderId || null,
        leader_name: leader?.full_name || leader?.name || null,
        status: "Ativa",
        created_by: profile.staff_id || profile.id
      } as AnyRow);
      toast("Equipe criada.", "green");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao criar equipe.", "red");
    } finally {
      setSaving(false);
    }
  }

  async function createTemplateFromSeed(seed: typeof ruralTemplateSeeds[number]) {
    setSaving(true);
    try {
      const template = await createRecord("workflow_templates", {
        company_id: profile.company_id,
        name: seed.name,
        description: `Modelo editável para ${seed.name.toLowerCase()}.`,
        category: seed.category,
        status: "Ativo",
        version: 1,
        active: true,
        created_by: profile.staff_id || profile.id
      } as AnyRow);
      for (let index = 0; index < seed.stages.length; index += 1) {
        await createRecord("workflow_stages", {
          company_id: profile.company_id,
          template_id: template.id,
          name: seed.stages[index],
          sort_order: index + 1,
          default_status: index === 0 ? "Em andamento" : "Não iniciada",
          default_due_days: Math.max(2, index + 2),
          required: true
        } as AnyRow);
      }
      toast("Modelo de workflow criado com etapas reais.", "green");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao criar modelo.", "red");
    } finally {
      setSaving(false);
    }
  }

  async function startWorkflow(input: { templateId: string; clientId?: string; propertyId?: string; serviceId?: string; responsibleId?: string }) {
    const template = templates.find((item) => item.id === input.templateId);
    if (!template) return toast("Selecione um modelo de workflow.", "amber");
    setSaving(true);
    try {
      const instance = await createRecord("workflow_instances", {
        company_id: profile.company_id,
        template_id: template.id,
        template_version: template.version || 1,
        name: `${template.name} - ${relationLabel("client", input.clientId) || "execução"}`,
        client_id: input.clientId || null,
        property_id: input.propertyId || null,
        service_id: input.serviceId || null,
        responsible_id: input.responsibleId || null,
        status: "Ativo",
        current_stage: null,
        progress: 0,
        started_at: new Date().toISOString(),
        created_by: profile.staff_id || profile.id
      } as AnyRow);
      const templateStages = stages.filter((stage) => stage.template_id === template.id).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
      for (let index = 0; index < templateStages.length; index += 1) {
        const stage = templateStages[index];
        const due = new Date();
        due.setDate(due.getDate() + Number(stage.default_due_days || index + 3));
        await createRecord("workflow_instance_stages", {
          company_id: profile.company_id,
          workflow_instance_id: instance.id,
          template_stage_id: stage.id,
          name: stage.name,
          sort_order: stage.sort_order,
          status: index === 0 ? "Em andamento" : "Não iniciada"
        } as AnyRow);
        await createTask({
          title: `${stage.name} - ${template.name}`,
          description: `Tarefa gerada automaticamente pelo workflow ${template.name}.`,
          status: index === 0 ? "Em andamento" : "Não iniciada",
          stage: stage.name,
          priority: "Normal",
          due_date: due.toISOString().slice(0, 10),
          visibility: "Pública na empresa",
          assigned_to: input.responsibleId || null,
          client_id: input.clientId || null,
          property_id: input.propertyId || null,
          service_id: input.serviceId || null,
          workflow_instance_id: instance.id,
          origin: "Workflow"
        });
      }
      toast("Workflow iniciado com etapas e tarefas reais.", "green");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao iniciar workflow.", "red");
    } finally {
      setSaving(false);
    }
  }

  async function markNotificationRead(notification: AnyRow) {
    await updateRecord("workflow_notifications", safeId(notification.id), { read_at: new Date().toISOString() } as AnyRow);
    await refresh();
  }

  const clientOptions = clients.map((client) => ({ value: safeId(client.id), label: `${client.name || client.full_name} ${client.cpf_cnpj ? `• ${client.cpf_cnpj}` : ""}` }));
  const propertyOptions = properties.map((property) => ({ value: safeId(property.id), label: `${property.name || property.property_name} ${property.municipality ? `• ${property.municipality}/${property.state || ""}` : ""}` }));
  const serviceOptions = services.map((service) => ({ value: safeId(service.id), label: `${service.service_type || service.title || service.type} ${service.status ? `• ${service.status}` : ""}` }));
  const userOptions = internalUsers.map((user) => ({ value: safeId(user.staff_id || user.id), label: `${user.full_name || user.name} ${user.role ? `• ${user.role}` : ""}` }));
  const teamOptions = teams.map((team) => ({ value: safeId(team.id), label: text(team.name) }));

  return (
    <div className="space-y-5">
      <Panel
        title="Workflow, Equipes e Tarefas"
        subtitle="Centro operacional para delegar atividades, controlar prazos, documentos, aprovações e workflows rurais."
        action={<Button icon={Plus} onClick={() => setNewTaskOpen(true)}>Nova tarefa</Button>}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <WorkflowStat label="Abertas" value={filteredTasks.filter((task) => !/conclu|cancel/i.test(text(task.status))).length} icon={ClipboardCheck} tone="blue" />
          <WorkflowStat label="Para hoje" value={dueToday.length} icon={CalendarDays} tone="amber" />
          <WorkflowStat label="Atrasadas" value={overdue.length} icon={AlertTriangle} tone="red" />
          <WorkflowStat label="Aguard. aprovação" value={pendingApproval.length} icon={ShieldCheck} tone="blue" />
          <WorkflowStat label="Concluídas" value={completed.length} icon={CheckCircle2} tone="green" />
          <WorkflowStat label="Não lidas" value={notifications.filter((item) => !item.read_at).length} icon={MessageSquare} tone="amber" />
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {workflowTabs.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setTab(item.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition ${tab === item.id ? "border-[#163b2c] bg-[#163b2c] text-white" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"}`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title="Filtros inteligentes" action={<Button icon={RefreshCw} variant="secondary" onClick={() => refresh()}>Atualizar</Button>}>
        <div className="grid gap-3 lg:grid-cols-4">
          <label className="block text-sm font-bold text-stone-600 lg:col-span-2">
            <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" /> Pesquisa</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título, cliente, imóvel, responsável..." className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold outline-none focus:border-[#2d6b4f]" />
          </label>
          <SelectField label="Status" value={statusFilter} onChange={setStatusFilter} options={statuses.map((status) => ({ value: status.name, label: status.name }))} />
          <SelectField label="Responsável" value={responsibleFilter} onChange={setResponsibleFilter} options={userOptions} />
        </div>
      </Panel>

      {tab === "overview" && <Overview tasks={filteredTasks} myTasks={myTasks} overdue={overdue} pendingApproval={pendingApproval} teams={teams} statuses={statuses} relationLabel={relationLabel} onOpen={setSelectedTask} />}
      {tab === "mine" && <TaskList tasks={myTasks} relationLabel={relationLabel} onOpen={setSelectedTask} onMove={moveTask} />}
      {tab === "kanban" && <Kanban tasks={filteredTasks} statuses={statuses} relationLabel={relationLabel} dragTaskId={dragTaskId} setDragTaskId={setDragTaskId} onMove={moveTask} onOpen={setSelectedTask} completionFor={completionFor} />}
      {tab === "list" && <TaskList tasks={filteredTasks} relationLabel={relationLabel} onOpen={setSelectedTask} onMove={moveTask} />}
      {tab === "calendar" && <CalendarView tasks={filteredTasks} onOpen={setSelectedTask} />}
      {tab === "workflows" && <WorkflowTemplates templates={templates} stages={stages} instances={instances} clients={clientOptions} properties={propertyOptions} services={serviceOptions} users={userOptions} saving={saving} onSeed={createTemplateFromSeed} onStart={startWorkflow} />}
      {tab === "teams" && <TeamsView teams={teams} users={userOptions} tasks={filteredTasks} saving={saving} onCreate={createTeam} />}
      {tab === "reports" && <WorkflowReports tasks={filteredTasks} teams={teams} users={internalUsers} />}
      {tab === "settings" && <WorkflowSettings statuses={statuses} notifications={notifications} onMarkRead={markNotificationRead} />}

      {newTaskOpen && (
        <TaskFormModal
          title="Nova tarefa"
          onClose={() => setNewTaskOpen(false)}
          onSubmit={createTask}
          saving={saving}
          clients={clientOptions}
          properties={propertyOptions}
          services={serviceOptions}
          users={userOptions}
          teams={teamOptions}
          statuses={statuses.map((status) => status.name)}
        />
      )}

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          comments={comments.filter((item) => item.task_id === selectedTask.id)}
          checklistItems={checklistItems.filter((item) => item.task_id === selectedTask.id && item.deleted_at == null)}
          subtasks={subtasks.filter((item) => item.task_id === selectedTask.id && item.deleted_at == null)}
          attachments={attachments.filter((item) => item.task_id === selectedTask.id && item.deleted_at == null)}
          approvals={approvals.filter((item) => item.task_id === selectedTask.id)}
          dependencies={dependencies.filter((item) => item.task_id === selectedTask.id)}
          users={userOptions}
          statuses={statuses.map((status) => status.name)}
          relationLabel={relationLabel}
          completion={completionFor(selectedTask)}
          onAddChecklist={addChecklistItem}
          onToggleChecklist={toggleChecklistItem}
          onAddSubtask={addSubtask}
          onAddComment={addComment}
          onUploadAttachment={uploadAttachment}
          saving={saving}
        />
      )}
    </div>
  );
}

function WorkflowStat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: ElementType; tone: Tone }) {
  const color = tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "red" ? "bg-red-50 text-red-700" : "bg-sky-50 text-sky-700";
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-stone-400">{label}</p>
          <p className="mt-1 text-2xl font-black text-[#163b2c]">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
      </div>
    </article>
  );
}

function Overview({ tasks, myTasks, overdue, pendingApproval, teams, statuses, relationLabel, onOpen }: { tasks: AnyRow[]; myTasks: AnyRow[]; overdue: AnyRow[]; pendingApproval: AnyRow[]; teams: AnyRow[]; statuses: Array<{ name: string }>; relationLabel: (table: any, id: unknown) => string; onOpen: (task: AnyRow) => void }) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Panel title="Minhas prioridades" subtitle="Tarefas suas, urgentes ou próximas do prazo.">
        <div className="space-y-3">
          {myTasks.slice(0, 8).map((task) => <TaskMiniCard key={task.id} task={task} relationLabel={relationLabel} onOpen={onOpen} />)}
          {!myTasks.length && <EmptyMessage text="Você não tem tarefas atribuídas no momento." />}
        </div>
      </Panel>
      <Panel title="Tarefas atrasadas" subtitle="Prazos vencidos que precisam de ação.">
        <div className="space-y-3">
          {overdue.slice(0, 8).map((task) => <TaskMiniCard key={task.id} task={task} relationLabel={relationLabel} onOpen={onOpen} />)}
          {!overdue.length && <EmptyMessage text="Nenhuma tarefa atrasada." />}
        </div>
      </Panel>
      <Panel title="Aguardando aprovação" subtitle="Revisões, correções e decisões pendentes.">
        <div className="space-y-3">
          {pendingApproval.slice(0, 8).map((task) => <TaskMiniCard key={task.id} task={task} relationLabel={relationLabel} onOpen={onOpen} />)}
          {!pendingApproval.length && <EmptyMessage text="Nenhuma aprovação pendente." />}
        </div>
      </Panel>
      <Panel title="Distribuição por status">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {statuses.map((status) => <WorkflowStat key={status.name} label={status.name} value={tasks.filter((task) => task.status === status.name).length} icon={Flag} tone="blue" />)}
        </div>
      </Panel>
      <Panel title="Carga por equipe">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {teams.map((team) => <WorkflowStat key={team.id} label={text(team.name)} value={tasks.filter((task) => task.team_id === team.id).length} icon={Users} tone="green" />)}
          {!teams.length && <EmptyMessage text="Crie equipes para visualizar carga operacional." />}
        </div>
      </Panel>
    </div>
  );
}

function TaskMiniCard({ task, relationLabel, onOpen }: { task: AnyRow; relationLabel: (table: any, id: unknown) => string; onOpen: (task: AnyRow) => void }) {
  return (
    <button onClick={() => onOpen(task)} className={`block w-full rounded-xl border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isOverdue(task) ? "border-red-200" : "border-stone-200"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#163b2c]">{taskTitle(task)}</p>
          <p className="mt-1 truncate text-xs font-semibold text-stone-500">{relationLabel("client", task.client_id) || relationLabel("property", task.property_id) || text(task.stage) || "Sem vínculo"}</p>
        </div>
        <Badge tone={isOverdue(task) ? "red" : "blue"}>{text(task.status || "Não iniciada")}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-stone-500">
        <span className={`rounded-full border px-2 py-0.5 ${priorityClass(text(task.priority || "Normal"))}`}>{text(task.priority || "Normal")}</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {dateBR(task.due_date)}</span>
        <span>{text(task.assignee_name || "Sem responsável")}</span>
      </div>
    </button>
  );
}

function Kanban({ tasks, statuses, relationLabel, dragTaskId, setDragTaskId, onMove, onOpen, completionFor }: { tasks: AnyRow[]; statuses: Array<{ name: string; icon?: string; color?: string }>; relationLabel: (table: any, id: unknown) => string; dragTaskId: string | null; setDragTaskId: (value: string | null) => void; onMove: (task: AnyRow, status: string) => void; onOpen: (task: AnyRow) => void; completionFor: (task: AnyRow) => number }) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[980px] gap-3 lg:grid-cols-7">
        {statuses.map((status) => {
          const columnTasks = tasks.filter((task) => task.status === status.name);
          return (
            <section key={status.name} onDragOver={(event) => event.preventDefault()} onDrop={() => { const task = tasks.find((item) => item.id === dragTaskId); if (task) onMove(task, status.name); setDragTaskId(null); }} className="min-h-[320px] rounded-xl border border-stone-200 bg-stone-50/80 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-[#163b2c]"><span className="mr-1">{status.icon || "•"}</span>{status.name}</h3>
                <Badge>{columnTasks.length}</Badge>
              </div>
              {columnTasks.length > 10 && <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-bold text-amber-700">Coluna sobrecarregada. Redistribua tarefas.</p>}
              <div className="space-y-3">
                {columnTasks.map((task) => (
                  <article key={task.id} draggable onDragStart={() => setDragTaskId(safeId(task.id))} onDragEnd={() => setDragTaskId(null)} className={`cursor-grab rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md ${isOverdue(task) ? "border-red-200" : "border-stone-200"}`}>
                    <button onClick={() => onOpen(task)} className="block w-full text-left">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-black text-[#163b2c]">{taskTitle(task)}</p>
                        <span className="text-xs">↕</span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-stone-500">{relationLabel("client", task.client_id) || relationLabel("property", task.property_id) || "Sem vínculo"}</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-[#2d6b4f]" style={{ width: `${completionFor(task)}%` }} /></div>
                      <div className="mt-3 flex flex-wrap gap-1 text-xs font-bold">
                        <span className={`rounded-full border px-2 py-0.5 ${priorityClass(text(task.priority || "Normal"))}`}>{text(task.priority || "Normal")}</span>
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-stone-600">{dateBR(task.due_date)}</span>
                        {task.visibility && <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-stone-600">{task.visibility}</span>}
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TaskList({ tasks, relationLabel, onOpen, onMove }: { tasks: AnyRow[]; relationLabel: (table: any, id: unknown) => string; onOpen: (task: AnyRow) => void; onMove: (task: AnyRow, status: string) => void }) {
  return (
    <Panel title="Lista operacional" subtitle="No celular, a lista vira cartões com ações essenciais.">
      <div className="hidden overflow-hidden rounded-xl border border-stone-200 lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Tarefa</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Prioridade</th><th className="px-4 py-3">Responsável</th><th className="px-4 py-3">Vínculo</th><th className="px-4 py-3">Prazo</th><th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {tasks.map((task) => (
              <tr key={task.id} className="bg-white hover:bg-stone-50">
                <td className="px-4 py-3 font-black text-[#163b2c]">{taskTitle(task)}</td>
                <td className="px-4 py-3"><Badge tone={isOverdue(task) ? "red" : "blue"}>{text(task.status)}</Badge></td>
                <td className="px-4 py-3"><span className={`rounded-full border px-2 py-0.5 text-xs font-black ${priorityClass(text(task.priority || "Normal"))}`}>{text(task.priority || "Normal")}</span></td>
                <td className="px-4 py-3 text-stone-600">{text(task.assignee_name || "-")}</td>
                <td className="px-4 py-3 text-stone-600">{relationLabel("client", task.client_id) || relationLabel("property", task.property_id) || "-"}</td>
                <td className="px-4 py-3 text-stone-600">{dateBR(task.due_date)}</td>
                <td className="px-4 py-3"><div className="flex gap-2"><Button variant="secondary" icon={Eye} onClick={() => onOpen(task)}>Abrir</Button><Button variant="secondary" onClick={() => onMove(task, "Concluída")}>Concluir</Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 lg:hidden">
        {tasks.map((task) => <TaskMiniCard key={task.id} task={task} relationLabel={relationLabel} onOpen={onOpen} />)}
      </div>
      {!tasks.length && <EmptyMessage text="Nenhuma tarefa encontrada para os filtros atuais." />}
    </Panel>
  );
}

function CalendarView({ tasks, onOpen }: { tasks: AnyRow[]; onOpen: (task: AnyRow) => void }) {
  const grouped = tasks.reduce<Record<string, AnyRow[]>>((acc, task) => {
    const key = task.due_date ? dateBR(task.due_date) : "Sem prazo";
    acc[key] = acc[key] || [];
    acc[key].push(task);
    return acc;
  }, {});
  return (
    <Panel title="Calendário de tarefas" subtitle="Prazos, visitas, vistorias e etapas sincronizadas operacionalmente.">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(grouped).map(([date, items]) => (
          <section key={date} className="rounded-xl border border-stone-200 bg-white p-3">
            <h3 className="mb-3 text-sm font-black text-[#163b2c]">{date}</h3>
            <div className="space-y-2">
              {items.map((task) => <button key={task.id} onClick={() => onOpen(task)} className="block w-full rounded-lg border border-stone-100 bg-stone-50 p-2 text-left text-xs font-bold text-stone-600 hover:bg-white"><span className="block font-black text-[#163b2c]">{taskTitle(task)}</span>{text(task.status)} • {text(task.priority || "Normal")}</button>)}
            </div>
          </section>
        ))}
      </div>
      {!Object.keys(grouped).length && <EmptyMessage text="Nenhuma tarefa com prazo para exibir." />}
    </Panel>
  );
}

function WorkflowTemplates({ templates, stages, instances, clients, properties, services, users, saving, onSeed, onStart }: { templates: AnyRow[]; stages: AnyRow[]; instances: AnyRow[]; clients: Array<{ value: string; label: string }>; properties: Array<{ value: string; label: string }>; services: Array<{ value: string; label: string }>; users: Array<{ value: string; label: string }>; saving: boolean; onSeed: (seed: typeof ruralTemplateSeeds[number]) => void; onStart: (input: { templateId: string; clientId?: string; propertyId?: string; serviceId?: string; responsibleId?: string }) => void }) {
  const [form, setForm] = useState({ templateId: "", clientId: "", propertyId: "", serviceId: "", responsibleId: "" });
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title="Modelos de workflow" subtitle="Modelos editáveis, versionados e persistidos no banco.">
        <div className="grid gap-3 md:grid-cols-2">
          {ruralTemplateSeeds.map((seed) => (
            <article key={seed.name} className="rounded-xl border border-stone-200 bg-white p-3">
              <p className="text-sm font-black text-[#163b2c]">{seed.name}</p>
              <p className="mt-1 text-xs font-semibold text-stone-500">{seed.stages.length} etapas • {seed.category}</p>
              <Button variant="secondary" disabled={saving} onClick={() => onSeed(seed)} icon={Plus}>Carregar modelo editável</Button>
            </article>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {templates.map((template) => <div key={template.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm font-bold text-stone-600"><span className="font-black text-[#163b2c]">{template.name}</span> • {template.category} • v{template.version || 1} • {stages.filter((stage) => stage.template_id === template.id).length} etapas</div>)}
        </div>
      </Panel>
      <Panel title="Iniciar workflow" subtitle="Gera execução independente e cria tarefas reais para as etapas.">
        <div className="grid gap-3">
          <SelectField label="Modelo" value={form.templateId} onChange={(value) => setForm((current) => ({ ...current, templateId: value }))} options={templates.map((template) => ({ value: safeId(template.id), label: text(template.name) }))} />
          <SelectField label="Cliente" value={form.clientId} onChange={(value) => setForm((current) => ({ ...current, clientId: value }))} options={clients} />
          <SelectField label="Imóvel" value={form.propertyId} onChange={(value) => setForm((current) => ({ ...current, propertyId: value }))} options={properties} />
          <SelectField label="Serviço" value={form.serviceId} onChange={(value) => setForm((current) => ({ ...current, serviceId: value }))} options={services} />
          <SelectField label="Responsável" value={form.responsibleId} onChange={(value) => setForm((current) => ({ ...current, responsibleId: value }))} options={users} />
          <Button disabled={saving || !form.templateId} icon={ClipboardCheck} onClick={() => onStart(form)}>Iniciar workflow</Button>
        </div>
        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3">
          <p className="text-sm font-black text-[#163b2c]">Execuções ativas</p>
          <p className="mt-1 text-2xl font-black text-[#163b2c]">{instances.filter((item) => item.status !== "Concluído").length}</p>
        </div>
      </Panel>
    </div>
  );
}

function TeamsView({ teams, users, tasks, saving, onCreate }: { teams: AnyRow[]; users: Array<{ value: string; label: string }>; tasks: AnyRow[]; saving: boolean; onCreate: (name: string, leaderId?: string) => void }) {
  const [name, setName] = useState("");
  const [leader, setLeader] = useState("");
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Panel title="Nova equipe" subtitle="Crie filas de atendimento, documentação, topografia, campo e financeiro.">
        <div className="space-y-3">
          <InputField label="Nome da equipe" value={name} onChange={setName} placeholder="Ex.: Georreferenciamento" />
          <SelectField label="Líder" value={leader} onChange={setLeader} options={users} />
          <Button disabled={saving || !name.trim()} icon={Plus} onClick={() => { onCreate(name, leader); setName(""); setLeader(""); }}>Criar equipe</Button>
        </div>
      </Panel>
      <div className="xl:col-span-2 grid gap-3 md:grid-cols-2">
        {teams.map((team) => <article key={team.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"><p className="text-base font-black text-[#163b2c]">{team.name}</p><p className="mt-1 text-sm font-semibold text-stone-500">Líder: {team.leader_name || "Não definido"}</p><div className="mt-4 grid grid-cols-2 gap-2"><WorkflowStat label="Tarefas" value={tasks.filter((task) => task.team_id === team.id).length} icon={ClipboardCheck} tone="blue" /><WorkflowStat label="Atrasadas" value={tasks.filter((task) => task.team_id === team.id && isOverdue(task)).length} icon={AlertTriangle} tone="red" /></div></article>)}
        {!teams.length && <EmptyMessage text="Nenhuma equipe criada." />}
      </div>
    </div>
  );
}

function WorkflowReports({ tasks, teams, users }: { tasks: AnyRow[]; teams: AnyRow[]; users: AnyRow[] }) {
  const avg = tasks.length ? Math.round(tasks.reduce((acc, task) => acc + Number(task.progress || 0), 0) / tasks.length) : 0;
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title="Indicadores de produtividade">
        <div className="grid gap-3 md:grid-cols-3">
          <WorkflowStat label="Criadas" value={tasks.length} icon={Plus} tone="blue" />
          <WorkflowStat label="Concluídas" value={tasks.filter((task) => /conclu/i.test(text(task.status))).length} icon={CheckCircle2} tone="green" />
          <WorkflowStat label="Progresso médio" value={avg} icon={Flag} tone="amber" />
        </div>
      </Panel>
      <Panel title="Gargalos por responsável">
        <div className="space-y-2">
          {users.slice(0, 10).map((user) => <div key={user.id || user.staff_id} className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm"><span className="font-bold text-stone-600">{user.full_name || user.name}</span><Badge tone="blue">{tasks.filter((task) => String(task.assigned_to) === String(user.id || user.staff_id)).length} tarefas</Badge></div>)}
        </div>
      </Panel>
      <Panel title="Carga por equipe">
        <div className="space-y-2">{teams.map((team) => <div key={team.id} className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm"><span className="font-bold text-stone-600">{team.name}</span><Badge tone="green">{tasks.filter((task) => task.team_id === team.id).length} tarefas</Badge></div>)}</div>
      </Panel>
    </div>
  );
}

function WorkflowSettings({ statuses, notifications, onMarkRead }: { statuses: Array<{ name: string; color?: string; icon?: string }>; notifications: AnyRow[]; onMarkRead: (notification: AnyRow) => void }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title="Status do Workflow" subtitle="Status internos são preservados; administradores podem criar status personalizados via tabela workflow_statuses.">
        <div className="grid gap-2 sm:grid-cols-2">
          {statuses.map((status) => <div key={status.name} className="rounded-lg border border-stone-200 bg-white p-3 text-sm font-black text-[#163b2c]"><span className="mr-2">{status.icon || "•"}</span>{status.name}</div>)}
        </div>
      </Panel>
      <Panel title="Central de notificações" subtitle="Atualizações, menções e prazos do workflow.">
        <div className="space-y-2">
          {notifications.slice(0, 12).map((notification) => <button key={notification.id} onClick={() => onMarkRead(notification)} className={`block w-full rounded-lg border p-3 text-left text-sm ${notification.read_at ? "border-stone-100 bg-stone-50 text-stone-500" : "border-amber-200 bg-amber-50 text-amber-800"}`}><span className="font-black">{notification.title}</span><span className="mt-1 block font-semibold">{notification.message}</span></button>)}
          {!notifications.length && <EmptyMessage text="Nenhuma notificação." />}
        </div>
      </Panel>
    </div>
  );
}

function TaskFormModal({ title, onClose, onSubmit, saving, clients, properties, services, users, teams, statuses }: { title: string; onClose: () => void; onSubmit: (payload: AnyRow) => void; saving: boolean; clients: Array<{ value: string; label: string }>; properties: Array<{ value: string; label: string }>; services: Array<{ value: string; label: string }>; users: Array<{ value: string; label: string }>; teams: Array<{ value: string; label: string }>; statuses: string[] }) {
  const [advanced, setAdvanced] = useState(false);
  const [form, setForm] = useState<AnyRow>({ title: "", description: "", assigned_to: "", due_date: "", priority: "Normal", visibility: "Pública na empresa", status: "Não iniciada" });
  const update = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><p className="text-xs font-black uppercase text-stone-400">Workflow</p><h2 className="text-xl font-black text-[#163b2c]">{title}</h2></div>
          <button onClick={onClose} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!text(form.title).trim()) return; onSubmit(form); }}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2"><InputField label="Título" value={text(form.title)} onChange={(value) => update("title", value)} required /></div>
            <SelectField label="Responsável" value={text(form.assigned_to)} onChange={(value) => update("assigned_to", value)} options={users} />
            <InputField label="Prazo" type="date" value={text(form.due_date)} onChange={(value) => update("due_date", value)} />
            <SelectField label="Prioridade" value={text(form.priority)} onChange={(value) => update("priority", value)} options={priorities.map((item) => ({ value: item, label: item }))} />
            <SelectField label="Visibilidade" value={text(form.visibility)} onChange={(value) => update("visibility", value)} options={visibilities.map((item) => ({ value: item, label: item }))} />
          </div>
          <button type="button" onClick={() => setAdvanced((current) => !current)} className="inline-flex items-center gap-2 text-sm font-black text-[#163b2c]">{advanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} Mais opções</button>
          {advanced && (
            <div className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 md:grid-cols-2">
              <div className="md:col-span-2"><TextAreaField label="Descrição" value={text(form.description)} onChange={(value) => update("description", value)} /></div>
              <SelectField label="Status" value={text(form.status)} onChange={(value) => update("status", value)} options={statuses.map((item) => ({ value: item, label: item }))} />
              <SelectField label="Equipe" value={text(form.team_id)} onChange={(value) => update("team_id", value)} options={teams} />
              <SelectField label="Cliente" value={text(form.client_id)} onChange={(value) => update("client_id", value)} options={clients} />
              <SelectField label="Imóvel" value={text(form.property_id)} onChange={(value) => update("property_id", value)} options={properties} />
              <SelectField label="Serviço" value={text(form.service_id)} onChange={(value) => update("service_id", value)} options={services} />
              <InputField label="Estimativa em minutos" type="number" value={text(form.estimated_minutes)} onChange={(value) => update("estimated_minutes", value)} />
              <div className="md:col-span-2"><TextAreaField label="Observação privada" value={text(form.private_notes)} onChange={(value) => update("private_notes", value)} /></div>
            </div>
          )}
          <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap justify-end gap-2 border-t border-stone-200 bg-white p-4 sm:-mx-6 sm:-mb-6">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || !text(form.title).trim()} icon={Plus}>{saving ? "Salvando..." : "Salvar tarefa"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskDetail({ task, onClose, onUpdate, comments, checklistItems, subtasks, attachments, approvals, dependencies, users, statuses, relationLabel, completion, onAddChecklist, onToggleChecklist, onAddSubtask, onAddComment, onUploadAttachment, saving }: { task: AnyRow; onClose: () => void; onUpdate: (task: AnyRow, patch: AnyRow, success?: string) => void; comments: AnyRow[]; checklistItems: AnyRow[]; subtasks: AnyRow[]; attachments: AnyRow[]; approvals: AnyRow[]; dependencies: AnyRow[]; users: Array<{ value: string; label: string }>; statuses: string[]; relationLabel: (table: any, id: unknown) => string; completion: number; onAddChecklist: (task: AnyRow, title: string) => void; onToggleChecklist: (item: AnyRow) => void; onAddSubtask: (task: AnyRow, title: string, assignee?: string) => void; onAddComment: (task: AnyRow, body: string, visibleToClient?: boolean) => void; onUploadAttachment: (task: AnyRow, file: File, shareWithClient?: boolean) => void; saving: boolean }) {
  const [checkTitle, setCheckTitle] = useState("");
  const [subTitle, setSubTitle] = useState("");
  const [subAssignee, setSubAssignee] = useState("");
  const [comment, setComment] = useState("");
  const [clientVisible, setClientVisible] = useState(false);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-6">
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-stone-400">Detalhes da tarefa</p>
            <h2 className="text-xl font-black text-[#163b2c]">{taskTitle(task)}</h2>
            <div className="mt-2 flex flex-wrap gap-2"><Badge tone={isOverdue(task) ? "red" : "blue"}>{text(task.status)}</Badge><span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${priorityClass(text(task.priority || "Normal"))}`}>{text(task.priority || "Normal")}</span><Badge>{text(task.visibility || "Pública na empresa")}</Badge></div>
          </div>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" icon={CheckCircle2} onClick={() => onUpdate(task, { status: "Concluída" }, "Tarefa concluída.")}>Concluir</Button><button onClick={onClose} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"><X className="h-5 w-5" /></button></div>
        </div>
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <Panel title="Conteúdo e progresso">
              <p className="whitespace-pre-wrap text-sm font-semibold text-stone-600">{text(task.description || "Sem descrição.")}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-[#2d6b4f]" style={{ width: `${completion}%` }} /></div>
              <p className="mt-1 text-xs font-black text-stone-500">Checklist: {completion}% concluído</p>
            </Panel>
            <Panel title="Checklist obrigatório" action={<Button variant="secondary" icon={Plus} onClick={() => { onAddChecklist(task, checkTitle); setCheckTitle(""); }}>Adicionar</Button>}>
              <div className="mb-3"><InputField label="Novo item" value={checkTitle} onChange={setCheckTitle} /></div>
              <div className="space-y-2">{checklistItems.map((item) => <button key={item.id} onClick={() => onToggleChecklist(item)} className="flex w-full items-center gap-3 rounded-lg border border-stone-100 bg-stone-50 p-3 text-left text-sm font-bold text-stone-600"><span className={`flex h-5 w-5 items-center justify-center rounded border ${item.completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-stone-300 bg-white"}`}>{item.completed ? "✓" : ""}</span>{item.title}<span className="ml-auto"><Badge tone={item.required ? "amber" : "gray"}>{item.required ? "Obrigatório" : "Opcional"}</Badge></span></button>)}</div>
              {!checklistItems.length && <EmptyMessage text="Nenhum item de checklist." />}
            </Panel>
            <Panel title="Subtarefas" action={<Button variant="secondary" icon={Plus} onClick={() => { onAddSubtask(task, subTitle, subAssignee); setSubTitle(""); setSubAssignee(""); }}>Adicionar</Button>}>
              <div className="mb-3 grid gap-2 md:grid-cols-2"><InputField label="Nova subtarefa" value={subTitle} onChange={setSubTitle} /><SelectField label="Responsável" value={subAssignee} onChange={setSubAssignee} options={users} /></div>
              <div className="space-y-2">{subtasks.map((item) => <div key={item.id} className="rounded-lg border border-stone-100 bg-stone-50 p-3 text-sm"><p className="font-black text-[#163b2c]">{item.title}</p><p className="text-stone-500">{item.status} • {item.assignee_name || "Sem responsável"}</p></div>)}</div>
            </Panel>
            <Panel title="Comentários e menções" action={<Button variant="secondary" icon={Send} onClick={() => { onAddComment(task, comment, clientVisible); setComment(""); }}>Comentar</Button>}>
              <TextAreaField label="Novo comentário" value={comment} onChange={setComment} placeholder="Use @nome para mencionar alguém com acesso à tarefa." />
              <label className="mt-2 flex items-center gap-2 text-sm font-bold text-stone-600"><input type="checkbox" checked={clientVisible} onChange={(event) => setClientVisible(event.target.checked)} /> Visível ao cliente</label>
              <div className="mt-4 space-y-2">{comments.map((item) => <div key={item.id} className="rounded-lg border border-stone-100 bg-white p-3 text-sm"><p className="font-black text-[#163b2c]">{item.created_by_name || "Usuário"} {item.visible_to_client && <Badge tone="blue">Cliente</Badge>}</p><p className="mt-1 whitespace-pre-wrap text-stone-600">{item.body}</p></div>)}</div>
            </Panel>
            <Panel title="Anexos protegidos" action={<label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-black text-[#163b2c] hover:bg-stone-50"><Upload className="h-4 w-4" /> Enviar<input type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUploadAttachment(task, file, false); event.currentTarget.value = ""; }} /></label>}>
              <div className="grid gap-2 md:grid-cols-2">{attachments.map((item) => <div key={item.id} className="rounded-lg border border-stone-100 bg-stone-50 p-3 text-sm"><p className="font-black text-[#163b2c]"><Paperclip className="mr-1 inline h-4 w-4" />{item.file_name || item.name}</p><p className="text-stone-500">{item.file_type || item.mime_type} • {item.visibility || "Interno"}</p>{item.signed_url && <a href={item.signed_url} target="_blank" className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#163b2c]"><Download className="h-3 w-3" /> Baixar</a>}</div>)}</div>
              {!attachments.length && <EmptyMessage text="Nenhum anexo enviado." />}
            </Panel>
          </div>
          <aside className="space-y-5">
            <Panel title="Dados rápidos">
              <div className="space-y-3 text-sm font-semibold text-stone-600">
                <Info label="Responsável" value={text(task.assignee_name || "-")} />
                <Info label="Prazo" value={dateBR(task.due_date)} />
                <Info label="Cliente" value={relationLabel("client", task.client_id) || "-"} />
                <Info label="Imóvel" value={relationLabel("property", task.property_id) || "-"} />
                <Info label="Serviço" value={relationLabel("service", task.service_id) || "-"} />
              </div>
            </Panel>
            <Panel title="Status e responsável">
              <div className="space-y-3"><SelectField label="Status" value={text(task.status)} onChange={(value) => onUpdate(task, { status: value })} options={statuses.map((item) => ({ value: item, label: item }))} /><SelectField label="Responsável" value={text(task.assigned_to)} onChange={(value) => onUpdate(task, { assigned_to: value, assignee_name: users.find((user) => user.value === value)?.label })} options={users} /></div>
            </Panel>
            <Panel title="Dependências e aprovações">
              <div className="space-y-2 text-sm font-semibold text-stone-600"><p>Dependências: {dependencies.length}</p><p>Aprovações: {approvals.length}</p>{task.requires_approval && <Badge tone="amber">Exige aprovação</Badge>}</div>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-2"><span className="text-stone-400">{label}</span><strong className="text-right text-[#163b2c]">{value}</strong></div>;
}

function EmptyMessage({ text: value }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-4 text-sm font-bold text-stone-500">{value}</p>;
}
