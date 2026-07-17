"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  DollarSign,
  Download,
  Edit3,
  Eye,
  FileSignature,
  FileStack,
  FileText,
  FolderOpen,
  Home,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Lock,
  LogOut,
  Map,
  MapPinned,
  Menu,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sprout,
  Trash2,
  Upload,
  Users,
  Wrench,
  X
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { backendMissingMessage, hasSupabaseConfig, isDemoMode } from "@/lib/env";
import { supabase } from "@/lib/supabase/client";
import {
  auditAction,
  createRecord,
  deleteRecord,
  downloadDocumentFile,
  listRecords,
  softDeleteRecord,
  updateRecord,
  uploadDocumentFile,
  type BackendRecord
} from "@/lib/services/base";
import { clearLocalSession, demoProfiles, getCurrentProfile, getStoredPortalToken, getStoredStaffToken, sendPasswordReset, signInClientWithCpf, signInStaffWithCpf, signInWithPassword, signOut, type AuthProfile, type AuthRole } from "@/lib/services/auth";
import { parseCoordinateCsv } from "@/lib/services/geo";
import { RelationSelect, type RelationOption } from "@/components/shared/RelationSelect";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { WorkflowModule } from "@/components/modules/workflow/WorkflowModule";
import {
  auditLogs as seedAuditLogs,
  certificates as seedCertificates,
  clients as seedClients,
  commercialTemplates as seedCommercialTemplates,
  dueDiligenceCases as seedDueDiligenceCases,
  dueDiligenceChecklist as seedDueDiligenceChecklist,
  equipment as seedEquipment,
  financialEntries as seedFinancialEntries,
  geoFiles as seedGeoFiles,
  leads as seedLeads,
  monthlyRevenue,
  neighbors as seedNeighbors,
  officialChecks as seedOfficialChecks,
  ownershipChain as seedOwnershipChain,
  pendencies as seedPendencies,
  productivity,
  properties as seedProperties,
  propertyVertices as seedPropertyVertices,
  protocols as seedProtocols,
  registryRecords as seedRegistryRecords,
  registryRequirements as seedRegistryRequirements,
  ruralCalendarAlerts,
  serviceStatus,
  services as seedServices
} from "@/lib/data";

type AnyRow = BackendRecord & Record<string, unknown>;
type FieldType = "text" | "email" | "tel" | "date" | "number" | "money" | "textarea" | "select" | "checkbox";
type StatusTone = "green" | "amber" | "red" | "blue" | "gray";

type FieldConfig = {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

type RowAction =
  | "convert-lead"
  | "create-checklist"
  | "generate-contract"
  | "release-portal"
  | "hide-portal"
  | "approve"
  | "reject"
  | "generate-pdf"
  | "block-company"
  | "unblock-company"
  | "block-user"
  | "unblock-user"
  | "make-company-admin"
  | "remove-company-admin"
  | "generate-access-code"
  | "create-pending"
  | "generate-client-sheet"
  | "create-client-checklist"
  | "export-client-contacts"
  | "duplicate-checklist-template"
  | "request-checklist-items"
  | "upload-client-photo"
  | "generate-client-dossier"
  | "generate-client-dossier-spouse"
  | "generate-client-dossier-excel";

type ModuleConfig = {
  id: string;
  label: string;
  table: string;
  icon: ElementType;
  description: string;
  fields: FieldConfig[];
  columns: string[];
  roles: AuthRole[];
  rowActions?: RowAction[];
};

const platformCompanyId = "00000000-0000-4000-8000-000000000000";
const demoCompanyId = "00000000-0000-4000-8000-000000000001";
const demoSecondCompanyId = "00000000-0000-4000-8000-000000000002";
const logoSrc = "/nex-rural-logo.svg";

const roleLabels: Record<AuthRole, string> = {
  admin_master_global: "Admin Master Global",
  company_admin: "Admin da Empresa",
  admin_master: "Admin Master",
  gestor: "Gestor",
  tecnico: "Tecnico",
  topografo: "Topografo",
  agrimensor: "Agrimensor",
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  atendente: "Atendente",
  analista_documental: "Analista documental",
  cartorio: "Cartório",
  geo: "Geo",
  cliente: "Cliente"
};

const roleOptions = Object.keys(roleLabels) as AuthRole[];

const internalRoles: AuthRole[] = ["admin_master_global", "company_admin", "admin_master", "gestor", "tecnico", "topografo", "agrimensor", "administrativo", "financeiro", "atendente", "analista_documental", "cartorio", "geo"];
const allInternalRoles = internalRoles;
const globalRoles: AuthRole[] = ["admin_master_global"];
const companyAdminRoles: AuthRole[] = ["admin_master_global", "company_admin", "admin_master"];
const financeRoles: AuthRole[] = ["admin_master_global", "company_admin", "admin_master", "gestor", "financeiro"];
const technicalRoles: AuthRole[] = ["admin_master_global", "company_admin", "admin_master", "gestor", "tecnico", "topografo", "agrimensor", "geo"];
const adminOperationalRoles: AuthRole[] = ["admin_master_global", "company_admin", "admin_master", "gestor", "administrativo", "atendente", "analista_documental", "cartorio"];

const tableNames = [
  "companies",
  "company_units",
  "user_profiles",
  "staff_profiles",
  "roles",
  "permissions",
  "user_permissions",
  "client_portal_access",
  "leads",
  "clients",
  "rural_properties",
  "services",
  "service_checklists",
  "protocols",
  "pending_items",
  "documents",
  "geo_files",
  "property_vertices",
  "property_neighbors",
  "field_equipment",
  "equipment_movements",
  "inspections",
  "registry_records",
  "registry_requirements",
  "property_certificates",
  "official_checks",
  "document_library_items",
  "checklist_templates",
  "checklist_template_items",
  "generated_checklists",
  "generated_checklist_items",
  "checklist_item_documents",
  "checklist_sources",
  "document_templates",
  "generated_documents",
  "template_variables",
  "tags",
  "client_tags",
  "client_spouses",
  "client_exports",
  "official_templates",
  "commercial_templates",
  "generated_commercial_documents",
  "due_diligence_cases",
  "due_diligence_risks",
  "ownership_chain",
  "financial_entries",
  "aged_producer_registrations",
  "aged_property_registrations",
  "aged_livestock_exploitations",
  "aged_gta_records",
  "iterma_cases",
  "rural_contracts",
  "car_records",
  "ccir_records",
  "itr_records",
  "sigef_records",
  "cib_nirf_records",
  "technical_area_comparisons",
  "reports",
  "report_exports",
  "workflow_statuses",
  "workflow_templates",
  "workflow_template_versions",
  "workflow_stages",
  "workflow_transitions",
  "workflow_instances",
  "workflow_instance_stages",
  "workflow_tasks",
  "workflow_task_participants",
  "workflow_task_checklists",
  "workflow_task_subtasks",
  "workflow_task_comments",
  "workflow_task_attachments",
  "workflow_task_dependencies",
  "workflow_task_approvals",
  "workflow_task_tags",
  "workflow_task_tag_links",
  "workflow_task_time_entries",
  "workflow_teams",
  "workflow_team_members",
  "workflow_notifications",
  "workflow_notification_preferences",
  "workflow_automation_rules",
  "workflow_automation_executions",
  "workflow_activity_logs",
  "audit_logs"
];

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function dateBR(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

function toneFor(status: string): StatusTone {
  if (/regular|concluido|recebido|ativo|deferido|aprovado|liberado|corrigido|sem divergencia/i.test(status)) return "green";
  if (/atrasad|vencid|reprov|indefer|critico|divergencia|inativo/i.test(status)) return "red";
  if (/aguardando|pendente|exigencia|analise|pagar|receber|medio/i.test(status)) return "amber";
  if (/levantamento|protocolado|andamento|consultado|novo/i.test(status)) return "blue";
  return "gray";
}

function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: StatusTone }) {
  const tones: Record<StatusTone, string> = {
    green: "bg-emerald-50 text-emerald-800 border-emerald-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    red: "bg-red-50 text-red-800 border-red-200",
    blue: "bg-sky-50 text-sky-800 border-sky-200",
    gray: "bg-stone-100 text-stone-700 border-stone-200"
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gold/20">
        <Image src={logoSrc} alt="Nex Rural" width={40} height={40} className="h-10 w-10 object-contain" priority unoptimized />
      </div>
      <div>
        <div className="text-lg font-black tracking-normal text-forest">Nex Rural</div>
        <div className="text-xs font-medium text-stone-500">Gestão documental rural</div>
      </div>
    </div>
  );
}

function text(value: unknown) {
  return String(value ?? "");
}

function pickRowTitle(row: AnyRow) {
  return text(row.name || row.full_name || row.title || row.document_name || row.number || row.protocol_number || row.email || row.id);
}

const hiddenTechnicalFields = new Set([
  "id",
  "uuid",
  "company_id",
  "client_id",
  "property_id",
  "service_id",
  "protocol_id",
  "pending_item_id",
  "template_id",
  "template_item_id",
  "generated_checklist_id",
  "generated_checklist_item_id",
  "document_id",
  "tag_id",
  "created_by",
  "updated_by",
  "deleted_at",
  "photo_storage_path",
  "storage_path",
  "data_url",
  "old_value",
  "new_value"
]);

const fieldLabels: Record<string, string> = {
  name: "Nome",
  full_name: "Nome completo",
  type: "Tipo",
  category: "Categoria",
  description: "Descrição",
  body: "Conteúdo",
  document: "CPF/CNPJ",
  cpf_cnpj: "CPF/CNPJ",
  phone: "Telefone",
  whatsapp: "WhatsApp",
  email: "E-mail",
  address: "Endereço",
  city: "Cidade",
  state: "UF",
  municipality: "Município",
  status: "Status",
  active: "Ativo",
  portal_enabled: "Portal",
  visible_on_portal: "Portal",
  visible_to_client: "Visível ao cliente",
  required: "Obrigatório",
  who_provides: "Responsável",
  responsible_type: "Responsável",
  document_name: "Documento",
  source_notice: "Aviso",
  service_type: "Serviço",
  procedure_type: "Procedimento",
  target_entity: "Aplicação",
  is_global_default: "Modelo padrão",
  is_editable: "Editável",
  created_at: "Criado em",
  updated_at: "Atualizado em",
  version: "Versão",
  color: "Cor",
  tags_summary: "Tags",
  marital_status: "Estado civil",
  has_spouse: "Possui cônjuge",
  marriage_regime: "Regime",
  client_access_code: "Código do portal",
  photo_url: "Foto",
  sort_order: "Ordem",
  item_type: "Tipo do item",
  requires_spouse: "Exige cônjuge",
  requires_property: "Exige imóvel",
  requires_geo_file: "Exige arquivo geo",
  portal_instruction: "Orientação ao cliente",
  internal_instruction: "Orientação interna",
  progress_percent: "Progresso",
  due_date: "Prazo",
  rejection_reason: "Motivo da recusa",
  title: "Título"
};

function friendlyLabel(field: string) {
  return fieldLabels[field] ?? field.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function isTechnicalField(field: string) {
  return hiddenTechnicalFields.has(field) || field.endsWith("_id") || field.includes("uuid");
}

function safeDisplayColumns(columns: string[]) {
  const filtered = columns.filter((column) => !isTechnicalField(column));
  return filtered.length ? filtered.slice(0, 7) : columns.filter((column) => column !== "id").slice(0, 6);
}

function shortText(value: unknown, max = 78) {
  const content = formatCell(value).replace(/\s+/g, " ").trim();
  return content.length > max ? `${content.slice(0, max - 1)}…` : content;
}


const documentTemplateSeeds: AnyRow[] = [
  {
    name: "Declaração de posse rural",
    type: "Declaração",
    category: "Rural",
    description: "Modelo operacional editável para declaração de posse rural.",
    body: "Eu, {{cliente_nome}}, inscrito(a) no CPF/CNPJ nº {{cliente_cpf}}, declaro, para fins administrativos e documentais, exercer posse mansa e pacífica sobre o imóvel rural denominado {{imovel_nome}}, localizado no município de {{municipio}}, com área aproximada de {{area_total}}. Declaro que as informações prestadas são verdadeiras e assumo responsabilidade por sua veracidade.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}",
    variables: ["cliente_nome", "cliente_cpf", "imovel_nome", "municipio", "area_total", "data_atual"]
  },
  {
    name: "Declaração de residência rural",
    type: "Declaração",
    category: "Cliente",
    description: "Modelo para declaração de residência em zona rural.",
    body: "Eu, {{cliente_nome}}, CPF/CNPJ nº {{cliente_cpf}}, declaro residir no endereço rural vinculado ao imóvel {{imovel_nome}}, situado em {{municipio}}. A presente declaração é emitida para fins de instrução documental.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}",
    variables: ["cliente_nome", "cliente_cpf", "imovel_nome", "municipio", "data_atual"]
  },
  {
    name: "Declaração de atividade rural",
    type: "Declaração",
    category: "Rural",
    description: "Declaração operacional de exercício de atividade rural.",
    body: "Eu, {{cliente_nome}}, CPF/CNPJ nº {{cliente_cpf}}, declaro exercer atividade rural no imóvel {{imovel_nome}}, situado em {{municipio}}, desenvolvendo atividades compatíveis com a finalidade rural da propriedade/posse.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}",
    variables: ["cliente_nome", "cliente_cpf", "imovel_nome", "municipio", "data_atual"]
  },
  {
    name: "Declaração de confrontantes",
    type: "Declaração",
    category: "Cartório",
    description: "Modelo para registrar ciência/identificação de confrontantes.",
    body: "Declaramos, para fins de instrução documental do imóvel {{imovel_nome}}, matrícula/cadastro {{matricula}}, localizado em {{municipio}}, que os confrontantes relacionados foram informados para conferência dos limites do imóvel. Este modelo deve ser revisado conforme exigência do cartório ou órgão competente.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\nResponsável pela conferência",
    variables: ["imovel_nome", "matricula", "municipio", "data_atual"]
  },
  {
    name: "Declaração de anuência de confrontantes",
    type: "Declaração",
    category: "Cartório",
    description: "Modelo operacional para anuência de confrontantes.",
    body: "Eu, abaixo assinado, na qualidade de confrontante do imóvel {{imovel_nome}}, localizado em {{municipio}}, declaro ciência dos limites informados e, quando aplicável, anuência para fins de regularização, retificação, georreferenciamento ou procedimento correlato.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\nConfrontante",
    variables: ["imovel_nome", "municipio", "data_atual"]
  },
  {
    name: "Autorização para protocolo",
    type: "Autorização",
    category: "Cliente",
    description: "Autorização para empresa protocolar ou acompanhar procedimento.",
    body: "Eu, {{cliente_nome}}, CPF/CNPJ nº {{cliente_cpf}}, autorizo {{company_name}} a protocolar, acompanhar, retirar exigências e apresentar documentos relacionados ao procedimento {{servico_tipo}}, referente ao imóvel {{imovel_nome}}.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}",
    variables: ["cliente_nome", "cliente_cpf", "company_name", "servico_tipo", "imovel_nome", "municipio", "data_atual"]
  },
  {
    name: "Procuração simples para acompanhamento administrativo",
    type: "Procuração",
    category: "Cliente",
    description: "Modelo simples para acompanhamento administrativo, sem substituir procuração pública quando exigida.",
    body: "Por este instrumento particular, {{cliente_nome}}, CPF/CNPJ nº {{cliente_cpf}}, autoriza {{company_name}} a acompanhar administrativamente o procedimento {{servico_tipo}}, solicitar informações, apresentar documentos e receber comunicações, quando aceito pelo órgão ou serventia competente.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}",
    variables: ["cliente_nome", "cliente_cpf", "company_name", "servico_tipo", "municipio", "data_atual"]
  },
  {
    name: "Requerimento de averbação",
    type: "Requerimento",
    category: "Cartório",
    description: "Requerimento operacional para averbação em matrícula.",
    body: "Ao Cartório competente,\n\n{{cliente_nome}}, CPF/CNPJ nº {{cliente_cpf}}, vem requerer a averbação referente ao imóvel de matrícula {{matricula}}, localizado em {{municipio}}, conforme documentos anexos e orientações da serventia.\n\nTermos em que pede deferimento.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}",
    variables: ["cliente_nome", "cliente_cpf", "matricula", "municipio", "data_atual"]
  },
  {
    name: "Requerimento de retificação de matrícula",
    type: "Requerimento",
    category: "Cartório",
    description: "Requerimento operacional para retificação de dados ou área.",
    body: "Ao Cartório competente,\n\n{{cliente_nome}}, CPF/CNPJ nº {{cliente_cpf}}, requer a análise de retificação da matrícula {{matricula}}, referente ao imóvel {{imovel_nome}}, conforme documentos técnicos, declarações e peças anexas.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}",
    variables: ["cliente_nome", "cliente_cpf", "matricula", "imovel_nome", "municipio", "data_atual"]
  },
  {
    name: "Termo de entrega de documentos",
    type: "Termo",
    category: "Cliente",
    description: "Termo profissional para recebimento de documentos do cliente.",
    body: "TERMO DE ENTREGA DE DOCUMENTOS\n\nEmpresa: {{company_name}}\nCliente: {{cliente_nome}}\nCPF/CNPJ: {{cliente_cpf}}\nServiço/Procedimento: {{servico_tipo}}\nData: {{data_atual}}\n\nDeclaramos que foram recebidos os documentos relacionados para fins de análise, organização e acompanhamento do procedimento solicitado.\n\nAssinaturas:\n\n__________________________________\nResponsável pelo recebimento\n\n__________________________________\nCliente/Representante",
    variables: ["company_name", "cliente_nome", "cliente_cpf", "servico_tipo", "data_atual"]
  },
  {
    name: "Termo de ciência de pendências",
    type: "Termo",
    category: "Documento",
    description: "Termo para ciência de pendências documentais.",
    body: "Eu, {{cliente_nome}}, CPF/CNPJ nº {{cliente_cpf}}, declaro estar ciente das pendências documentais relacionadas ao procedimento {{servico_tipo}}, comprometendo-me a providenciar as informações ou documentos necessários para continuidade do atendimento.\n\n{{municipio}}, {{data_atual}}.\n\n__________________________________\n{{cliente_nome}}",
    variables: ["cliente_nome", "cliente_cpf", "servico_tipo", "municipio", "data_atual"]
  },
  {
    name: "Solicitação de documentos ao cliente",
    type: "Solicitação",
    category: "Documento",
    description: "Modelo para orientar o cliente sobre documentos pendentes.",
    body: "Prezado(a) {{cliente_nome}},\n\nPara dar continuidade ao procedimento {{servico_tipo}} referente ao imóvel {{imovel_nome}}, solicitamos o envio dos documentos pendentes indicados no checklist. Envie arquivos legíveis em PDF, JPG ou PNG.\n\nAtenciosamente,\n{{company_name}}",
    variables: ["cliente_nome", "servico_tipo", "imovel_nome", "company_name"]
  }
];

const checklistTemplateSeedDefinitions = [
  { key: "AVERB", name: "Checklist de Averbação", category: "Cartório", service: "Averbação", items: ["Matrícula atualizada do imóvel", "Documentos pessoais do proprietário", "Documentos do cônjuge, se aplicável", "Requerimento de averbação", "Documento que comprova o ato a ser averbado", "Comprovante de emolumentos, se houver", "Procuração, se representado por terceiro"] },
  { key: "REG", name: "Checklist de Escritura e Registro", category: "Cartório", service: "Escritura e Registro", items: ["Documentos pessoais das partes", "Certidão de matrícula atualizada", "Comprovante de endereço", "Certidões exigidas pela serventia", "Comprovante de pagamento de tributos", "Escritura ou título apresentado", "Procuração, se houver representante"] },
  { key: "RET-MAT", name: "Checklist de Retificação de Matrícula", category: "Cartório", service: "Retificação", items: ["Matrícula atualizada", "Requerimento de retificação", "Planta e memorial, se envolver área", "ART/RRT", "Anuência de confrontantes quando exigida", "Documentos pessoais", "Notas devolutivas anteriores"] },
  { key: "GEO", name: "Checklist de Georreferenciamento", category: "Geo", service: "Georreferenciamento", items: ["Matrícula ou documento de posse", "Documentos pessoais do proprietário/possuidor", "CAR e CCIR, se existentes", "Levantamento de campo", "Planta", "Memorial descritivo", "ART/RRT", "Arquivo técnico/planilha SIGEF", "Declaração de confrontantes, se aplicável"] },
  { key: "SIGEF", name: "Checklist de SIGEF", category: "Geo", service: "SIGEF", items: ["Matrícula ou documento base", "Planta e memorial descritivo", "ART/RRT", "Planilha SIGEF", "Arquivo técnico validado", "Documentos do responsável técnico", "Comprovante de submissão/certificação"] },
  { key: "CAR", name: "Checklist de CAR", category: "Ambiental", service: "CAR", items: ["Documentos pessoais do proprietário/possuidor", "Comprovante de propriedade ou posse", "Dados do imóvel rural", "Mapa ou arquivo técnico, se houver", "Recibo CAR anterior, se retificação", "Informações ambientais do imóvel"] },
  { key: "CCIR", name: "Checklist de CCIR/SNCR", category: "INCRA", service: "CCIR/SNCR", items: ["Documentos pessoais", "Comprovante de propriedade ou posse", "Dados do imóvel", "Área total e exploração", "Comprovantes anteriores", "Procuração, se aplicável"] },
  { key: "ITR", name: "Checklist de ITR/DITR", category: "Fiscal", service: "ITR/DITR", items: ["CPF/CNPJ do titular", "Dados do imóvel", "Área total e áreas de utilização", "CAR/CCIR quando houver", "Recibos anteriores", "Informações fiscais necessárias"] },
  { key: "AGED", name: "Checklist AGED - Produtor/Propriedade", category: "AGED", service: "AGED", items: ["Documentos pessoais do produtor", "Comprovante de endereço", "Dados da propriedade", "Documentos do imóvel", "Informações de exploração pecuária", "Procuração ou autorização quando aplicável"] },
  { key: "ITERMA", name: "Checklist ITERMA - Regularização Fundiária", category: "ITERMA", service: "ITERMA", items: ["Documentos pessoais", "Comprovante de residência", "Declaração de posse", "Documentos do imóvel", "Croqui ou localização", "Declarações complementares", "Fotos/documentos de ocupação quando aplicável"] },
  { key: "USUC", name: "Checklist de Usucapião Rural", category: "Cartório", service: "Usucapião Rural", items: ["Documentos pessoais", "Comprovantes de posse", "Planta e memorial", "ART/RRT", "Certidões do imóvel e confrontantes", "Declarações testemunhais", "Documentos do cônjuge, se aplicável"] },
  { key: "DOSSIE", name: "Checklist de Dossiê Rural", category: "Dossiê", service: "Dossiê Rural", items: ["Ficha completa do cliente", "Documentos pessoais", "Dados do cônjuge, se houver", "Documentos do imóvel", "Matrícula/certidão atualizada", "CAR", "CCIR", "ITR", "CIB/NIRF", "Documentos técnicos", "Pendências", "Histórico de atendimentos"] }
];
function makeDemoDatabase(): Record<string, AnyRow[]> {
  const clientIdByName = Object.fromEntries(seedClients.map((client) => [client.nome, client.id]));
  const propertyIdByName = Object.fromEntries(seedProperties.map((property) => [property.nome, property.id]));
  const serviceIdByType = Object.fromEntries(seedServices.map((service) => [service.tipo, service.id]));

  const clients = seedClients.map((client) => ({
    id: client.id,
    company_id: demoCompanyId,
    type: client.tipo,
    name: client.nome,
    full_name: client.nome,
    document: client.documento,
    cpf_cnpj: client.documento,
    phone: client.telefone,
    whatsapp: client.telefone,
    email: client.email,
    city: client.cidade,
    state: client.estado,
    responsible_name: client.responsavel,
    status: client.status,
    active: client.status !== "Inativo",
    portal_enabled: true,
    client_access_code: client.id === "CL-2201" ? "2201" : "2202",
    has_spouse: client.id === "CL-2201",
    marital_status: client.id === "CL-2201" ? "Casado(a)" : "Solteiro(a)",
    marriage_regime: client.id === "CL-2201" ? "Comunhao parcial" : null,
    spouse_full_name: client.id === "CL-2201" ? "Maria Ferreira" : null,
    spouse_cpf: client.id === "CL-2201" ? "111.222.333-44" : null,
    spouse_phone: client.id === "CL-2201" ? "(63) 99999-0000" : null,
    created_at: "2026-07-01T09:00:00Z"
  }));

  const properties = seedProperties.map((property) => ({
    id: property.id,
    company_id: demoCompanyId,
    client_id: clientIdByName[property.cliente],
    client_name: property.cliente,
    name: property.nome,
    municipality: property.municipio,
    state: property.estado,
    declared_area: property.areaDeclarada,
    measured_area: property.areaMedida,
    registry_number: property.matricula,
    car: property.car,
    ccir: property.ccir,
    sigef: property.sigef,
    documental_status: property.situacaoDocumental,
    environmental_status: property.situacaoAmbiental,
    tax_status: property.situacaoTributaria,
    latitude: property.latitude,
    longitude: property.longitude,
    created_at: "2026-07-01T09:10:00Z"
  }));

  const services = seedServices.map((service) => ({
    id: service.id,
    company_id: demoCompanyId,
    client_id: clientIdByName[service.cliente],
    property_id: propertyIdByName[service.imovel],
    client_name: service.cliente,
    property_name: service.imovel,
    service_type: service.tipo,
    responsible_name: service.responsavel,
    status: service.status,
    priority: service.prioridade,
    start_date: service.inicio,
    expected_end_date: service.previsao,
    contracted_value: service.valor,
    checklist_preview: service.checklist.join(", "),
    created_at: "2026-07-01T09:20:00Z"
  }));

  const documentLibrary = [
    "Matricula atualizada",
    "CAR/recibo",
    "CCIR/SNCR",
    "ITR/DITR",
    "CIB/NIRF",
    "Memorial descritivo",
    "Planta georreferenciada",
    "ART/RRT",
    "Documento pessoal",
    "Comprovante de posse",
    "Declaracao de confrontantes",
    "Certidao cartorial"
  ].map((name, index) => ({
    id: `DL-${index + 1}`,
    company_id: demoCompanyId,
    process_type: index < 7 ? "Georreferenciamento" : "Regularizacao fundiaria",
    document_name: name,
    description: `Documento padrao para ${name}.`,
    required: index < 10,
    provided_by: index % 3 === 0 ? "empresa" : "cliente",
    validity_days: index % 2 === 0 ? 90 : null,
    checklist_order: index + 1,
    visible_on_portal: true,
    active: true
  }));

  return {
    companies: [
      {
        id: platformCompanyId,
        company_code: "3272026",
        name: "Nex Rural Plataforma",
        trade_name: "Nex Rural",
        cnpj: "00.000.000/0001-00",
        email: "joaomarcosgpp@hotmail.com",
        phone: "(99) 99999-0000",
        city: "Imperatriz",
        state: "MA",
        status: "Ativa",
        plan: "Global",
        responsible_name: "Joao Marcos Gomes Pereira",
        created_at: "2026-07-01T07:50:00Z"
      },
      {
        id: demoCompanyId,
        company_code: "3272026",
        name: "Nex Rural Piloto",
        trade_name: "Nex Rural",
        cnpj: "32.720.260/0001-27",
        email: "admin327@nexrural.local",
        phone: "(99) 99111-2026",
        city: "Imperatriz",
        state: "MA",
        status: "Ativa",
        plan: "Pilot Premium",
        responsible_name: "Admin Empresa 327",
        created_at: "2026-07-01T08:00:00Z"
      },
      {
        id: demoSecondCompanyId,
        company_code: "3282026",
        name: "Agro Norte Regularizacoes",
        trade_name: "Agro Norte",
        cnpj: "32.820.260/0001-28",
        email: "admin328@nexrural.local",
        phone: "(99) 99222-2026",
        city: "Acailandia",
        state: "MA",
        status: "Ativa",
        plan: "Premium",
        responsible_name: "Admin Empresa 328",
        created_at: "2026-07-01T08:15:00Z"
      }
    ],
    company_units: [
      { id: "UNIT-1", company_id: demoCompanyId, name: "Unidade Matriz", city: "Imperatriz", state: "MA" },
      { id: "UNIT-2", company_id: demoSecondCompanyId, name: "Unidade Acailandia", city: "Acailandia", state: "MA" }
    ],
    user_profiles: demoProfiles.map((profile) => ({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      company_id: profile.company_id,
      company_code: profile.company_code ?? (profile.company_id === demoSecondCompanyId ? "3282026" : profile.company_id === demoCompanyId ? "3272026" : null),
      client_id: profile.client_id ?? null,
      client_name: profile.client_name ?? null,
      department: profile.role === "cliente" ? "Portal do cliente" : profile.role === "admin_master_global" ? "Administracao global" : "Operacao rural",
      status: profile.active ? "Ativo" : "Bloqueado",
      phone: profile.role === "cliente" ? "(99) 99931-0001" : "(99) 99900-2026",
      active: profile.active,
      last_login_at: profile.role === "admin_master_global" ? "2026-07-04T08:10:00Z" : null
    })),
    staff_profiles: [
      { id: "STAFF-001", company_id: demoCompanyId, full_name: "Tecnico Responsavel", normalized_name: "tecnico responsavel", cpf: "000.000.000-00", normalized_cpf: "00000000000", role: "tecnico", department: "Geo", phone: "(99) 99900-2026", status: "Ativo", active: true },
      { id: "STAFF-002", company_id: demoCompanyId, full_name: "Maria Atendimento Rural", normalized_name: "maria atendimento rural", cpf: "111.111.111-11", normalized_cpf: "11111111111", role: "atendente", department: "Atendimento", phone: "(99) 99900-1111", status: "Ativo", active: true }
    ],
    roles: roleOptions.flatMap((role) => [
      { id: `ROLE-${role}-327`, company_id: demoCompanyId, name: roleLabels[role], slug: role, system_role: true },
      { id: `ROLE-${role}-328`, company_id: demoSecondCompanyId, name: roleLabels[role], slug: role, system_role: true }
    ]),
    permissions: [
      { id: "PERM-1", code: "settings.manage", description: "Gerenciar configuracoes criticas" },
      { id: "PERM-2", code: "documents.approve", description: "Aprovar documentos" },
      { id: "PERM-3", code: "portal.release", description: "Liberar itens no portal" },
      { id: "PERM-4", code: "finance.manage", description: "Gerenciar financeiro" },
      { id: "PERM-5", code: "geo.manage", description: "Alterar geoprocessamento" }
    ],
    user_permissions: [],
    client_portal_access: [{ id: "CPA-1", company_id: demoCompanyId, client_id: "CL-2201", user_id: "00000000-0000-4000-8000-000000000104", active: true }],
    leads: seedLeads.map((lead) => ({
      id: lead.id,
      company_id: demoCompanyId,
      name: lead.nome,
      phone: lead.telefone,
      city: lead.cidade,
      interest_type: lead.interesse,
      origin: lead.origem,
      status: lead.status,
      priority: lead.prioridade,
      estimated_value: lead.valor,
      next_contact: lead.proximoContato
    })),
    clients,
    rural_properties: properties,
    services,
    service_checklists: services.flatMap((service) =>
      text(service.checklist_preview)
        .split(", ")
        .map((title, index) => ({
          id: `${service.id}-CHK-${index + 1}`,
          company_id: demoCompanyId,
          service_id: service.id,
          title,
          status: index < 2 ? "Concluido" : "Pendente"
        }))
    ),
    protocols: seedProtocols.map((protocol) => ({
      id: protocol.id,
      company_id: demoCompanyId,
      client_id: clientIdByName[protocol.cliente],
      property_id: propertyIdByName[protocol.imovel],
      agency: protocol.orgao,
      protocol_number: protocol.numero,
      status: protocol.status,
      expected_deadline: protocol.prazo,
      responsible_name: protocol.responsavel
    })),
    pending_items: seedPendencies.map((item) => ({
      id: item.id,
      company_id: demoCompanyId,
      client_id: clientIdByName[item.cliente],
      property_id: propertyIdByName[item.imovel],
      title: item.titulo,
      category: item.categoria,
      due_date: item.prazo,
      priority: item.prioridade,
      status: item.status,
      responsible_name: item.responsavel,
      visible_on_portal: item.portal
    })),
    documents: [
      {
        id: "DOC-01",
        company_id: demoCompanyId,
        client_id: "CL-2201",
        property_id: "IM-3101",
        service_id: "SV-4101",
        name: "Matricula atualizada.pdf",
        original_name: "Matricula atualizada.pdf",
        mime_type: "application/pdf",
        extension: "pdf",
        size: 180000,
        category: "Matricula",
        storage_path: "demo/matricula.pdf",
        version: 1,
        status: "Aprovado",
        visible_on_portal: true,
        uploaded_by_name: "Camila Rocha"
      }
    ],
    geo_files: seedGeoFiles.map((file) => ({
      id: file.id,
      company_id: demoCompanyId,
      property_id: propertyIdByName[file.imovel],
      service_id: serviceIdByType[file.servico],
      name: file.nome,
      file_type: file.tipo,
      category: file.categoria,
      status: file.status,
      visible_on_portal: file.portal,
      notes: file.observacoes,
      created_at: file.dataEnvio
    })),
    property_vertices: seedPropertyVertices.map((vertex) => ({
      id: vertex.id,
      company_id: demoCompanyId,
      property_id: propertyIdByName[vertex.imovel],
      property_name: vertex.imovel,
      code: vertex.codigo,
      sequence: vertex.sequencia,
      latitude: vertex.latitude,
      longitude: vertex.longitude,
      utm_e: vertex.utmE,
      utm_n: vertex.utmN,
      zone: vertex.fuso,
      datum: vertex.datum,
      altitude: vertex.altitude,
      marker_type: vertex.tipoMarco,
      boundary_type: vertex.tipoLimite,
      neighbor_name: vertex.confrontante,
      notes: vertex.observacoes
    })),
    property_neighbors: seedNeighbors.map((neighbor) => ({
      id: neighbor.id,
      company_id: demoCompanyId,
      property_id: propertyIdByName[neighbor.imovel],
      name: neighbor.nome,
      document: neighbor.documento,
      property_name: neighbor.imovelConfrontante,
      phone: neighbor.telefone,
      email: neighbor.email,
      consent_status: neighbor.anuencia,
      boundary_section: neighbor.trecho,
      responsible_name: neighbor.responsavel
    })),
    field_equipment: seedEquipment.map((item) => ({
      id: item.id,
      company_id: demoCompanyId,
      name: item.nome,
      equipment_type: item.tipo,
      brand: item.marca,
      model: item.modelo,
      serial_number: item.serie,
      asset_tag: item.patrimonio,
      condition: item.conservacao,
      responsible_name: item.responsavel,
      unit: item.unidade,
      status: item.status,
      next_maintenance: item.proximaManutencao,
      last_calibration: item.ultimaCalibracao
    })),
    equipment_movements: [],
    inspections: [],
    registry_records: seedRegistryRecords.map((row) => ({
      id: row.id,
      company_id: demoCompanyId,
      client_name: row.cliente,
      property_name: row.imovel,
      registry_office: row.cartorio,
      municipality: row.municipio,
      registry_number: row.matricula,
      requested_act: row.ato,
      protocol_number: row.protocolo,
      prenotation_number: row.prenotacao,
      prenotation_deadline: row.prazoPrenotacao,
      fees: row.emolumentos,
      status: row.status,
      responsible_name: row.responsavel
    })),
    registry_requirements: seedRegistryRequirements.map((row) => ({
      id: row.id,
      company_id: demoCompanyId,
      registry_record_id: row.registro,
      requirement_type: row.tipo,
      description: row.descricao,
      issued_at: row.emissao,
      due_date: row.prazo,
      responsible_name: row.responsavel,
      status: row.status,
      documents: row.documentos
    })),
    property_certificates: seedCertificates.map((row) => ({
      id: row.id,
      company_id: demoCompanyId,
      client_id: clientIdByName[row.cliente],
      property_id: propertyIdByName[row.imovel],
      certificate_type: row.tipo,
      agency: row.orgao,
      municipality: row.municipio,
      state: row.estado,
      requested_at: row.solicitacao,
      issued_at: row.emissao,
      expires_at: row.validade,
      status: row.status,
      cost: row.custo,
      responsible_name: row.responsavel,
      visible_on_portal: row.portal
    })),
    official_checks: seedOfficialChecks.map((row) => ({
      id: row.id,
      company_id: demoCompanyId,
      property_name: row.imovel,
      check_type: row.tipo,
      platform: row.plataforma,
      checked_at: row.data,
      responsible_name: row.responsavel,
      result: row.resultado,
      divergences: row.divergencia,
      status: row.status
    })),
    document_library_items: documentLibrary,
    checklist_templates: checklistTemplateSeedDefinitions.map((definition) => ({
      id: `TPL-CHK-${definition.key}`,
      company_id: demoCompanyId,
      name: definition.name,
      description: `${definition.name} com documentos operacionais editáveis para empresas rurais/cartoriais.`,
      category: definition.category,
      service_type: definition.service,
      procedure_type: definition.service,
      target_entity: "Serviço",
      source_notice: "Modelo operacional editável. Revise conforme cartório, órgão, município, UF e situação do imóvel.",
      is_global_default: true,
      is_editable: true,
      active: true
    })),
    checklist_template_items: checklistTemplateSeedDefinitions.flatMap((definition) =>
      definition.items.map((name, index) => ({
        id: `TPL-CHK-${definition.key}-${index + 1}`,
        company_id: demoCompanyId,
        template_id: `TPL-CHK-${definition.key}`,
        document_name: name,
        description: `${name} para instrução do procedimento ${definition.service}.`,
        required: index < 5,
        who_provides: /planta|memorial|ART|levantamento|arquivo técnico|SIGEF/i.test(name) ? "Técnico" : /requerimento|certidões|histórico|pendências/i.test(name) ? "Empresa" : "Cliente",
        requires_spouse: /cônjuge|conjuge/i.test(name),
        requires_property: /imóvel|imovel|matrícula|matricula|CAR|CCIR|ITR|CIB|área|area|planta|memorial/i.test(name),
        requires_geo_file: /planta|memorial|arquivo técnico|SIGEF|levantamento/i.test(name),
        visible_to_client: !/histórico|pendências|levantamento/i.test(name),
        portal_instruction: `Envie ou confirme: ${name}.`,
        internal_instruction: `Conferir ${name} antes de protocolar o procedimento ${definition.service}.`,
        source_name: "Modelo operacional editável",
        sort_order: index + 1,
        active: true
      }))
    ),
    generated_checklists: [],
    generated_checklist_items: [],
    checklist_item_documents: [],
    checklist_sources: [],
    document_templates: documentTemplateSeeds.map((template, index) => ({
      id: `DOC-TPL-${index + 1}`,
      company_id: demoCompanyId,
      ...template,
      file_type: null,
      is_fillable: false,
      source_type: "Modelo de exemplo — edite antes de usar",
      variable_map: {},
      version: "1.0",
      active: true,
      created_at: "2026-07-01T10:00:00Z",
      updated_at: "2026-07-01T10:00:00Z"
    })),
    generated_documents: [],
    template_variables: [],
    tags: [
      { id: "TAG-1", company_id: demoCompanyId, name: "Produtor rural", color: "Verde", category: "Cliente", active: true },
      { id: "TAG-2", company_id: demoCompanyId, name: "Aguardando documento", color: "Dourado", category: "Documento", active: true },
      { id: "TAG-3", company_id: demoCompanyId, name: "Geo pendente", color: "Roxo", category: "Geo", active: true }
    ],
    client_tags: [{ id: "CT-1", company_id: demoCompanyId, client_id: "CL-2201", tag_id: "TAG-1" }],
    client_spouses: [{ id: "SP-1", company_id: demoCompanyId, client_id: "CL-2201", full_name: "Maria Ferreira", cpf: "11122233344", phone: "(63) 99999-0000", marriage_regime: "Comunhao parcial", active: true }],
    client_exports: [],
    official_templates: [
      "requerimento ITERMA",
      "declaracao de posse",
      "declaracao de confrontantes",
      "checklist documental ITERMA",
      "autorizacao para protocolo",
      "procuracao",
      "proposta comercial",
      "contrato de prestacao de servicos",
      "contrato de georreferenciamento",
      "contrato de arrendamento rural",
      "contrato de parceria rural",
      "contrato de compra e venda rural",
      "termo de responsabilidade",
      "termo de ciencia",
      "termo de entrega",
      "declaracao de pendencias",
      "relatorio de conclusao"
    ].map((name, index) => ({
      id: `TPL-${index + 1}`,
      company_id: demoCompanyId,
      name,
      category: index < 6 ? "ITERMA" : index < 12 ? "Contratos rurais" : "Regularizacao fundiaria",
      body: `Modelo ${name} para {{cliente_nome}}, imovel {{imovel_nome}}, servico {{servico_tipo}} em {{data_atual}}.`,
      variables: ["{{empresa_nome}}", "{{cliente_nome}}", "{{imovel_nome}}", "{{servico_tipo}}", "{{data_atual}}"],
      active: true
    })),
    commercial_templates: seedCommercialTemplates.map((row) => ({
      id: row.id,
      company_id: demoCompanyId,
      name: row.nome,
      template_type: row.tipo,
      variables: row.variaveis,
      status: row.status,
      updated_at: row.ultimaAtualizacao
    })),
    generated_commercial_documents: [],
    due_diligence_cases: seedDueDiligenceCases.map((row) => ({
      id: row.id,
      company_id: demoCompanyId,
      client_name: row.cliente,
      property_name: row.imovel,
      owner_name: row.proprietario,
      purpose: row.finalidade,
      technician_name: row.tecnico,
      legal_responsible_name: row.juridico,
      start_date: row.inicio,
      expected_end_date: row.previsao,
      status: row.status,
      general_risk: row.risco,
      conclusion: row.conclusao,
      recommendations: row.recomendacoes
    })),
    due_diligence_risks: seedDueDiligenceChecklist.map((row, index) => ({
      id: `DDR-${index + 1}`,
      company_id: demoCompanyId,
      case_id: row.caso,
      title: row.item,
      category: row.grupo,
      description: row.item,
      impact: row.risco === "Alto" ? 4 : row.risco === "Medio" ? 2 : 1,
      probability: row.status === "Pendente" ? 4 : 2,
      severity: row.risco,
      recommendation: row.recomendacao,
      responsible_name: row.responsavel,
      status: row.status
    })),
    ownership_chain: seedOwnershipChain.map((row, index) => ({ id: `OC-${index + 1}`, company_id: demoCompanyId, ...row })),
    financial_entries: seedFinancialEntries.map((row) => ({
      id: row.id,
      company_id: demoCompanyId,
      client_name: row.cliente,
      service_name: row.servico,
      entry_type: row.tipo,
      category: row.categoria,
      amount: row.valor,
      due_date: row.vencimento,
      status: row.status,
      visible_on_portal: row.tipo === "Receita"
    })),
    aged_producer_registrations: clients.slice(0, 2).map((client, index) => ({
      id: `AGED-P-${index + 1}`,
      company_id: demoCompanyId,
      client_id: client.id,
      client_name: client.name,
      cpf_cnpj: client.document,
      state_registration: index === 0 ? "MA-129002" : "MA-998812",
      phone: client.phone,
      email: client.email,
      sigama_email: client.email,
      regional_office: "Imperatriz",
      status: index === 0 ? "Ativo" : "Atualizacao pendente",
      last_update: "2026-06-01",
      next_update: "2026-12-01"
    })),
    aged_property_registrations: properties.slice(0, 2).map((property, index) => ({
      id: `AGED-I-${index + 1}`,
      company_id: demoCompanyId,
      client_id: property.client_id,
      property_id: property.id,
      property_name: property.name,
      municipality: property.municipality,
      status: index === 0 ? "Ativo" : "Pendente",
      last_update: "2026-06-12",
      next_update: "2026-12-12"
    })),
    aged_livestock_exploitations: [
      { id: "AGED-E-1", company_id: demoCompanyId, property_id: "IM-3101", species: "bovinos", quantity: 180, status: "Ativo" },
      { id: "AGED-E-2", company_id: demoCompanyId, property_id: "IM-3101", species: "equideos", quantity: 12, status: "Ativo" }
    ],
    aged_gta_records: [],
    iterma_cases: [
      {
        id: "ITERMA-1",
        company_id: demoCompanyId,
        client_id: "CL-2202",
        property_id: "IM-3102",
        beneficiary_type: "posseiro",
        requested_area: 96.2,
        occupation_time: "14 anos",
        rural_activity: "Pecuaria leiteira",
        process_number: "ITERMA-2026-00041",
        status: "Analise",
        current_stage: "Documentos pessoais",
        responsible_name: "Camila Rocha"
      }
    ],
    rural_contracts: [],
    car_records: [],
    ccir_records: [],
    itr_records: [],
    sigef_records: [],
    cib_nirf_records: [],
    technical_area_comparisons: [
      {
        id: "TAC-1",
        company_id: demoCompanyId,
        property_id: "IM-3101",
        property_name: "Fazenda Santa Luzia",
        declared_area: 128.4,
        measured_area: 129.72,
        registry_area: 127.9,
        car_area: 128.1,
        difference_area: 1.32,
        difference_percent: 1.03,
        tolerance_percent: 5,
        status: "Dentro da tolerancia",
        recommended_action: "Registrar memoria de calculo no dossie tecnico.",
        checked_at: "2026-07-02T10:00:00Z"
      },
      {
        id: "TAC-2",
        company_id: demoCompanyId,
        property_id: "IM-3102",
        property_name: "Sitio Boa Esperanca",
        declared_area: 96.2,
        measured_area: 101.8,
        registry_area: 96.2,
        car_area: 94.7,
        difference_area: 5.6,
        difference_percent: 5.82,
        tolerance_percent: 5,
        status: "Exige conferencia",
        recommended_action: "Abrir pendencia tecnica e revisar confrontantes.",
        checked_at: "2026-07-02T14:30:00Z"
      }
    ],
    reports: [
      {
        id: "RPT-1",
        company_id: demoCompanyId,
        report_type: "Dossie tecnico georreferenciado",
        title: "Dossie tecnico - Fazenda Santa Luzia",
        property_id: "IM-3101",
        client_id: "CL-2201",
        status: "Gerado",
        generated_by_name: "Camila Rocha",
        generated_at: "2026-07-03T09:00:00Z"
      }
    ],
    report_exports: [
      {
        id: "RPT-EXP-1",
        company_id: demoCompanyId,
        report_id: "RPT-1",
        export_type: "PDF",
        file_name: "dossie-tecnico-fazenda-santa-luzia.pdf",
        status: "Disponivel",
        created_at: "2026-07-03T09:01:00Z"
      }
    ],
    audit_logs: [...seedAuditLogs, ...ruralCalendarAlerts.map((item) => `${item.tipo}: ${item.titulo}`)].map((action, index) => ({
      id: `AUD-${index + 1}`,
      company_id: demoCompanyId,
      user_role: "admin_master_global",
      action,
      entity: "demo",
      created_at: new Date(Date.now() - index * 3600000).toISOString()
    }))
  };
}

function scopeRowsForProfile(table: string, sourceRows: AnyRow[], profile: AuthProfile) {
  if (profile.role === "admin_master_global") return sourceRows;
  if (table === "permissions") return sourceRows;
  if (table === "companies") return sourceRows.filter((row) => row.id === profile.company_id);
  if (profile.role === "cliente") {
    return sourceRows.filter((row) => {
      if (table === "clients") return row.id === profile.client_id;
      const ownClient = !profile.client_id || row.client_id === profile.client_id || row.client_name === profile.client_name;
      const portalVisible = row.visible_on_portal === true || row.portal_enabled === true || row.uploaded_by === profile.id || table === "rural_properties" || table === "services";
      return ownClient && portalVisible;
    });
  }
  return sourceRows.filter((row) => !("company_id" in row) || row.company_id === profile.company_id);
}

const field = (name: string, label: string, config: Omit<FieldConfig, "name" | "label"> = {}): FieldConfig => ({ name, label, ...config });

const moduleConfigs: ModuleConfig[] = [
  {
    id: "empresas",
    label: "Empresas",
    table: "companies",
    icon: Home,
    description: "Cadastro multiempresa com codigo, plano, status e bloqueio operacional.",
    roles: globalRoles,
    columns: ["company_code", "name", "trade_name", "cnpj", "status", "plan", "city", "state", "responsible_name"],
    rowActions: ["block-company", "unblock-company", "generate-pdf"],
    fields: [
      field("company_code", "Codigo da empresa"),
      field("name", "Razao social / nome", { required: true }),
      field("trade_name", "Nome fantasia"),
      field("cnpj", "CNPJ"),
      field("email", "E-mail", { type: "email" }),
      field("phone", "Telefone"),
      field("address", "Endereco"),
      field("city", "Cidade"),
      field("state", "UF"),
      field("responsible_name", "Responsavel"),
      field("plan", "Plano", { type: "select", options: ["Starter", "Pilot Premium", "Premium", "Global"] }),
      field("status", "Status", { type: "select", options: ["Ativa", "Suspensa", "Bloqueada", "Cancelada"] }),
      field("blocked_reason", "Motivo do bloqueio", { type: "textarea" }),
      field("notes", "Observacoes", { type: "textarea" })
    ]
  },
  {
    id: "usuarios",
    label: "Usuarios",
    table: "user_profiles",
    icon: Users,
    description: "Usuarios por empresa, papel de acesso, matricula empresarial e bloqueio.",
    roles: companyAdminRoles,
    columns: ["full_name", "email", "role", "company_code", "department", "phone", "status", "active", "last_login_at"],
    rowActions: ["make-company-admin", "remove-company-admin", "block-user", "unblock-user"],
    fields: [
      field("full_name", "Nome completo", { required: true }),
      field("email", "E-mail", { type: "email", required: true }),
      field("company_id", "ID da empresa", { required: true }),
      field("company_code", "Matricula/codigo da empresa"),
      field("role", "Perfil", { type: "select", options: roleOptions }),
      field("department", "Departamento"),
      field("phone", "Telefone"),
      field("client_id", "ID do cliente vinculado"),
      field("status", "Status", { type: "select", options: ["Ativo", "Bloqueado", "Convite pendente"] }),
      field("active", "Ativo", { type: "checkbox" })
    ]
  },

  {
    id: "funcionarios",
    label: "Funcionários",
    table: "staff_profiles",
    icon: Users,
    description: "Funcionários sem e-mail/senha, com acesso por nome completo e CPF conforme função.",
    roles: companyAdminRoles,
    columns: ["full_name", "cpf", "role", "department", "phone", "status", "active"],
    fields: [
      field("full_name", "Nome completo", { required: true }),
      field("cpf", "CPF", { required: true }),
      field("company_id", "Empresa", { required: true }),
      field("role", "Função", { type: "select", options: ["gestor", "tecnico", "topografo", "agrimensor", "administrativo", "financeiro", "atendente", "analista_documental", "cartorio", "geo"] }),
      field("department", "Setor"),
      field("phone", "Telefone"),
      field("email", "E-mail opcional", { type: "email" }),
      field("status", "Status", { type: "select", options: ["Ativo", "Inativo", "Bloqueado"] }),
      field("active", "Ativo", { type: "checkbox" })
    ]
  },
  {
    id: "crm",
    label: "CRM",
    table: "leads",
    icon: MessageSquare,
    description: "Leads, triagem comercial e conversao em cliente real.",
    roles: allInternalRoles,
    columns: ["name", "phone", "city", "interest_type", "status", "priority", "estimated_value", "next_contact"],
    rowActions: ["convert-lead"],
    fields: [
      field("name", "Nome", { required: true }),
      field("phone", "Telefone", { type: "tel" }),
      field("email", "E-mail", { type: "email" }),
      field("city", "Cidade"),
      field("state", "UF"),
      field("interest_type", "Interesse", { required: true }),
      field("origin", "Origem"),
      field("status", "Status", { type: "select", options: ["Novo lead", "Triagem", "Documentos solicitados", "Proposta enviada", "Contrato fechado"] }),
      field("priority", "Prioridade", { type: "select", options: ["Baixa", "Media", "Alta", "Critica"] }),
      field("estimated_value", "Valor estimado", { type: "money" }),
      field("next_contact", "Proximo contato", { type: "date" }),
      field("notes", "Observacoes", { type: "textarea" })
    ]
  },
  {
    id: "clientes",
    label: "Clientes",
    table: "clients",
    icon: Users,
    description: "Cadastro real de clientes vinculados a empresa.",
    roles: allInternalRoles,
    columns: ["photo_url", "name", "document", "phone", "whatsapp", "city", "state", "tags_summary", "portal_enabled", "status"],
    rowActions: ["upload-client-photo", "create-client-checklist", "generate-client-sheet", "generate-client-dossier", "generate-client-dossier-spouse", "generate-client-dossier-excel", "export-client-contacts", "release-portal", "hide-portal", "generate-pdf"],
    fields: [
      field("name", "Nome completo / razao social", { required: true }),
      field("full_name", "Nome completo para portal"),
      field("type", "Tipo", { type: "select", options: ["Pessoa fisica", "Pessoa juridica", "Produtor rural", "Empresa rural"] }),
      field("document", "CPF/CNPJ"),
      field("cpf_cnpj", "CPF/CNPJ para portal"),
      field("phone", "Telefone"),
      field("whatsapp", "WhatsApp"),
      field("email", "E-mail", { type: "email" }),
      field("address", "Endereco"),
      field("city", "Cidade"),
      field("state", "UF"),
      field("marital_status", "Estado civil", { type: "select", options: ["Solteiro(a)", "Casado(a)", "Uniao estavel", "Divorciado(a)", "Viuvo(a)"] }),
      field("marriage_regime", "Regime de casamento"),
      field("has_spouse", "Possui conjuge", { type: "checkbox" }),
      field("spouse_full_name", "Conjuge - nome completo"),
      field("spouse_cpf", "Conjuge - CPF"),
      field("spouse_rg", "Conjuge - RG"),
      field("spouse_issuing_agency", "Conjuge - orgao emissor"),
      field("spouse_birth_date", "Conjuge - data de nascimento", { type: "date" }),
      field("spouse_nationality", "Conjuge - nacionalidade"),
      field("spouse_profession", "Conjuge - profissao"),
      field("spouse_phone", "Conjuge - telefone"),
      field("spouse_whatsapp", "Conjuge - WhatsApp"),
      field("spouse_email", "Conjuge - e-mail", { type: "email" }),
      field("spouse_address", "Conjuge - endereco se diferente", { type: "textarea" }),
      field("spouse_notes", "Conjuge - observacoes", { type: "textarea" }),
      field("tags_summary", "Tags separadas por virgula"),
      field("status", "Status", { type: "select", options: ["Ativo", "Com pendencia", "Inativo"] }),
      field("portal_enabled", "Portal liberado", { type: "checkbox" }),
      field("active", "Ativo", { type: "checkbox" }),
      field("notes_public", "Observacoes publicas", { type: "textarea" }),
      field("notes_private", "Observacoes internas", { type: "textarea" }),
      field("notes", "Observacoes", { type: "textarea" })
    ]
  },
  {
    id: "imoveis",
    label: "Imoveis",
    table: "rural_properties",
    icon: Map,
    description: "Imoveis rurais, situacao documental, ambiental e cartorial.",
    roles: allInternalRoles,
    columns: ["name", "client_id", "municipality", "state", "measured_area", "registry_number", "car", "ccir", "documental_status"],
    fields: [
      field("client_id", "ID do cliente", { required: true }),
      field("name", "Nome do imovel", { required: true }),
      field("property_type", "Tipo"),
      field("municipality", "Municipio", { required: true }),
      field("state", "UF", { required: true }),
      field("rural_address", "Endereco rural"),
      field("declared_area", "Area declarada", { type: "number" }),
      field("measured_area", "Area medida", { type: "number" }),
      field("registered_area", "Area matriculada", { type: "number" }),
      field("registry_number", "Matricula"),
      field("registry_office", "Cartorio"),
      field("car", "CAR"),
      field("ccir", "CCIR"),
      field("itr", "ITR"),
      field("cib", "CIB"),
      field("nirf", "NIRF"),
      field("sigef", "SIGEF"),
      field("latitude", "Latitude"),
      field("longitude", "Longitude"),
      field("documental_status", "Situacao documental"),
      field("environmental_status", "Situacao ambiental"),
      field("tax_status", "Situacao tributaria")
    ]
  },
  {
    id: "servicos",
    label: "Servicos",
    table: "services",
    icon: ClipboardCheck,
    description: "Servicos operacionais com checklist gerado pela biblioteca documental.",
    roles: allInternalRoles,
    columns: ["service_type", "client_id", "property_id", "status", "priority", "expected_end_date", "contracted_value"],
    rowActions: ["create-checklist", "generate-contract"],
    fields: [
      field("client_id", "ID do cliente", { required: true }),
      field("property_id", "ID do imovel"),
      field("service_type", "Tipo de servico", { required: true }),
      field("status", "Status", { type: "select", options: ["Novo", "Aguardando documentos", "Em levantamento tecnico", "Protocolado", "Concluido", "Entregue ao cliente", "Cancelado"] }),
      field("priority", "Prioridade", { type: "select", options: ["Baixa", "Media", "Alta", "Critica"] }),
      field("start_date", "Inicio", { type: "date" }),
      field("expected_end_date", "Previsao", { type: "date" }),
      field("contracted_value", "Valor contratado", { type: "money" }),
      field("payment_method", "Forma de pagamento"),
      field("notes", "Observacoes", { type: "textarea" })
    ]
  },
  {
    id: "checklists",
    label: "Checklists",
    table: "service_checklists",
    icon: ListChecks,
    description: "Itens documentais por servico.",
    roles: allInternalRoles,
    columns: ["service_id", "title", "status", "completed_at"],
    fields: [
      field("service_id", "ID do servico", { required: true }),
      field("title", "Item", { required: true }),
      field("status", "Status", { type: "select", options: ["Pendente", "Recebido", "Em analise", "Aprovado", "Reprovado"] }),
      field("completed_at", "Concluido em", { type: "date" })
    ]
  },
  {
    id: "protocolos",
    label: "Protocolos",
    table: "protocols",
    icon: Landmark,
    description: "Protocolos cartoriais, AGED, ITERMA e orgaos oficiais.",
    roles: allInternalRoles,
    columns: ["agency", "protocol_number", "client_id", "property_id", "status", "expected_deadline", "external_link"],
    rowActions: ["generate-pdf"],
    fields: [
      field("client_id", "ID do cliente"),
      field("property_id", "ID do imovel"),
      field("service_id", "ID do servico"),
      field("agency", "Orgao / serventia", { required: true }),
      field("protocol_number", "Numero do protocolo"),
      field("protocol_date", "Data do protocolo", { type: "date" }),
      field("status", "Status", { type: "select", options: ["Protocolado", "Em analise", "Exigencia", "Deferido", "Indeferido", "Arquivado"] }),
      field("expected_deadline", "Prazo", { type: "date" }),
      field("external_link", "Link externo"),
      field("notes", "Observacoes", { type: "textarea" })
    ]
  },
  {
    id: "pendencias",
    label: "Pendencias",
    table: "pending_items",
    icon: AlertTriangle,
    description: "Pendencias internas ou liberadas no portal.",
    roles: allInternalRoles,
    columns: ["title", "category", "client_id", "property_id", "due_date", "priority", "status", "visible_on_portal"],
    rowActions: ["release-portal", "hide-portal"],
    fields: [
      field("client_id", "ID do cliente"),
      field("property_id", "ID do imovel"),
      field("service_id", "ID do servico"),
      field("title", "Titulo", { required: true }),
      field("description", "Descricao", { type: "textarea" }),
      field("category", "Categoria", { required: true }),
      field("due_date", "Prazo", { type: "date" }),
      field("priority", "Prioridade", { type: "select", options: ["Baixa", "Media", "Alta", "Critica"] }),
      field("status", "Status", { type: "select", options: ["Aberta", "Aguardando cliente", "Em andamento", "Resolvida", "Atrasada"] }),
      field("visible_on_portal", "Visivel no portal", { type: "checkbox" })
    ]
  },
  {
    id: "biblioteca",
    label: "Biblioteca",
    table: "document_library_items",
    icon: FileStack,
    description: "Padronizacao documental por tipo de processo.",
    roles: allInternalRoles,
    columns: ["process_type", "document_name", "required", "provided_by", "validity_days", "visible_on_portal", "active"],
    fields: [
      field("process_type", "Tipo de processo", { required: true }),
      field("document_name", "Documento", { required: true }),
      field("description", "Descricao", { type: "textarea" }),
      field("required", "Obrigatorio", { type: "checkbox" }),
      field("provided_by", "Quem fornece", { type: "select", options: ["cliente", "tecnico", "cartorio", "orgao publico", "empresa"] }),
      field("validity_days", "Validade em dias", { type: "number" }),
      field("checklist_order", "Ordem", { type: "number" }),
      field("visible_on_portal", "Visivel no portal", { type: "checkbox" }),
      field("active", "Ativo", { type: "checkbox" })
    ]
  },
  {
    id: "modelos-checklist",
    label: "Modelos de Checklists",
    table: "checklist_templates",
    icon: ListChecks,
    description: "Modelos editaveis de documentos exigidos por ato cartorial, rural, fiscal, ambiental e geotecnico.",
    roles: allInternalRoles,
    columns: ["name", "category", "procedure_type", "service_type", "active", "is_global_default", "updated_at"],
    rowActions: ["duplicate-checklist-template", "generate-pdf"],
    fields: [
      field("name", "Nome do modelo", { required: true }),
      field("description", "Descricao", { type: "textarea" }),
      field("category", "Categoria", { type: "select", options: ["Cartorio", "Rural", "Geo", "Ambiental", "Fiscal", "AGED", "ITERMA", "INCRA", "Cliente", "Dossie"] }),
      field("service_type", "Tipo de servico relacionado"),
      field("procedure_type", "Procedimento / ato"),
      field("target_entity", "Entidade alvo", { type: "select", options: ["Cliente", "Imovel", "Servico", "Protocolo", "Dossie"] }),
      field("is_global_default", "Modelo padrao", { type: "checkbox" }),
      field("is_editable", "Editavel", { type: "checkbox" }),
      field("active", "Ativo", { type: "checkbox" }),
      field("source_notice", "Aviso/fonte", { type: "textarea" })
    ]
  },
  {
    id: "itens-checklist",
    label: "Itens de Checklist",
    table: "checklist_template_items",
    icon: ClipboardCheck,
    description: "Itens/documentos que compoem cada modelo de checklist, com orientacoes para equipe e cliente.",
    roles: allInternalRoles,
    columns: ["document_name", "required", "who_provides", "requires_spouse", "visible_to_client", "active"],
    fields: [
      field("template_id", "ID do modelo", { required: true }),
      field("document_name", "Documento / item", { required: true }),
      field("description", "Descricao", { type: "textarea" }),
      field("required", "Obrigatorio", { type: "checkbox" }),
      field("item_type", "Tipo do item", { type: "select", options: ["Documento", "Declaracao", "Certidao", "Arquivo tecnico", "Assinatura", "Conferencia", "Pagamento"] }),
      field("who_provides", "Quem fornece", { type: "select", options: ["Cliente", "Empresa", "Cartorio", "Tecnico", "Advogado", "Contador", "Orgao publico"] }),
      field("accepted_formats", "Formatos aceitos"),
      field("validity_days", "Validade em dias", { type: "number" }),
      field("requires_signature", "Exige assinatura", { type: "checkbox" }),
      field("requires_notarization", "Exige reconhecimento/autenticacao", { type: "checkbox" }),
      field("requires_original", "Exige original", { type: "checkbox" }),
      field("requires_copy", "Exige copia", { type: "checkbox" }),
      field("requires_spouse", "Exige conjuge", { type: "checkbox" }),
      field("requires_property", "Exige imovel", { type: "checkbox" }),
      field("requires_geo_file", "Exige arquivo geo", { type: "checkbox" }),
      field("visible_to_client", "Visivel ao cliente", { type: "checkbox" }),
      field("portal_instruction", "Instrucao ao cliente", { type: "textarea" }),
      field("internal_instruction", "Instrucao interna", { type: "textarea" }),
      field("source_name", "Fonte / orgao"),
      field("source_url", "Link da fonte"),
      field("source_date", "Data da fonte", { type: "date" }),
      field("sort_order", "Ordem", { type: "number" }),
      field("active", "Ativo", { type: "checkbox" })
    ]
  },
  {
    id: "checklists-gerados",
    label: "Checklists por Cliente",
    table: "generated_checklists",
    icon: ListChecks,
    description: "Checklists gerados para cliente, imovel ou servico com progresso e status operacional.",
    roles: allInternalRoles,
    columns: ["title", "status", "progress_percent", "visible_on_portal", "created_at"],
    rowActions: ["request-checklist-items", "release-portal", "hide-portal", "generate-pdf"],
    fields: [
      field("template_id", "ID do modelo"),
      field("client_id", "ID do cliente", { required: true }),
      field("property_id", "ID do imovel"),
      field("service_id", "ID do servico"),
      field("title", "Titulo", { required: true }),
      field("status", "Status", { type: "select", options: ["Nao iniciado", "Em andamento", "Aguardando cliente", "Em analise", "Concluido", "Cancelado"] }),
      field("progress_percent", "Progresso %", { type: "number" }),
      field("visible_on_portal", "Visivel no portal", { type: "checkbox" })
    ]
  },
  {
    id: "itens-gerados",
    label: "Documentos Solicitados",
    table: "generated_checklist_items",
    icon: FileStack,
    description: "Itens solicitados ao cliente, com status de recebimento, validacao e recusas.",
    roles: allInternalRoles,
    columns: ["document_name", "status", "required", "visible_to_client", "due_date", "rejection_reason"],
    rowActions: ["release-portal", "hide-portal", "approve", "reject", "create-pending"],
    fields: [
      field("generated_checklist_id", "ID do checklist", { required: true }),
      field("template_item_id", "ID do item modelo"),
      field("client_id", "ID do cliente"),
      field("document_name", "Documento", { required: true }),
      field("description", "Descricao", { type: "textarea" }),
      field("required", "Obrigatorio", { type: "checkbox" }),
      field("status", "Status", { type: "select", options: ["Pendente", "Solicitado ao cliente", "Recebido", "Em analise", "Validado", "Recusado", "Nao aplicavel", "Vencido"] }),
      field("responsible_type", "Responsavel", { type: "select", options: ["Cliente", "Empresa", "Cartorio", "Tecnico", "Orgao publico"] }),
      field("due_date", "Prazo", { type: "date" }),
      field("visible_to_client", "Visivel ao cliente", { type: "checkbox" }),
      field("portal_instruction", "Instrucao ao cliente", { type: "textarea" }),
      field("internal_notes", "Notas internas", { type: "textarea" }),
      field("rejection_reason", "Motivo de recusa", { type: "textarea" })
    ]
  },
  {
    id: "tags-clientes",
    label: "Tags de Clientes",
    table: "tags",
    icon: BadgeCheck,
    description: "Tags para segmentar clientes por urgencia, tipo de processo, pendencias e valor comercial.",
    roles: allInternalRoles,
    columns: ["name", "color", "category", "description", "active"],
    fields: [
      field("name", "Nome da tag", { required: true }),
      field("color", "Cor", { type: "select", options: ["Verde", "Dourado", "Azul", "Vermelho", "Cinza", "Roxo"] }),
      field("category", "Categoria", { type: "select", options: ["Cliente", "Financeiro", "Cartorio", "Geo", "Documento", "Comercial"] }),
      field("description", "Descricao", { type: "textarea" }),
      field("active", "Ativa", { type: "checkbox" })
    ]
  },
  {
    id: "vinculos-tags",
    label: "Clientes x Tags",
    table: "client_tags",
    icon: BadgeCheck,
    description: "Vincule tags aos clientes para filtros e exportacoes segmentadas.",
    roles: allInternalRoles,
    columns: ["created_at"],
    fields: [
      field("client_id", "ID do cliente", { required: true }),
      field("tag_id", "ID da tag", { required: true })
    ]
  },
  {
    id: "conjuges",
    label: "Conjuges (interno)",
    table: "client_spouses",
    icon: Users,
    description: "Dados completos do conjuge sem precisar criar um cliente separado.",
    roles: [],
    columns: ["full_name", "client_id", "cpf", "phone", "email", "marriage_regime", "active"],
    rowActions: ["generate-pdf"],
    fields: [
      field("client_id", "ID do cliente", { required: true }),
      field("full_name", "Nome completo do conjuge", { required: true }),
      field("cpf", "CPF"),
      field("rg", "RG"),
      field("issuing_agency", "Orgao emissor"),
      field("birth_date", "Data de nascimento", { type: "date" }),
      field("nationality", "Nacionalidade"),
      field("profession", "Profissao"),
      field("marital_status", "Estado civil"),
      field("marriage_regime", "Regime de casamento"),
      field("marriage_date", "Data do casamento", { type: "date" }),
      field("phone", "Telefone"),
      field("whatsapp", "WhatsApp"),
      field("email", "E-mail", { type: "email" }),
      field("address", "Endereco, se diferente", { type: "textarea" }),
      field("photo_storage_path", "Foto/documento no Storage"),
      field("notes", "Observacoes", { type: "textarea" }),
      field("active", "Ativo", { type: "checkbox" })
    ]
  },
  {
    id: "modelos-declaracoes",
    label: "Modelos de Declaracoes",
    table: "document_templates",
    icon: FileSignature,
    description: "Modelos editaveis com variaveis para declaracoes, requerimentos, termos e procuracoes.",
    roles: adminOperationalRoles,
    columns: ["name", "type", "category", "description", "version", "active"],
    rowActions: ["generate-pdf"],
    fields: [
      field("name", "Nome do modelo", { required: true }),
      field("type", "Tipo"),
      field("category", "Categoria"),
      field("description", "Descricao", { type: "textarea" }),
      field("body", "Conteudo com variaveis", { type: "textarea", required: true }),
      field("variables_text", "Variaveis separadas por virgula"),
      field("version", "Versao"),
      field("active", "Ativo", { type: "checkbox" })
    ]
  },
  {
    id: "conferencias",
    label: "Conferencias",
    table: "official_checks",
    icon: BadgeCheck,
    description: "Registro de consultas manuais em bases oficiais.",
    roles: allInternalRoles,
    columns: ["platform", "check_type", "client_id", "property_id", "checked_at", "valid_until", "result", "status"],
    rowActions: ["approve", "reject"],
    fields: [
      field("client_id", "ID do cliente"),
      field("property_id", "ID do imovel"),
      field("service_id", "ID do servico"),
      field("platform", "Plataforma", { required: true }),
      field("check_type", "Tipo de conferencia"),
      field("query_link", "Link da consulta"),
      field("checked_at", "Data da consulta", { type: "date" }),
      field("valid_until", "Validade", { type: "date" }),
      field("result", "Resultado", { type: "textarea" }),
      field("divergences", "Divergencias", { type: "textarea" }),
      field("status", "Status", { type: "select", options: ["Nao consultado", "Consultado", "Sem divergencia", "Com divergencia", "Aguardando correcao", "Corrigido", "Vencido"] })
    ]
  },
  {
    id: "cartorio",
    label: "Cartorio",
    table: "registry_records",
    icon: Landmark,
    description: "Registro de imoveis, prenotacoes, selos e notas devolutivas.",
    roles: allInternalRoles,
    columns: ["registry_office", "registry_number", "requested_act", "protocol_number", "prenotation_number", "prenotation_deadline", "fees", "status"],
    fields: [
      field("client_id", "ID do cliente"),
      field("property_id", "ID do imovel"),
      field("service_id", "ID do servico"),
      field("county", "Comarca"),
      field("registry_office", "Serventia / cartorio", { required: true }),
      field("cns", "CNS"),
      field("registry_number", "Matricula"),
      field("cnm", "CNM"),
      field("requested_act", "Ato solicitado", { required: true }),
      field("protocol_number", "Protocolo"),
      field("prenotation_number", "Prenotacao"),
      field("prenotation_deadline", "Prazo da prenotacao", { type: "date" }),
      field("fees", "Emolumentos/custas", { type: "money" }),
      field("seal_number", "Selo eletronico"),
      field("seal_validation_code", "Codigo de validacao"),
      field("seal_checked_at", "Conferencia do selo", { type: "date" }),
      field("status", "Status", { type: "select", options: ["Novo", "Protocolado", "Nota devolutiva", "Exigencia", "Registrado", "Arquivado"] })
    ]
  },
  {
    id: "certidoes",
    label: "Certidoes",
    table: "property_certificates",
    icon: BadgeCheck,
    description: "Certidoes, validade e liberacao ao portal.",
    roles: allInternalRoles,
    columns: ["certificate_type", "agency", "client_id", "property_id", "issued_at", "expires_at", "status", "visible_on_portal"],
    rowActions: ["release-portal", "hide-portal"],
    fields: [
      field("client_id", "ID do cliente"),
      field("property_id", "ID do imovel"),
      field("certificate_type", "Tipo", { required: true }),
      field("agency", "Orgao"),
      field("municipality", "Municipio"),
      field("state", "UF"),
      field("requested_at", "Solicitacao", { type: "date" }),
      field("issued_at", "Emissao", { type: "date" }),
      field("expires_at", "Validade", { type: "date" }),
      field("status", "Status", { type: "select", options: ["Solicitada", "Emitida", "Vencida", "A vencer", "Cancelada"] }),
      field("cost", "Custo", { type: "money" }),
      field("visible_on_portal", "Liberar no portal", { type: "checkbox" })
    ]
  },
  {
    id: "due-diligence",
    label: "Due Diligence",
    table: "due_diligence_cases",
    icon: ShieldCheck,
    description: "Casos de due diligence rural e conclusoes.",
    roles: allInternalRoles,
    columns: ["client_name", "property_name", "purpose", "status", "general_risk", "expected_end_date"],
    rowActions: ["generate-pdf"],
    fields: [
      field("client_id", "ID do cliente"),
      field("property_id", "ID do imovel"),
      field("client_name", "Cliente"),
      field("property_name", "Imovel"),
      field("purpose", "Finalidade", { required: true }),
      field("status", "Status", { type: "select", options: ["Triagem", "Em analise", "Riscos abertos", "Concluida", "Arquivada"] }),
      field("general_risk", "Risco geral", { type: "select", options: ["Baixo", "Medio", "Alto", "Critico"] }),
      field("start_date", "Inicio", { type: "date" }),
      field("expected_end_date", "Previsao", { type: "date" }),
      field("conclusion", "Conclusao", { type: "textarea" }),
      field("recommendations", "Recomendacoes", { type: "textarea" })
    ]
  },
  {
    id: "riscos",
    label: "Riscos DD",
    table: "due_diligence_risks",
    icon: AlertTriangle,
    description: "Matriz de risco com impacto, probabilidade e severidade.",
    roles: allInternalRoles,
    columns: ["case_id", "title", "category", "impact", "probability", "severity", "status"],
    fields: [
      field("case_id", "ID do caso", { required: true }),
      field("title", "Titulo", { required: true }),
      field("category", "Categoria", { type: "select", options: ["Documental", "Registral", "Ambiental", "Fiscal", "Fundiaria", "Cartorial", "AGED/Producao", "Geoprocessamento"] }),
      field("description", "Descricao", { type: "textarea" }),
      field("origin", "Origem"),
      field("impact", "Impacto (1-5)", { type: "number" }),
      field("probability", "Probabilidade (1-5)", { type: "number" }),
      field("recommendation", "Recomendacao", { type: "textarea" }),
      field("status", "Status", { type: "select", options: ["Aberto", "Em mitigacao", "Mitigado", "Aceito"] })
    ]
  },
  {
    id: "aged",
    label: "AGED",
    table: "aged_producer_registrations",
    icon: Sprout,
    description: "Cadastro do produtor, SIGAMA e status AGED/MA.",
    roles: allInternalRoles,
    columns: ["client_name", "cpf_cnpj", "state_registration", "regional_office", "status", "last_update", "next_update"],
    fields: [
      field("client_id", "ID do cliente"),
      field("client_name", "Cliente"),
      field("cpf_cnpj", "CPF/CNPJ", { required: true }),
      field("state_registration", "Inscricao estadual"),
      field("phone", "Telefone"),
      field("email", "E-mail"),
      field("sigama_email", "E-mail SIGAMA"),
      field("regional_office", "Escritorio regional"),
      field("status", "Status", { type: "select", options: ["Ativo", "Atualizacao pendente", "Suspenso", "Inativo"] }),
      field("last_update", "Ultima atualizacao", { type: "date" }),
      field("next_update", "Proxima atualizacao", { type: "date" }),
      field("notes", "Observacoes", { type: "textarea" })
    ]
  },
  {
    id: "gta",
    label: "GTA/e-GTA",
    table: "aged_gta_records",
    icon: FileText,
    description: "GTA/e-GTA registrada manualmente com comprovantes.",
    roles: allInternalRoles,
    columns: ["number", "species", "quantity", "origin", "destination", "issued_at", "expires_at", "status"],
    fields: [
      field("client_id", "ID do cliente"),
      field("property_id", "ID do imovel"),
      field("number", "Numero"),
      field("series", "Serie"),
      field("species", "Especie"),
      field("quantity", "Quantidade", { type: "number" }),
      field("origin", "Origem"),
      field("destination", "Destino"),
      field("purpose", "Finalidade"),
      field("transporter", "Transportador"),
      field("vehicle", "Veiculo"),
      field("issued_at", "Emissao", { type: "date" }),
      field("expires_at", "Validade", { type: "date" }),
      field("status", "Status")
    ]
  },
  {
    id: "iterma",
    label: "ITERMA",
    table: "iterma_cases",
    icon: Landmark,
    description: "Regularizacao fundiaria MA com etapas e dossie.",
    roles: allInternalRoles,
    columns: ["client_id", "property_id", "beneficiary_type", "requested_area", "process_number", "current_stage", "status"],
    rowActions: ["generate-pdf"],
    fields: [
      field("client_id", "ID do cliente"),
      field("property_id", "ID do imovel"),
      field("beneficiary_type", "Tipo de beneficiario", { type: "select", options: ["agricultor familiar", "posseiro", "associacao", "comunidade"] }),
      field("family_farmer", "Agricultor familiar", { type: "checkbox" }),
      field("requested_area", "Area pretendida", { type: "number" }),
      field("occupation_time", "Tempo de ocupacao"),
      field("rural_activity", "Atividade rural"),
      field("process_number", "Numero do processo"),
      field("current_stage", "Etapa atual", { type: "select", options: ["Triagem", "Elegibilidade", "Requerimento", "Documentos pessoais", "Confrontantes", "Croqui/Planta", "Memorial", "Protocolo", "Vistoria", "Analise", "Exigencia", "Deferimento", "Titulo", "Registro", "Entrega", "Arquivado"] }),
      field("status", "Status"),
      field("notes", "Observacoes", { type: "textarea" })
    ]
  },
  {
    id: "contratos",
    label: "Contratos",
    table: "rural_contracts",
    icon: FileSignature,
    description: "Contratos rurais por template, assinatura e portal.",
    roles: allInternalRoles,
    columns: ["contract_type", "client_id", "property_id", "service_id", "status", "total_value", "visible_on_portal"],
    rowActions: ["release-portal", "hide-portal", "generate-pdf"],
    fields: [
      field("client_id", "ID do cliente"),
      field("property_id", "ID do imovel"),
      field("service_id", "ID do servico"),
      field("contract_type", "Tipo de contrato", { type: "select", options: ["Prestacao de servicos", "Georreferenciamento", "Arrendamento rural", "Parceria rural", "Compra e venda rural"] }),
      field("status", "Status", { type: "select", options: ["Minuta", "Enviado", "Assinado", "Cancelado"] }),
      field("total_value", "Valor", { type: "money" }),
      field("signed_at", "Assinado em", { type: "date" }),
      field("visible_on_portal", "Liberar no portal", { type: "checkbox" }),
      field("notes", "Observacoes", { type: "textarea" })
    ]
  },
  {
    id: "financeiro",
    label: "Financeiro",
    table: "financial_entries",
    icon: DollarSign,
    description: "Receitas, despesas, inadimplencia e recibos.",
    roles: financeRoles,
    columns: ["entry_type", "category", "client_id", "service_id", "amount", "due_date", "status", "visible_on_portal"],
    rowActions: ["release-portal", "hide-portal"],
    fields: [
      field("client_id", "ID do cliente"),
      field("service_id", "ID do servico"),
      field("entry_type", "Tipo", { type: "select", options: ["Receita", "Despesa"] }),
      field("category", "Categoria"),
      field("amount", "Valor", { type: "money", required: true }),
      field("due_date", "Vencimento", { type: "date" }),
      field("paid_at", "Pagamento", { type: "date" }),
      field("status", "Status", { type: "select", options: ["A receber", "Recebido", "A pagar", "Pago", "Vencido", "Cancelado"] }),
      field("visible_on_portal", "Visivel no portal", { type: "checkbox" })
    ]
  },
  {
    id: "equipamentos",
    label: "Equipamentos",
    table: "field_equipment",
    icon: Wrench,
    description: "Equipamentos em campo, manutencao e responsabilidade.",
    roles: technicalRoles,
    columns: ["name", "equipment_type", "brand", "model", "asset_tag", "responsible_name", "status", "next_maintenance"],
    fields: [
      field("name", "Nome", { required: true }),
      field("equipment_type", "Tipo"),
      field("brand", "Marca"),
      field("model", "Modelo"),
      field("serial_number", "Serie"),
      field("asset_tag", "Patrimonio"),
      field("condition", "Conservacao"),
      field("responsible_name", "Responsavel"),
      field("unit", "Unidade"),
      field("status", "Status", { type: "select", options: ["Disponivel", "Em campo", "Manutencao", "Indisponivel"] }),
      field("next_maintenance", "Proxima manutencao", { type: "date" }),
      field("last_calibration", "Ultima calibracao", { type: "date" })
    ]
  },
  {
    id: "templates",
    label: "Templates",
    table: "official_templates",
    icon: FileText,
    description: "Templates oficiais parametrizaveis com variaveis.",
    roles: adminOperationalRoles,
    columns: ["name", "category", "variables", "active", "updated_at"],
    rowActions: ["generate-pdf"],
    fields: [
      field("name", "Nome", { required: true }),
      field("category", "Categoria", { required: true }),
      field("body", "Corpo do template", { type: "textarea", required: true }),
      field("variables_text", "Variaveis separadas por virgula"),
      field("active", "Ativo", { type: "checkbox" })
    ]
  },
  {
    id: "car",
    label: "CAR",
    table: "car_records",
    icon: Sprout,
    description: "CAR/SICAR, APP, reserva legal e sobreposicoes.",
    roles: allInternalRoles,
    columns: ["car_number", "property_id", "environmental_status", "analysis_status", "overlap_status", "divergences"],
    fields: [
      field("client_id", "ID do cliente"),
      field("property_id", "ID do imovel"),
      field("car_number", "Numero CAR"),
      field("receipt", "Recibo"),
      field("state_agency", "Orgao estadual"),
      field("app_area", "APP", { type: "number" }),
      field("legal_reserve_area", "Reserva legal", { type: "number" }),
      field("consolidated_area", "Area consolidada", { type: "number" }),
      field("productive_area", "Area produtiva", { type: "number" }),
      field("environmental_status", "Status ambiental"),
      field("analysis_status", "Analise"),
      field("overlap_status", "Sobreposicao"),
      field("divergences", "Divergencias", { type: "textarea" })
    ]
  },
  {
    id: "ccir",
    label: "CCIR/SNCR",
    table: "ccir_records",
    icon: FileText,
    description: "CCIR, SNCR, taxas e pendencias.",
    roles: allInternalRoles,
    columns: ["incra_code", "ccir_number", "fiscal_year", "issued_at", "fee_value", "status", "sncr_status"],
    fields: [
      field("client_id", "ID do cliente"),
      field("property_id", "ID do imovel"),
      field("incra_code", "Codigo do imovel"),
      field("ccir_number", "Numero CCIR"),
      field("fiscal_year", "Exercicio"),
      field("issued_at", "Emissao", { type: "date" }),
      field("fee_value", "Taxa", { type: "money" }),
      field("status", "Status"),
      field("pending_notes", "Pendencias", { type: "textarea" }),
      field("sncr_status", "SNCR")
    ]
  },
  {
    id: "itr",
    label: "ITR/DITR",
    table: "itr_records",
    icon: FileText,
    description: "ITR/DITR, DARF, recibos e prazos.",
    roles: allInternalRoles,
    columns: ["fiscal_year", "holder", "cib", "total_area", "declared_value", "sent_at", "status", "deadline"],
    fields: [
      field("client_id", "ID do cliente"),
      field("property_id", "ID do imovel"),
      field("fiscal_year", "Exercicio"),
      field("holder", "Titular"),
      field("cib", "CIB"),
      field("total_area", "Area total", { type: "number" }),
      field("taxable_area", "Area tributavel", { type: "number" }),
      field("exempt_areas", "Areas isentas", { type: "number" }),
      field("declared_value", "Valor declarado", { type: "money" }),
      field("sent_at", "Envio", { type: "date" }),
      field("status", "Status"),
      field("deadline", "Prazo", { type: "date" }),
      field("late_alert", "Alerta de atraso", { type: "checkbox" })
    ]
  },
  {
    id: "sigef",
    label: "SIGEF",
    table: "sigef_records",
    icon: Compass,
    description: "SIGEF, ART, certificacao e exigencias.",
    roles: allInternalRoles,
    columns: ["protocol_number", "certification_status", "art", "overlap_status", "requirement_notes", "sent_at", "approved_at"],
    fields: [
      field("client_id", "ID do cliente"),
      field("property_id", "ID do imovel"),
      field("protocol_number", "Protocolo"),
      field("certification_status", "Status de certificacao"),
      field("art", "ART"),
      field("overlap_status", "Sobreposicao"),
      field("requirement_notes", "Exigencia", { type: "textarea" }),
      field("sent_at", "Envio", { type: "date" }),
      field("approved_at", "Aprovacao", { type: "date" })
    ]
  },
  {
    id: "cib-nirf",
    label: "CIB/NIRF",
    table: "cib_nirf_records",
    icon: FileText,
    description: "CIB, NIRF, comprovantes e consultas oficiais.",
    roles: allInternalRoles,
    columns: ["number", "record_type", "holder", "status", "divergences", "updated_on"],
    fields: [
      field("client_id", "ID do cliente"),
      field("property_id", "ID do imovel"),
      field("number", "Numero"),
      field("record_type", "Tipo", { type: "select", options: ["CIB", "NIRF"] }),
      field("holder", "Titular"),
      field("status", "Status"),
      field("divergences", "Divergencias", { type: "textarea" }),
      field("updated_on", "Atualizacao", { type: "date" })
    ]
  }
];

function exportCsv(filename: string, rows: AnyRow[]) {
  const columns = safeDisplayColumns(Object.keys(rows[0] ?? {}));
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [columns.join(";"), ...rows.map((row) => columns.map((column) => escape(row[column])).join(";"))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportExcel(filename: string, rows: AnyRow[]) {
  const safeFilename = filename.endsWith(".xlsx") ? filename : filename.replace(/\.xls$/i, "") + ".xlsx";
  const columns = safeDisplayColumns(Object.keys(rows[0] ?? {}));
  const exportRows = rows.map((row) =>
    Object.fromEntries(columns.map((column) => [friendlyLabel(column), formatCell(row[column])]))
  );

  void import("xlsx")
    .then((xlsx) => {
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(exportRows.length ? exportRows : [{ Aviso: "Nenhum registro encontrado" }]);
      xlsx.utils.book_append_sheet(workbook, worksheet, "Dados");
      xlsx.writeFile(workbook, safeFilename);
    })
    .catch(() => {
      const escapeHtml = (value: unknown) =>
        String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");
      const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(friendlyLabel(column))}</th>`).join("")}</tr></thead><tbody>${rows
        .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(formatCell(row[column]))}</td>`).join("")}</tr>`)
        .join("")}</tbody></table></body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = safeFilename.replace(/\.xlsx$/i, ".xls");
      link.click();
      URL.revokeObjectURL(url);
    });
}

async function exportRowsPdf(title: string, rows: AnyRow[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const columns = safeDisplayColumns(Object.keys(rows[0] ?? {})).slice(0, 6);
  const safeTitle = title || "Relatorio";

  function header() {
    doc.setFillColor(22, 59, 44);
    doc.rect(0, 0, pageWidth, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Nex Rural", 14, 13);
    doc.setFontSize(10);
    doc.text("Gestão documental rural", 14, 21);
    doc.setFontSize(13);
    doc.text(safeTitle, pageWidth - 14, 13, { align: "right" });
    doc.setFontSize(8);
    doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, pageWidth - 14, 21, { align: "right" });
    doc.setTextColor(22, 59, 44);
  }

  function footer(page: number) {
    doc.setDrawColor(216, 193, 142);
    doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);
    doc.setFontSize(8);
    doc.setTextColor(100, 93, 83);
    doc.text("Nex Rural - documento gerado para conferencia operacional.", 14, pageHeight - 9);
    doc.text(`Pagina ${page}`, pageWidth - 14, pageHeight - 9, { align: "right" });
    doc.setTextColor(22, 59, 44);
  }

  header();
  doc.setFillColor(247, 244, 236);
  doc.roundedRect(14, 38, pageWidth - 28, 24, 3, 3, "F");
  doc.setFontSize(10);
  doc.text("Resumo", 20, 48);
  doc.setFontSize(16);
  doc.text(`${rows.length}`, 20, 57);
  doc.setFontSize(9);
  doc.text("registros exportados", 36, 57);

  let y = 74;
  if (!rows.length) {
    doc.setFontSize(11);
    doc.text("Nenhum registro encontrado para este relatorio.", 14, y);
  } else {
    doc.setFillColor(22, 59, 44);
    doc.rect(14, y, pageWidth - 28, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    columns.forEach((column, index) => doc.text(friendlyLabel(column).slice(0, 24), 16 + index * 30, y + 6, { maxWidth: 28 }));
    doc.setTextColor(22, 59, 44);
    y += 10;
  }

  rows.slice(0, 80).forEach((row, rowIndex) => {
    if (y > pageHeight - 24) {
      footer(doc.getNumberOfPages());
      doc.addPage();
      header();
      y = 42;
    }
    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 248, 242);
      doc.rect(14, y - 1, pageWidth - 28, 10, "F");
    }
    doc.setFontSize(7);
    columns.forEach((column, index) => doc.text(formatCell(row[column]).slice(0, 42), 16 + index * 30, y + 5, { maxWidth: 28 }));
    y += 10;
  });
  footer(doc.getNumberOfPages());
  doc.save(`nex-rural-${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

function normalizeFormValues(values: AnyRow, fields: FieldConfig[]) {
  const output: AnyRow = {};
  fields.forEach((item) => {
    let value = values[item.name];
    if (item.name === "variables_text") {
      output.variables = text(value)
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      return;
    }
    if (item.type === "checkbox") value = Boolean(value);
    if (item.type === "number" || item.type === "money") value = value === "" || value === undefined ? null : Number(value);
    if (value === "") value = null;
    output[item.name] = value;
  });
  return output;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function schemaFor(fields: FieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  fields.forEach((item) => {
    shape[item.name] = z.any().superRefine((value, context) => {
      const raw = String(value ?? "").trim();
      const key = item.name.toLowerCase();
      if (item.required && (value === undefined || value === null || raw === "")) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: `${item.label} e obrigatorio` });
        return;
      }
      if (!raw) return;

      if (item.type === "email" && !z.string().email().safeParse(raw).success) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "E-mail invalido" });
      }
      if (["document", "cpf_cnpj", "cnpj"].includes(key)) {
        const digits = onlyDigits(raw);
        if (![11, 14].includes(digits.length)) context.addIssue({ code: z.ZodIssueCode.custom, message: "CPF/CNPJ deve ter 11 ou 14 digitos" });
      }
      if (["phone", "whatsapp", "telefone"].includes(key)) {
        const digits = onlyDigits(raw);
        if (digits.length < 10 || digits.length > 13) context.addIssue({ code: z.ZodIssueCode.custom, message: "Telefone deve ter DDD e numero" });
      }
      if (key === "state" && raw.length !== 2) context.addIssue({ code: z.ZodIssueCode.custom, message: "UF deve ter 2 letras" });
      if (key.includes("latitude")) {
        const number = Number(raw);
        if (!Number.isFinite(number) || number < -90 || number > 90) context.addIssue({ code: z.ZodIssueCode.custom, message: "Latitude deve estar entre -90 e 90" });
      }
      if (key.includes("longitude")) {
        const number = Number(raw);
        if (!Number.isFinite(number) || number < -180 || number > 180) context.addIssue({ code: z.ZodIssueCode.custom, message: "Longitude deve estar entre -180 e 180" });
      }
      if (item.type === "number" || item.type === "money") {
        const number = Number(raw);
        if (!Number.isFinite(number)) context.addIssue({ code: z.ZodIssueCode.custom, message: "Informe um numero valido" });
        if (/amount|valor|area|quantity|requested_area/.test(key) && number < 0) context.addIssue({ code: z.ZodIssueCode.custom, message: "Valor nao pode ser negativo" });
      }
      if (key === "client_access_code" && raw.length > 0 && raw.length < 4) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Codigo do portal deve ter pelo menos 4 caracteres" });
      }
    });
  });
  return z.object(shape);
}

function formatCell(value: unknown) {
  if (typeof value === "boolean") return value ? "Sim" : "Nao";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toLocaleString("pt-BR");
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return dateBR(value);
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value ?? "");
}

function AppButton({
  children,
  icon: Icon,
  onClick,
  variant = "primary",
  type = "button",
  disabled
}: {
  children: ReactNode;
  icon?: ElementType;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-forest text-white hover:bg-leaf",
    secondary: "border border-stone-200 bg-white text-forest hover:bg-wheat",
    danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    ghost: "text-stone-600 hover:bg-stone-100"
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`button-press inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-leaf/25 disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]}`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

function Panel({ title, children, action, subtitle }: { title: string; children: ReactNode; action?: ReactNode; subtitle?: string }) {
  return (
    <section className="premium-card slide-up rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-forest">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: ElementType; tone: string }) {
  return (
    <article className="interactive-card rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-forest">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function DataTable({
  rows,
  columns,
  onView,
  onEdit,
  onDelete,
  actions
}: {
  rows: AnyRow[];
  columns: string[];
  onView?: (row: AnyRow) => void;
  onEdit?: (row: AnyRow) => void;
  onDelete?: (row: AnyRow) => void;
  actions?: (row: AnyRow) => ReactNode;
}) {
  if (!rows.length) {
    return <EmptyState title="Nenhum registro encontrado" description="Clique em Novo para comecar ou use Atualizar para recarregar os dados." />;
  }

  const displayColumns = safeDisplayColumns(columns);

  function renderValue(row: AnyRow, column: string, index: number) {
    const value = row[column];
    if (column === "photo_url") {
      const src = text(value);
      return src ? (
        <span className="block h-10 w-10 overflow-hidden rounded-full border border-gold/30 bg-wheat shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Image src={src} alt="Foto do cliente" width={40} height={40} className="h-full w-full object-cover" unoptimized />
        </span>
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-xs font-black text-forest">NR</span>
      );
    }
    const display = shortText(value, index === 0 ? 72 : 54);
    if (/status|risk|priority|situacao|visible|portal|active|required|requires/i.test(column)) return <Badge tone={toneFor(display)}>{display}</Badge>;
    return <span title={formatCell(value)} className={index === 0 ? "font-black text-forest" : "text-stone-700"}>{display || "-"}</span>;
  }

  return (
    <div className="space-y-3">
      <div className="hidden rounded-xl border border-stone-200 bg-white shadow-sm lg:block">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              {displayColumns.map((column) => (
                <th key={column} className="border-b border-stone-200 bg-stone-50 px-3 py-3 font-black text-stone-600 first:rounded-tl-xl">
                  {friendlyLabel(column)}
                </th>
              ))}
              <th className="w-[168px] border-b border-stone-200 bg-stone-50 px-3 py-3 text-right font-black text-stone-600 last:rounded-tr-xl">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id ?? pickRowTitle(row))} className="transition hover:bg-wheat/60">
                {displayColumns.map((column, index) => (
                  <td key={`${row.id}-${column}`} className="border-b border-stone-100 px-3 py-3 align-middle">
                    {renderValue(row, column, index)}
                  </td>
                ))}
                <td className="border-b border-stone-100 px-3 py-3 align-middle">
                  <div className="flex flex-wrap justify-end gap-2">
                    {onView && <IconButton label="Visualizar" icon={Eye} onClick={() => onView(row)} />}
                    {onEdit && <IconButton label="Editar" icon={Edit3} onClick={() => onEdit(row)} />}
                    {actions?.(row)}
                    {onDelete && <IconButton label="Excluir" icon={Trash2} onClick={() => onDelete(row)} tone="danger" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {rows.map((row) => (
          <article key={String(row.id ?? pickRowTitle(row))} className="interactive-card rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-forest">{pickRowTitle(row)}</h3>
                <p className="text-xs font-semibold text-stone-500">{shortText(row.category || row.type || row.status || "Registro operacional")}</p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {onView && <IconButton label="Visualizar" icon={Eye} onClick={() => onView(row)} />}
                {onEdit && <IconButton label="Editar" icon={Edit3} onClick={() => onEdit(row)} />}
                {actions?.(row)}
                {onDelete && <IconButton label="Excluir" icon={Trash2} onClick={() => onDelete(row)} tone="danger" />}
              </div>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {displayColumns.slice(0, 6).map((column) => (
                <div key={column} className="rounded-lg bg-stone-50 p-2">
                  <dt className="text-[11px] font-black uppercase tracking-wide text-stone-400">{friendlyLabel(column)}</dt>
                  <dd className="mt-1 font-semibold text-stone-700">{renderValue(row, column, 1)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}


function RecordDetails({ row }: { row: AnyRow }) {
  const entries = Object.entries(row).filter(([key, value]) => !isTechnicalField(key) && value !== null && value !== undefined && value !== "");
  const primary = pickRowTitle(row);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gold/20 bg-gradient-to-r from-wheat to-white p-4">
        <p className="text-xs font-black uppercase tracking-wide text-stone-500">Resumo do registro</p>
        <h3 className="mt-1 text-lg font-black text-forest">{primary}</h3>
        <p className="mt-1 text-sm font-semibold text-stone-600">{shortText(row.description || row.category || row.type || row.status || "Informações operacionais do registro.", 160)}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {entries.slice(0, 18).map(([key, value]) => (
          <div key={key} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-wide text-stone-400">{friendlyLabel(key)}</p>
            <p className="mt-1 text-sm font-semibold text-stone-700" title={formatCell(value)}>{shortText(value, 160)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-forest shadow-sm">
        <FileText className="h-5 w-5" />
      </div>
      <p className="font-black text-forest">{title}</p>
      <p className="mt-1 text-sm font-semibold text-stone-500">{description}</p>
    </div>
  );
}

function IconButton({ label, icon: Icon, onClick, tone = "default" }: { label: string; icon: ElementType; onClick: () => void; tone?: "default" | "danger" | "success" }) {
  const tones = {
    default: "border-stone-200 text-forest hover:bg-wheat",
    danger: "border-red-200 text-red-700 hover:bg-red-50",
    success: "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
  };
  return (
    <button title={label} aria-label={label} onClick={onClick} className={`button-press rounded-lg border p-2 transition hover:-translate-y-0.5 hover:shadow-sm ${tones[tone]}`}>
      <Icon className="h-4 w-4" />
    </button>
  );
}

const relationFieldLabels: Record<string, string> = {
  client_id: "Cliente",
  property_id: "Imóvel",
  service_id: "Serviço",
  template_id: "Modelo DOCX",
  linked_template_id: "Modelo DOCX vinculado",
  generated_checklist_id: "Checklist do cliente",
  generated_checklist_item_id: "Item do checklist",
  tag_id: "Tag",
  company_id: "Empresa",
  owner_id: "Proprietário",
  producer_id: "Produtor",
  responsible_id: "Responsável",
  assigned_to: "Responsável",
  registry_id: "Registro/Cartório",
  certificate_id: "Certidão",
  property_certificate_id: "Certidão do imóvel",
  rural_property_id: "Imóvel",
  document_id: "Documento",
  generated_document_id: "Documento gerado",
  checklist_item_id: "Item do checklist"
};

const relationTableByField: Record<string, string> = {
  client_id: "clients",
  property_id: "rural_properties",
  service_id: "services",
  template_id: "document_templates",
  linked_template_id: "document_templates",
  generated_checklist_id: "generated_checklists",
  generated_checklist_item_id: "generated_checklist_items",
  tag_id: "tags",
  company_id: "companies",
  owner_id: "clients",
  producer_id: "clients",
  responsible_id: "user_profiles",
  assigned_to: "user_profiles",
  registry_id: "registry_processes",
  certificate_id: "property_certificates",
  property_certificate_id: "property_certificates",
  rural_property_id: "rural_properties",
  document_id: "documents",
  generated_document_id: "generated_documents",
  checklist_item_id: "checklist_template_items"
};

function isRelationFieldName(name: string) {
  return Object.prototype.hasOwnProperty.call(relationTableByField, name);
}

function relationOptionLabel(fieldName: string, row: AnyRow, allRows: Record<string, AnyRow[]> = {}) {
  if (["client_id", "owner_id", "producer_id"].includes(fieldName)) return text(row.full_name || row.name || row.client_name || "Cliente");
  if (["responsible_id", "assigned_to"].includes(fieldName)) return text(row.full_name || row.name || row.email || "Usuário");
  if (["property_id", "rural_property_id"].includes(fieldName)) return text(row.name || row.property_name || "Imóvel rural");
  if (fieldName === "service_id") return text(row.service_type || row.type || row.title || "Serviço");
  if (fieldName === "template_id" || fieldName === "linked_template_id") return text(row.name || row.title || "Modelo DOCX");
  if (["document_id", "generated_document_id"].includes(fieldName)) return text(row.title || row.name || row.original_name || "Documento");
  if (["certificate_id", "property_certificate_id"].includes(fieldName)) return text(row.title || row.certificate_type || row.agency || "Certidão");
  if (fieldName === "registry_id") return text(row.title || row.process_type || row.registry_number || "Registro");
  if (fieldName === "checklist_item_id") return text(row.document_name || row.title || "Item do checklist");
  if (fieldName === "generated_checklist_id") return text(row.title || row.name || "Checklist do cliente");
  if (fieldName === "generated_checklist_item_id") return text(row.document_name || row.title || "Item do checklist");
  if (fieldName === "tag_id") return text(row.name || row.label || "Tag");
  if (fieldName === "company_id") return text(row.trade_name || row.name || "Empresa");
  return pickRowTitle(row);
}

function relationOptionDescription(fieldName: string, row: AnyRow, allRows: Record<string, AnyRow[]> = {}) {
  if (["client_id", "owner_id", "producer_id"].includes(fieldName)) return text(row.cpf_cnpj || row.document || row.phone || "");
  if (["responsible_id", "assigned_to"].includes(fieldName)) return text(row.email || row.role || row.status || "");
  if (["property_id", "rural_property_id"].includes(fieldName)) return [row.municipality || row.city, row.state].map(text).filter(Boolean).join("/");
  if (fieldName === "service_id") {
    const client = (allRows.clients ?? []).find((item) => text(item.id) === text(row.client_id));
    return [row.status, client ? pickRowTitle(client) : ""].map(text).filter(Boolean).join(" • ");
  }
  if (fieldName === "template_id" || fieldName === "linked_template_id") return [row.category, row.file_type || row.type].map(text).filter(Boolean).join(" • ");
  if (fieldName === "generated_checklist_id") {
    const client = (allRows.clients ?? []).find((item) => text(item.id) === text(row.client_id));
    return [row.status, client ? pickRowTitle(client) : ""].map(text).filter(Boolean).join(" • ");
  }
  if (fieldName === "generated_checklist_item_id" || fieldName === "checklist_item_id") return [row.status, row.required ? "Obrigatório" : "Opcional"].map(text).filter(Boolean).join(" • ");
  if (["document_id", "generated_document_id"].includes(fieldName)) return [row.category, row.status, row.output_type].map(text).filter(Boolean).join(" • ");
  if (["certificate_id", "property_certificate_id", "registry_id"].includes(fieldName)) return [row.status, row.issued_at || row.created_at].map(text).filter(Boolean).join(" • ");
  if (fieldName === "company_id") return text(row.company_code || row.cnpj || "");
  return text(row.category || row.status || "");
}

function relationOptionsFor(fieldName: string, allRows: Record<string, AnyRow[]> = {}, profile?: AuthProfile | null): RelationOption[] {
  const table = relationTableByField[fieldName];
  if (!table) return [];
  let candidates = allRows[table] ?? [];
  if (fieldName === "linked_template_id" || fieldName === "template_id") {
    candidates = candidates.filter((row) => text(row.file_type).toLowerCase() === "docx" || Boolean(row.storage_path));
  }
  if (profile && profile.role !== "admin_master_global" && fieldName === "company_id") {
    candidates = candidates.filter((row) => text(row.id) === text(profile.company_id));
  } else if (profile && profile.role !== "admin_master_global") {
    candidates = candidates.filter((row) => !row.company_id || text(row.company_id) === text(profile.company_id));
  }
  return candidates
    .filter((row) => row.deleted_at === undefined || row.deleted_at === null)
    .slice(0, 500)
    .map((row) => ({
      id: text(row.id),
      label: relationOptionLabel(fieldName, row, allRows),
      description: relationOptionDescription(fieldName, row, allRows)
    }))
    .filter((option) => option.id && option.label);
}

function CrudPanel({
  config,
  rows,
  allRows,
  profile,
  onCreate,
  onUpdate,
  onDelete,
  onRowAction
}: {
  config: ModuleConfig;
  rows: AnyRow[];
  allRows: Record<string, AnyRow[]>;
  profile: AuthProfile;
  onCreate: (config: ModuleConfig, values: AnyRow) => Promise<void>;
  onUpdate: (config: ModuleConfig, row: AnyRow, values: AnyRow) => Promise<void>;
  onDelete: (config: ModuleConfig, row: AnyRow) => Promise<void>;
  onRowAction: (action: RowAction, config: ModuleConfig, row: AnyRow) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [viewing, setViewing] = useState<AnyRow | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<AnyRow | null>(null);
  const schema = useMemo(() => schemaFor(config.fields), [config.fields]);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue: setFormValue,
    formState: { errors, isSubmitting }
  } = useForm<AnyRow>({ resolver: zodResolver(schema), defaultValues: {} });
  const hasSpouseChecked = Boolean(watch("has_spouse"));
  const visibleFields = useMemo(() => config.fields.filter((item) => {
    if (config.table === "clients" && item.name.startsWith("spouse_") && !hasSpouseChecked) return false;
    if (config.table === "clients" && ["photo_url", "photo_storage_path"].includes(item.name)) return false;
    return true;
  }), [config.fields, config.table, hasSpouseChecked]);

  const filtered = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const initial: AnyRow = {};
    visibleFields.forEach((item) => {
      const value = editing?.[item.name];
      initial[item.name] = item.name === "variables_text" && Array.isArray(editing?.variables) ? editing?.variables.join(", ") : value ?? (item.type === "checkbox" ? false : "");
    });
    reset(initial);
  }, [visibleFields, editing, reset, open]);

  async function submit(values: AnyRow) {
    const payload = normalizeFormValues(values, visibleFields);
    if (config.table === "clients" && !payload.has_spouse) {
      Object.keys(payload).forEach((key) => {
        if (key.startsWith("spouse_")) delete payload[key];
      });
    }
    if (editing) await onUpdate(config, editing, payload);
    else await onCreate(config, payload);
    setOpen(false);
    setEditing(null);
  }

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }

  function startEdit(row: AnyRow) {
    setEditing(row);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <Panel
        title={config.label}
        subtitle={config.description}
        action={
          <div className="flex flex-wrap gap-2">
            <SearchBox value={query} onChange={setQuery} />
            <AppButton icon={Download} variant="secondary" onClick={() => exportCsv(`nex-rural-${config.table}.csv`, rows)}>
              Exportar CSV
            </AppButton>
            <AppButton icon={FileStack} variant="secondary" onClick={() => exportExcel(`nex-rural-${config.table}.xls`, rows)}>
              Excel
            </AppButton>
            <AppButton icon={Plus} onClick={startCreate}>
              Novo
            </AppButton>
          </div>
        }
      >
        {open && (
          <form onSubmit={handleSubmit(submit)} className="mb-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-black text-forest">{editing ? "Editar registro" : "Criar registro"}</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-stone-500 hover:bg-white" aria-label="Fechar formulario">
                <X className="h-4 w-4" />
              </button>
            </div>
            {config.table === "clients" && editing && (
              <div className="mb-4 rounded-xl border border-gold/20 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50 text-sm font-black text-forest">
                    {editing.photo_url ? <Image src={String(editing.photo_url)} alt="Foto do cliente" width={80} height={80} className="h-full w-full object-cover" unoptimized /> : "Sem foto"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-forest">Foto do cliente</p>
                    <p className="text-sm font-semibold text-stone-500">Use o botão de upload na linha do cliente para anexar a foto. A imagem aparecerá na ficha e no dossiê.</p>
                  </div>
                </div>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleFields.map((item) => (
                <FormField key={item.name} field={item} register={register} error={text(errors[item.name]?.message)} allRows={allRows} profile={profile} value={text(watch(item.name))} setValue={(value) => {
                  setFormValue(item.name, value, { shouldDirty: true, shouldValidate: true });
                }} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <AppButton variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </AppButton>
              <AppButton type="submit" icon={editing ? Save : Plus} disabled={isSubmitting}>
                {editing ? "Salvar" : "Criar"}
              </AppButton>
            </div>
          </form>
        )}

        <DataTable
          rows={filtered}
          columns={config.columns}
          onView={setViewing}
          onEdit={startEdit}
          onDelete={(row) => setDeleteCandidate(row)}
          actions={(row) => (
            <>
              {config.rowActions
                ?.filter((action) => !(action === "generate-client-dossier-spouse" && !row.has_spouse))
                .map((action) => (
                  <ActionButton key={action} action={action} onClick={() => onRowAction(action, config, row)} />
                ))}
            </>
          )}
        />
      </Panel>

      {viewing && (
        <Panel
          title="Visualização profissional"
          action={
            <AppButton variant="secondary" onClick={() => setViewing(null)}>
              Fechar
            </AppButton>
          }
        >
          <RecordDetails row={viewing} />
        </Panel>
      )}

      {deleteCandidate && (
        <Panel
          title="Confirmar exclusão"
          subtitle={`Você está prestes a excluir ${pickRowTitle(deleteCandidate)}. Esta ação ficará registrada na auditoria.`}
          action={<AppButton variant="secondary" onClick={() => setDeleteCandidate(null)}>Cancelar</AppButton>}
        >
          <div className="flex flex-wrap justify-end gap-2">
            <AppButton variant="secondary" onClick={() => setDeleteCandidate(null)}>Cancelar</AppButton>
            <AppButton icon={Trash2} onClick={async () => { await onDelete(config, deleteCandidate); setDeleteCandidate(null); }}>Confirmar exclusão</AppButton>
          </div>
        </Panel>
      )}
    </div>
  );
}

function ActionButton({ action, onClick }: { action: RowAction; onClick: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const meta: Record<RowAction, { label: string; icon: ElementType; tone?: "default" | "danger" | "success" }> = {
    "convert-lead": { label: "Converter lead", icon: CheckCircle2, tone: "success" },
    "create-checklist": { label: "Criar checklist", icon: ListChecks },
    "generate-contract": { label: "Gerar contrato", icon: FileSignature },
    "release-portal": { label: "Liberar no portal", icon: Lock, tone: "success" },
    "hide-portal": { label: "Ocultar do portal", icon: Archive },
    approve: { label: "Aprovar", icon: CheckCircle2, tone: "success" },
    reject: { label: "Reprovar", icon: X, tone: "danger" },
    "generate-pdf": { label: "Gerar PDF", icon: FileText },
    "block-company": { label: "Bloquear empresa", icon: Lock, tone: "danger" },
    "unblock-company": { label: "Reativar empresa", icon: BadgeCheck, tone: "success" },
    "block-user": { label: "Bloquear usuario", icon: Lock, tone: "danger" },
    "unblock-user": { label: "Reativar usuario", icon: BadgeCheck, tone: "success" },
    "make-company-admin": { label: "Tornar admin da empresa", icon: ShieldCheck, tone: "success" },
    "remove-company-admin": { label: "Remover admin da empresa", icon: Users },
    "generate-access-code": { label: "Gerar codigo do portal", icon: ShieldCheck },
    "generate-client-sheet": { label: "Ficha do cliente", icon: FileText, tone: "success" },
    "create-client-checklist": { label: "Criar checklist para cliente", icon: ListChecks, tone: "success" },
    "export-client-contacts": { label: "Exportar contatos", icon: Download },
    "duplicate-checklist-template": { label: "Duplicar modelo", icon: FileStack },
    "request-checklist-items": { label: "Solicitar ao cliente", icon: Upload, tone: "success" },
    "upload-client-photo": { label: "Anexar foto do cliente", icon: Upload, tone: "success" },
    "generate-client-dossier": { label: "Dossie do cliente", icon: FileText, tone: "success" },
    "generate-client-dossier-spouse": { label: "Dossie cliente + conjuge", icon: FileSignature, tone: "success" },
    "generate-client-dossier-excel": { label: "Dossie Excel", icon: Download, tone: "success" },
    "create-pending": { label: "Criar pendencia", icon: AlertTriangle }
  };
  const item = meta[action];
  return <IconButton label={busy ? "Processando..." : item.label} icon={busy ? RefreshCw : item.icon} onClick={async () => { if (busy) return; setBusy(true); try { await onClick(); } catch (error) { window.dispatchEvent(new CustomEvent("nex-rural-toast", { detail: { message: error instanceof Error ? error.message : "Não foi possível concluir a ação.", tone: "red" } })); } finally { setBusy(false); } }} tone={item.tone} />;
}

function FormField({
  field,
  register,
  error,
  allRows = {},
  profile,
  value = "",
  setValue
}: {
  field: FieldConfig;
  register: ReturnType<typeof useForm<AnyRow>>["register"];
  error?: string;
  allRows?: Record<string, AnyRow[]>;
  profile?: AuthProfile | null;
  value?: string;
  setValue?: (value: string) => void;
}) {
  const common = "w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-leaf";
  const relationOptions = isRelationFieldName(field.name) ? relationOptionsFor(field.name, allRows, profile) : [];
  const label = relationFieldLabels[field.name] || field.label.replace(/^ID\s+(do|da|de)\s+/i, "");
  if (isRelationFieldName(field.name)) {
    return (
      <div className="block">
        <input type="hidden" {...register(field.name)} />
        <RelationSelect
          label={label}
          value={value}
          options={relationOptions}
          placeholder={field.name === "company_id" && profile?.role !== "admin_master_global" ? "Empresa definida automaticamente" : `Selecione ${label.toLowerCase()}`}
          disabled={field.name === "company_id" && profile?.role !== "admin_master_global"}
          onChange={(nextValue) => setValue?.(nextValue)}
        />
        {error && <span className="mt-1 block text-xs font-semibold text-red-700">{error}</span>}
      </div>
    );
  }
  return (
    <label className={field.type === "textarea" ? "block md:col-span-2 xl:col-span-3" : "block"}>
      <span className="mb-1 block text-sm font-bold text-stone-700">{field.label}</span>
      {field.type === "textarea" ? (
        <textarea {...register(field.name)} className={`${common} min-h-28`} placeholder={field.placeholder} />
      ) : field.type === "select" ? (
        <select {...register(field.name)} className={common}>
          <option value="">Selecione</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === "checkbox" ? (
        <span className="flex min-h-11 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3">
          <input {...register(field.name)} type="checkbox" className="h-4 w-4 accent-leaf" />
          <span className="text-sm font-semibold text-stone-600">Sim</span>
        </span>
      ) : (
        <input
          {...register(field.name)}
          type={field.type === "money" || field.type === "number" ? "number" : field.type ?? "text"}
          step={field.type === "money" || field.type === "number" ? "0.01" : undefined}
          className={common}
          placeholder={field.placeholder}
        />
      )}
      {error && <span className="mt-1 block text-xs font-semibold text-red-700">{error}</span>}
    </label>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="relative block w-full max-w-xs">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 outline-none focus:border-leaf" placeholder="Buscar..." />
    </label>
  );
}

type AccessMode = "empresa" | "funcionario" | "cliente" | "admin";

type CompanyChoice = { choice_id: string; display_name: string; city?: string; state?: string; company_hint?: string };

function LoginScreen({
  onLogin,
  onStaffAccess
}: {
  onLogin: (email: string, password: string, companyCode?: string) => Promise<void>;
  onStaffAccess: (profile: AuthProfile, token: string) => Promise<void> | void;
}) {
  const router = useRouter();
  const [accessMode, setAccessMode] = useState<AccessMode>("empresa");
  const [email, setEmail] = useState(isDemoMode ? "admin327@nexrural.local" : "");
  const [password, setPassword] = useState(isDemoMode ? "nexrural" : "");
  const [companyCode, setCompanyCode] = useState(isDemoMode ? "3272026" : "");
  const [fullName, setFullName] = useState(isDemoMode ? "Tecnico Responsavel" : "");
  const [cpf, setCpf] = useState("");
  const [choices, setChoices] = useState<CompanyChoice[]>([]);
  const [selectedChoice, setSelectedChoice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(!isDemoMode && !hasSupabaseConfig ? backendMissingMessage : "");

  function chooseMode(mode: AccessMode) {
    setAccessMode(mode);
    setError("");
    setChoices([]);
    setSelectedChoice("");
    const preset = demoProfiles.find((profile) => (mode === "admin" ? profile.role === "admin_master_global" : mode === "empresa" ? profile.role === "company_admin" : mode === "funcionario" ? profile.role === "tecnico" : profile.role === "cliente"));
    if (isDemoMode && preset) {
      setEmail(preset.email);
      setPassword(preset.password);
      setCompanyCode(preset.company_code ?? "");
      setFullName(preset.full_name);
    } else if (mode !== "empresa") {
      setCompanyCode("");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (accessMode === "cliente") {
        router.replace("/portal");
        return;
      }
      if (accessMode === "funcionario") {
        if (isDemoMode) {
          const profile = demoProfiles.find((item) => item.role === "tecnico")!;
          await onStaffAccess({ ...profile, access_type: "staff" }, "demo-staff-token");
          return;
        }
        const result = await signInStaffWithCpf(fullName, cpf, selectedChoice || undefined);
        if (result.requires_company_choice) {
          setChoices(result.companies);
          setError("Encontramos este funcionário em mais de uma empresa. Selecione a empresa correta para continuar.");
          return;
        }
        await onStaffAccess(result.profile, result.token);
        return;
      }
      if (accessMode === "empresa" && !companyCode.trim()) throw new Error("Informe o código da empresa.");
      await onLogin(email, password, accessMode === "admin" ? undefined : companyCode.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setLoading(true);
    setError("");
    try {
      await sendPasswordReset(email);
      setError("E-mail de recuperação enviado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar recuperação.");
    } finally {
      setLoading(false);
    }
  }

  const modeCards: Array<[AccessMode, string, string]> = [
    ["empresa", "Empresa/Admin", "E-mail, senha e código"],
    ["funcionario", "Funcionário", "Nome completo e CPF"],
    ["cliente", "Cliente", "Portal simplificado"],
    ["admin", "Restrito", "Admin Master"]
  ];

  return (
    <main className="rural-pattern flex min-h-screen items-center justify-center px-4 py-8">
      <section className="grid w-full max-w-6xl gap-8 slide-up lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="hidden text-white fade-in lg:block">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/95 p-2 text-forest shadow-soft">
              <Image src={logoSrc} alt="Nex Rural" width={58} height={58} className="h-full w-full object-contain" priority unoptimized onError={(event) => { event.currentTarget.src = "/nex-rural-logo.png"; }} />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-normal">Nex Rural</h1>
              <p className="text-lg font-semibold text-wheat">Gestão documental rural para empresas</p>
            </div>
          </div>
          <p className="max-w-xl text-base leading-7 text-white/85">Acesso escalável para administradores, funcionários e clientes, com separação total por empresa.</p>
        </div>

        <form onSubmit={submit} className="premium-card rounded-2xl bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-white p-2 shadow-sm ring-1 ring-stone-200">
              <Image src={logoSrc} alt="Nex Rural" width={56} height={56} className="h-full w-full object-contain" priority unoptimized onError={(event) => { event.currentTarget.src = "/nex-rural-logo.png"; }} />
            </div>
            <h2 className="text-2xl font-black text-forest">Acesse o Nex Rural</h2>
            <p className="text-sm text-stone-500">Empresa/Admin, Funcionário e Cliente em fluxos separados.</p>
          </div>

          <div className="mb-5 grid gap-2 rounded-xl bg-stone-100 p-1 sm:grid-cols-2 lg:grid-cols-4">
            {modeCards.map(([mode, label, helper]) => (
              <button
                key={mode}
                type="button"
                onClick={() => chooseMode(mode)}
                className={`rounded-lg px-3 py-3 text-left transition ${accessMode === mode ? "bg-forest text-white shadow-sm" : mode === "admin" ? "bg-white/70 text-stone-500 hover:bg-white" : "bg-white text-forest hover:bg-wheat"}`}
              >
                <span className="block text-sm font-black">{label}</span>
                <span className={`block text-xs font-semibold ${accessMode === mode ? "text-white/75" : "text-stone-500"}`}>{helper}</span>
              </button>
            ))}
          </div>

          {accessMode === "cliente" ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-forest">
              Clientes acessam o portal com nome completo e CPF, sem senha ou código manual.
              <button type="button" onClick={() => router.replace("/portal")} className="button-press mt-3 block w-full rounded-lg bg-forest px-4 py-3 font-black text-white transition hover:bg-leaf">
                Acessar portal do cliente
              </button>
            </div>
          ) : accessMode === "funcionario" ? (
            <>
              <label className="mb-4 block">
                <span className="mb-1 block text-sm font-bold text-stone-700">Nome completo</span>
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-3 outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20" placeholder="Nome cadastrado pela empresa" required />
              </label>
              <label className="mb-3 block">
                <span className="mb-1 block text-sm font-bold text-stone-700">CPF</span>
                <input value={cpf} onChange={(event) => setCpf(event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-3 outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20" placeholder="000.000.000-00" inputMode="numeric" required />
              </label>
              {choices.length > 0 && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-sm font-black text-amber-900">Selecione a empresa</p>
                  <div className="grid gap-2">
                    {choices.map((choice) => (
                      <button key={choice.choice_id} type="button" onClick={() => setSelectedChoice(choice.choice_id)} className={`rounded-lg border px-3 py-2 text-left text-sm font-bold ${selectedChoice === choice.choice_id ? "border-forest bg-forest text-white" : "border-stone-200 bg-white text-stone-700"}`}>
                        {choice.display_name} {choice.city || choice.state ? `— ${[choice.city, choice.state].filter(Boolean).join("/")}` : ""} {choice.company_hint ? `(${choice.company_hint})` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <label className="mb-4 block">
                <span className="mb-1 block text-sm font-bold text-stone-700">E-mail</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-3 outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20" type="email" required />
              </label>
              <label className="mb-3 block">
                <span className="mb-1 block text-sm font-bold text-stone-700">Senha</span>
                <input value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-3 outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20" type="password" required />
              </label>
              {accessMode === "empresa" && (
                <label className="mb-3 block">
                  <span className="mb-1 block text-sm font-bold text-stone-700">Código da empresa</span>
                  <input value={companyCode} onChange={(event) => setCompanyCode(event.target.value.replace(/\D/g, ""))} className="w-full rounded-lg border border-stone-200 px-3 py-3 outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20" placeholder="Ex.: 3272026" inputMode="numeric" required />
                </label>
              )}
            </>
          )}

          {error && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">{error}</p>}
          {accessMode !== "cliente" && (
            <button className="button-press w-full rounded-lg bg-forest px-4 py-3 font-black text-white transition hover:bg-leaf disabled:opacity-60" disabled={loading}>
              {loading ? "Validando..." : accessMode === "funcionario" ? "Entrar como funcionário" : accessMode === "admin" ? "Entrar no acesso restrito" : "Entrar"}
            </button>
          )}
          {accessMode !== "funcionario" && accessMode !== "cliente" && (
            <button type="button" onClick={resetPassword} className="mt-3 w-full rounded-lg border border-stone-200 px-4 py-3 text-sm font-black text-forest transition hover:bg-wheat" disabled={loading || !email}>
              Recuperar senha
            </button>
          )}
        </form>
      </section>
    </main>
  );
}

function Dashboard({ rows }: { rows: Record<string, AnyRow[]> }) {
  const clients = rows.clients ?? [];
  const properties = rows.rural_properties ?? [];
  const services = rows.services ?? [];
  const documents = rows.documents ?? [];
  const protocols = rows.protocols ?? [];
  const checks = rows.official_checks ?? [];
  const risks = rows.due_diligence_risks ?? [];
  const finance = rows.financial_entries ?? [];
  const revenue = finance.filter((entry) => /receita/i.test(text(entry.entry_type))).reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
  const receivable = finance.filter((entry) => /receber|vencido/i.test(text(entry.status))).reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
  const chartData = monthlyRevenue.map((row) => ({ ...row, receita: Math.max(row.receita, revenue / 6) }));
  const statusData = serviceStatus.map((row) => ({ ...row, value: services.filter((service) => text(service.status).toLowerCase().includes(row.name.toLowerCase().split(" ")[0])).length || row.value }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clientes ativos" value={String(clients.length)} icon={Users} tone="bg-emerald-50 text-emerald-700" />
        <StatCard label="Imoveis rurais" value={String(properties.length)} icon={Map} tone="bg-lime-50 text-lime-700" />
        <StatCard label="Servicos" value={String(services.length)} icon={ClipboardCheck} tone="bg-sky-50 text-sky-700" />
        <StatCard label="Documentos" value={String(documents.length)} icon={FileText} tone="bg-amber-50 text-amber-700" />
        <StatCard label="Protocolos" value={String(protocols.length)} icon={Landmark} tone="bg-indigo-50 text-indigo-700" />
        <StatCard label="Conferencias vencidas" value={String(checks.filter((item) => /vencido/i.test(text(item.status))).length)} icon={BadgeCheck} tone="bg-red-50 text-red-700" />
        <StatCard label="Receita mapeada" value={currency(revenue)} icon={DollarSign} tone="bg-green-50 text-green-700" />
        <StatCard label="A receber" value={currency(receivable)} icon={AlertTriangle} tone="bg-red-50 text-red-700" />
        <StatCard label="Riscos criticos" value={String(risks.filter((item) => /critico|alto/i.test(text(item.severity))).length)} icon={ShieldCheck} tone="bg-red-50 text-red-700" />
        <StatCard label="Itens no portal" value={String(documents.filter((item) => item.visible_on_portal).length)} icon={Lock} tone="bg-emerald-50 text-emerald-700" />
        <StatCard label="Equipamentos em campo" value={String((rows.field_equipment ?? []).filter((item) => /campo/i.test(text(item.status))).length)} icon={Wrench} tone="bg-sky-50 text-sky-700" />
        <StatCard label="Auditoria" value={String((rows.audit_logs ?? []).length)} icon={Archive} tone="bg-stone-100 text-stone-700" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel title="Receita mensal">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value) => currency(Number(value))} />
                <Area type="monotone" dataKey="receita" stroke="#2f7d4f" fill="#2f7d4f" fillOpacity={0.2} />
                <Area type="monotone" dataKey="despesas" stroke="#c49a45" fill="#c49a45" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Servicos por status">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={4}>
                  {statusData.map((_, index) => (
                    <Cell key={index} fill={["#163b2c", "#2f7d4f", "#c49a45", "#6f8f57"][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <Panel title="Alertas de piloto">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            "Validar usuario cliente A sem acesso ao cliente B",
            "Conferir bucket nex-rural-documents",
            "Executar bootstrap do primeiro Admin Master",
            "Revisar RLS com usuarios reais",
            "Popular biblioteca documental por servico",
            "Definir templates oficiais da empresa"
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              {item}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function DocumentsModule({
  rows,
  profile,
  refresh,
  toast
}: {
  rows: Record<string, AnyRow[]>;
  profile: AuthProfile;
  refresh: () => Promise<void>;
  toast: (message: string, tone?: StatusTone) => void;
}) {
  const [category, setCategory] = useState("Documento rural");
  const [clientId, setClientId] = useState(profile.role === "cliente" ? profile.client_id ?? "" : "");
  const [propertyId, setPropertyId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [visible, setVisible] = useState(profile.role === "cliente");
  const docs = rows.documents ?? [];

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadDocumentFile({
        file,
        companyId: profile.company_id,
        clientId: clientId || undefined,
        propertyId: propertyId || undefined,
        serviceId: serviceId || undefined,
        category,
        uploadedBy: profile.id,
        visibleOnPortal: visible
      });
      await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "upload", entity: "documents", newValue: { name: file.name } });
      toast("Documento enviado para Storage.", "green");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha no upload.", "red");
    } finally {
      event.target.value = "";
    }
  }

  async function updateDoc(row: AnyRow, patch: AnyRow, action: string) {
    await updateRecord("documents", String(row.id), patch, docs);
    await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action, entity: "documents", entityId: String(row.id), oldValue: row, newValue: patch });
    toast("Documento atualizado.", "green");
    await refresh();
  }

  async function download(row: AnyRow) {
    try {
      const url = await downloadDocumentFile(row);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.download = text(row.original_name || row.name);
      link.click();
      await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "download", entity: "documents", entityId: String(row.id) });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha no download.", "red");
    }
  }

  return (
    <Panel
      title="Documentos e Storage"
      subtitle="Upload, download, aprovacao, reprovacao, versionamento e liberacao ao portal."
      action={
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-forest px-3 py-2 text-sm font-black text-white hover:bg-leaf">
          <Upload className="h-4 w-4" />
          Upload
          <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.kml,.geojson" onChange={upload} />
        </label>
      }
    >
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-stone-700">Categoria</span>
          <input value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2.5 outline-none focus:border-leaf" placeholder="Categoria" />
        </label>
        <RelationSelect label="Cliente" value={clientId} options={relationOptionsFor("client_id", rows, profile)} onChange={(value) => { setClientId(value); setPropertyId(""); setServiceId(""); }} placeholder="Selecione o cliente" />
        <RelationSelect label="Imóvel" value={propertyId} options={relationOptionsFor("property_id", { ...rows, rural_properties: (rows.rural_properties ?? []).filter((item) => !clientId || text(item.client_id) === clientId) }, profile)} onChange={setPropertyId} placeholder="Opcional" />
        <RelationSelect label="Serviço" value={serviceId} options={relationOptionsFor("service_id", { ...rows, services: (rows.services ?? []).filter((item) => !clientId || text(item.client_id) === clientId) }, profile)} onChange={setServiceId} placeholder="Opcional" />
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-bold text-stone-700">
          <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} className="h-4 w-4 accent-leaf" />
          Portal
        </label>
      </div>
      <DataTable
        rows={docs}
        columns={["name", "category", "status", "version", "visible_on_portal", "size"]}
        onView={(row) => download(row)}
        onEdit={(row) => updateDoc(row, { status: "Em analise" }, "document_review")}
        onDelete={(row) => {
          softDeleteRecord("documents", String(row.id), docs).then(() => {
            toast("Documento arquivado.", "green");
            return refresh();
          }).catch((err) => toast(err instanceof Error ? err.message : "Falha ao arquivar documento.", "red"));
        }}
        actions={(row) => (
          <>
            <IconButton label="Download" icon={Download} onClick={() => download(row)} />
            <IconButton label="Aprovar" icon={CheckCircle2} tone="success" onClick={() => updateDoc(row, { status: "Aprovado", approved_by: profile.id, approved_at: new Date().toISOString() }, "document_approve")} />
            <IconButton label="Reprovar" icon={X} tone="danger" onClick={() => updateDoc(row, { status: "Reprovado", rejected_reason: "Reprovado no painel" }, "document_reject")} />
            <IconButton label={row.visible_on_portal ? "Ocultar do portal" : "Liberar no portal"} icon={Lock} onClick={() => updateDoc(row, { visible_on_portal: !row.visible_on_portal }, row.visible_on_portal ? "portal_hide" : "portal_release")} />
          </>
        )}
      />
    </Panel>
  );
}

function LeafletMap({ vertices }: { vertices: AnyRow[] }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    async function render() {
      if (!ref.current) return;
      const L = await import("leaflet");
      if (cancelled || !ref.current) return;
      const points = vertices
        .map((item) => [Number(item.latitude), Number(item.longitude)] as [number, number])
        .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
      const center = points[0] ?? [-7.1908, -48.2078];
      const leafletMap = L.map(ref.current, { zoomControl: true }).setView(center, 13);
      map = leafletMap;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
      }).addTo(leafletMap);
      if (points.length > 2) {
        L.polygon(points, { color: "#163b2c", fillColor: "#2f7d4f", fillOpacity: 0.18, weight: 3 }).addTo(leafletMap);
        leafletMap.fitBounds(points);
      }
      points.forEach((point, index) => {
        L.circleMarker(point, { radius: 7, color: "#163b2c", fillColor: "#c49a45", fillOpacity: 1 })
          .addTo(leafletMap)
          .bindTooltip(text(vertices[index]?.code || vertices[index]?.codigo || `V-${index + 1}`), { permanent: true, direction: "top", offset: [0, -8] });
      });
      setTimeout(() => leafletMap.invalidateSize(), 100);
    }
    render();
    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [vertices]);

  return <div ref={ref} className="nex-map-fallback min-h-[420px] overflow-hidden rounded-lg border border-stone-200 bg-[#dfe9dc]" />;
}

function haversine(a: [number, number], b: [number, number]) {
  const earth = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(h));
}

function areaAndPerimeter(vertices: AnyRow[]) {
  const points = vertices
    .map((item) => [Number(item.latitude), Number(item.longitude)] as [number, number])
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  if (points.length < 3) return { areaHa: 0, perimeterM: 0 };
  const lat0 = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const meters = points.map(([lat, lng]) => {
    const x = lng * 111320 * Math.cos((lat0 * Math.PI) / 180);
    const y = lat * 110540;
    return [x, y] as [number, number];
  });
  const area = Math.abs(meters.reduce((sum, point, index) => {
    const next = meters[(index + 1) % meters.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0)) / 2;
  const perimeter = points.reduce((sum, point, index) => sum + haversine(point, points[(index + 1) % points.length]), 0);
  return { areaHa: area / 10000, perimeterM: perimeter };
}

function GeoModule({ rows, profile, refresh, toast }: { rows: Record<string, AnyRow[]>; profile: AuthProfile; refresh: () => Promise<void>; toast: (message: string, tone?: StatusTone) => void }) {
  const tabs = [
    ["visao", "Visao Geral Tecnica"],
    ["mapa", "Mapa"],
    ["importar", "Importar Coordenadas"],
    ["vertices", "Vertices"],
    ["confrontantes", "Confrontantes"],
    ["arquivos", "Arquivos Tecnicos"],
    ["comparacao", "Comparacao de Areas"],
    ["conferencias", "Conferencias Oficiais"],
    ["relatorios", "Relatorios"]
  ] as const;
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("visao");
  const [csv, setCsv] = useState("codigo,latitude,longitude,utmE,utmN,fuso,datum,altitude,confrontante,tipoLimite,observacao\nM-005,-7.2012,-48.2148,790881,9203310,22S,SIRGAS 2000,0,Fazenda Norte,Cerca,Vertice importado\nM-006,-7.2055,-48.2061,791842,9202835,22S,SIRGAS 2000,0,Rio Azul,Natural,Vertice importado");
  const [selectedGeoClientId, setSelectedGeoClientId] = useState("");
  const [selectedGeoPropertyId, setSelectedGeoPropertyId] = useState("");
  const clients = rows.clients ?? [];
  const properties = rows.rural_properties ?? [];
  const selectedGeoProperties = selectedGeoClientId ? properties.filter((item) => text(item.client_id) === selectedGeoClientId) : properties;
  const property = properties.find((item) => text(item.id) === selectedGeoPropertyId) ?? {};
  const propertySelected = Boolean(selectedGeoPropertyId && property.id);
  const vertices = (rows.property_vertices ?? []).filter((row) => propertySelected && text(row.property_id) === selectedGeoPropertyId);
  const geoFiles = (rows.geo_files ?? []).filter((row) => propertySelected && text(row.property_id) === selectedGeoPropertyId);
  const neighbors = (rows.property_neighbors ?? []).filter((row) => !propertySelected || text(row.property_id) === selectedGeoPropertyId);
  const officialChecks = (rows.official_checks ?? []).filter((row) => !propertySelected || text(row.property_id) === selectedGeoPropertyId);
  const comparisons = (rows.technical_area_comparisons ?? []).filter((row) => !propertySelected || text(row.property_id) === selectedGeoPropertyId);
  const reportRows = rows.reports ?? [];
  const reportExports = rows.report_exports ?? [];
  const stats = areaAndPerimeter(vertices);
  const declaredArea = Number(property.declared_area ?? 0);
  const measuredArea = stats.areaHa || Number(property.measured_area ?? 0);
  const registryArea = Number(property.registered_area ?? property.declared_area ?? 0);
  const differenceArea = measuredArea - declaredArea;
  const differencePercent = declaredArea ? (differenceArea / declaredArea) * 100 : 0;
  const comparisonStatus = Math.abs(differencePercent) > 5 ? "Exige conferencia" : "Dentro da tolerancia";

  async function importCsv() {
    if (!propertySelected) {
      toast("Selecione um cliente e um imóvel antes de importar vértices.", "amber");
      return;
    }
    const propertyId = selectedGeoPropertyId;
    const existingCodes = new Set(vertices.filter((row) => row.property_id === propertyId).map((row) => text(row.code || row.codigo).toLowerCase()));
    const batchCodes = new Set<string>();
    const imported = parseCoordinateCsv(csv).map((line, index) => {
      const code = text(line.codigo || `CSV-${index + 1}`);
      return {
        company_id: profile.company_id,
        property_id: propertyId || null,
        code,
        sequence: vertices.length + index + 1,
        latitude: line.latitude,
        longitude: line.longitude,
        utm_e: line.utmE,
        utm_n: line.utmN,
        zone: line.fuso || "22S",
        datum: line.datum || "SIRGAS 2000",
        altitude: line.altitude || 0,
        neighbor_name: line.confrontante,
        marker_type: "Importado",
        boundary_type: line.tipoLimite || "Outro",
        source_format: "CSV",
        notes: line.observacao
      };
    });
    const valid = imported.filter((row) => {
      const code = text(row.code).toLowerCase();
      const ok =
        code &&
        !existingCodes.has(code) &&
        !batchCodes.has(code) &&
        Number.isFinite(row.latitude) &&
        row.latitude >= -90 &&
        row.latitude <= 90 &&
        Number.isFinite(row.longitude) &&
        row.longitude >= -180 &&
        row.longitude <= 180 &&
        text(row.datum);
      if (ok) batchCodes.add(code);
      return ok;
    });
    if (!valid.length) {
      toast("CSV sem vertices validos ou sem codigos unicos para este imovel.", "red");
      return;
    }
    await Promise.all(valid.map((row) => createRecord<AnyRow>("property_vertices", row, vertices)));
    await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "geo_import", entity: "property_vertices", newValue: { count: valid.length } });
    toast(`${valid.length} vertices importados.`, "green");
    await refresh();
  }

  async function uploadGeo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!propertySelected) {
      toast("Selecione um cliente e um imóvel antes de anexar arquivos técnicos.", "amber");
      event.target.value = "";
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!["csv", "kml", "kmz", "geojson", "json", "zip", "shp", "dxf", "dwg", "pdf"].includes(extension)) {
      toast("Formato nao permitido. Use CSV, GeoJSON, KML/KMZ, SHP ZIP, DXF/DWG ou PDF.", "red");
      event.target.value = "";
      return;
    }
    if (!isDemoMode) {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token || (profile.access_type === "staff" ? getStoredStaffToken() : "");
      if (!token) throw new Error("Sessão expirada.");
      const form = new FormData();
      form.append("file", file);
      form.append("client_id", selectedGeoClientId);
      form.append("property_id", selectedGeoPropertyId);
      const response = await fetch("/api/geo-files/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao salvar arquivo técnico.");
    } else {
      await createRecord<AnyRow>("geo_files", {
        company_id: profile.company_id,
        property_id: selectedGeoPropertyId,
        name: file.name,
        file_type: file.name.split(".").pop()?.toUpperCase() || "Arquivo",
        category: extension === "csv" ? "Coordenadas" : extension === "zip" ? "SHP compactado" : "Arquivo geoespacial",
        status: "Recebido",
        visible_on_portal: false,
        notes: "Arquivo técnico importado para conferência.",
        size: file.size
      });
    }
    toast(extension === "csv" ? "Arquivo CSV salvo. Use a importação para processar vértices." : "Arquivo técnico salvo no Storage para conferência.", "green");
    event.target.value = "";
    await refresh();
  }

  async function createAreaComparison() {
    if (!propertySelected) {
      toast("Selecione um imóvel antes de salvar comparação de áreas.", "amber");
      return;
    }
    const comparison = await createRecord<AnyRow>("technical_area_comparisons", {
      company_id: profile.company_id,
      property_id: property.id ?? null,
      property_name: property.name ?? "Imovel rural",
      declared_area: declaredArea,
      measured_area: measuredArea,
      registry_area: registryArea,
      car_area: property.car_area ?? null,
      difference_area: Number(differenceArea.toFixed(4)),
      difference_percent: Number(differencePercent.toFixed(2)),
      tolerance_percent: 5,
      status: comparisonStatus,
      recommended_action: comparisonStatus === "Exige conferencia" ? "Revisar vertices, CAR, matricula e confrontantes." : "Arquivar memoria de calculo no dossie tecnico.",
      checked_at: new Date().toISOString()
    });
    await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "area_compare", entity: "technical_area_comparisons", entityId: String(comparison.id), newValue: comparison });
    toast("Comparacao tecnica salva.", "green");
    await refresh();
  }

  async function createTechnicalPending(row?: AnyRow) {
    if (!propertySelected && !row?.property_id) {
      toast("Selecione um imóvel antes de abrir pendência geotécnica.", "amber");
      return;
    }
    const pending = await createRecord<AnyRow>("pending_items", {
      company_id: profile.company_id,
      property_id: row?.property_id ?? property.id ?? null,
      title: `Conferencia geotecnica - ${text(row?.property_name || property.name || "imovel")}`,
      description: text(row?.recommended_action || "Validar areas, vertices e confrontantes antes da entrega."),
      category: "Geoprocessamento",
      priority: /exige|diverg/i.test(text(row?.status || comparisonStatus)) ? "Alta" : "Media",
      status: "Aberta",
      visible_on_portal: false
    });
    await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "technical_pending_create", entity: "pending_items", entityId: String(pending.id), newValue: pending });
    toast("Pendencia tecnica criada.", "green");
    await refresh();
  }

  async function saveReportHistory(reportType: string, title: string, exportType: "PDF" | "Excel" | "CSV") {
    if (!propertySelected) {
      toast("Selecione um imóvel antes de registrar relatório técnico.", "amber");
      return;
    }
    const report = await createRecord<AnyRow>("reports", {
      company_id: profile.company_id,
      report_type: reportType,
      title,
      property_id: property.id ?? null,
      client_id: property.client_id ?? null,
      status: "Gerado",
      generated_by_name: profile.full_name,
      generated_at: new Date().toISOString()
    });
    await createRecord<AnyRow>("report_exports", {
      company_id: profile.company_id,
      report_id: report.id,
      export_type: exportType,
      file_name: `nex-rural-${title.toLowerCase().replace(/\s+/g, "-")}.${exportType === "Excel" ? "xls" : exportType.toLowerCase()}`,
      status: "Disponivel"
    });
    await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "report_export", entity: "reports", entityId: String(report.id) });
  }

  async function technicalDossier() {
    if (!propertySelected) {
      toast("Selecione um imóvel antes de gerar o dossiê técnico.", "amber");
      return;
    }
    const dossierRows = [property, ...comparisons, ...vertices.slice(0, 8), ...neighbors.slice(0, 4), ...officialChecks.slice(0, 4)].filter(Boolean);
    await exportRowsPdf("dossie-tecnico-georreferenciado", dossierRows);
    await saveReportHistory("Dossie tecnico georreferenciado", "dossie-tecnico-georreferenciado", "PDF");
    toast("Dossie tecnico gerado e registrado.", "green");
    await refresh();
  }

  async function toggleGeoPortal(row: AnyRow) {
    await updateRecord("geo_files", String(row.id), { visible_on_portal: !row.visible_on_portal }, geoFiles);
    await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: row.visible_on_portal ? "geo_portal_hide" : "geo_portal_release", entity: "geo_files", entityId: String(row.id) });
    toast(row.visible_on_portal ? "Arquivo ocultado do portal." : "Arquivo liberado no portal.", "green");
    await refresh();
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Central Tecnica do Imovel Rural"
        subtitle="Geoprocessamento premium com mapa, importacao, vertices, confrontantes, arquivos, comparacao e relatorios."
        action={
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-forest px-3 py-2 text-sm font-black text-white hover:bg-leaf">
            <Upload className="h-4 w-4" />
            Anexar arquivo
            <input type="file" className="hidden" accept=".kml,.kmz,.geojson,.json,.csv,.zip,.shp,.dxf,.dwg,.pdf" onChange={uploadGeo} />
          </label>
        }
      >
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-sm font-black text-amber-900">Seleção obrigatória para evitar salvar dados técnicos no imóvel errado.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <RelationSelect label="Cliente" value={selectedGeoClientId} options={clients.map((item) => ({ id: text(item.id), label: pickRowTitle(item), description: text(item.cpf_cnpj || item.phone) }))} onChange={(value) => { setSelectedGeoClientId(value); setSelectedGeoPropertyId(""); }} />
            <RelationSelect label="Imóvel" value={selectedGeoPropertyId} options={selectedGeoProperties.map((item) => ({ id: text(item.id), label: pickRowTitle(item), description: [item.municipality || item.city, item.state].map(text).filter(Boolean).join("/") }))} onChange={setSelectedGeoPropertyId} />
          </div>
          {!propertySelected && <p className="mt-3 rounded-lg bg-white p-3 text-sm font-semibold text-amber-900">Selecione um cliente e um imóvel antes de importar vértices, anexar arquivos, comparar áreas ou gerar relatórios.</p>}
          <p className="mt-3 text-xs font-bold text-amber-900">Cálculo aproximado para apoio operacional. Não substitui software técnico, ART/RRT, memorial descritivo ou validação oficial.</p>
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg border px-3 py-2 text-sm font-black transition ${tab === id ? "border-forest bg-forest text-white" : "border-stone-200 bg-white text-stone-700 hover:bg-wheat"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "visao" && (
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label="Vertices validos" value={String(vertices.length)} icon={MapPinned} tone="bg-emerald-50 text-emerald-700" />
              <StatCard label="Confrontantes" value={String(neighbors.length)} icon={Users} tone="bg-sky-50 text-sky-700" />
              <StatCard label="Area calculada" value={`${measuredArea.toFixed(2)} ha`} icon={Map} tone="bg-lime-50 text-lime-700" />
              <StatCard label="Perimetro" value={`${stats.perimeterM.toFixed(0)} m`} icon={Compass} tone="bg-amber-50 text-amber-700" />
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
              <h3 className="mb-3 font-black text-forest">{text(property.name || "Imovel principal")}</h3>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                {[
                  ["Municipio", property.municipality],
                  ["UF", property.state],
                  ["Matricula", property.registry_number],
                  ["CAR", property.car],
                  ["CCIR", property.ccir],
                  ["SIGEF", property.sigef],
                  ["Area declarada", `${declaredArea.toFixed(2)} ha`],
                  ["Diferenca", `${differenceArea.toFixed(2)} ha (${differencePercent.toFixed(2)}%)`]
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg bg-white p-3">
                    <p className="font-bold text-stone-500">{String(label)}</p>
                    <p className="font-black text-forest">{formatCell(value)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <AppButton icon={BadgeCheck} onClick={createAreaComparison}>
                  Salvar comparacao
                </AppButton>
                <AppButton icon={AlertTriangle} variant="secondary" onClick={() => createTechnicalPending()}>
                  Abrir pendencia
                </AppButton>
                <AppButton icon={FileText} variant="secondary" onClick={technicalDossier}>
                  Dossie PDF
                </AppButton>
              </div>
            </div>
          </div>
        )}

        {tab === "mapa" && (
          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
            <LeafletMap vertices={vertices} />
            <div className="grid gap-3">
              <StatCard label="Area aproximada" value={`${stats.areaHa.toFixed(2)} ha`} icon={Map} tone="bg-lime-50 text-lime-700" />
              <StatCard label="Perimetro aproximado" value={`${stats.perimeterM.toFixed(0)} m`} icon={Compass} tone="bg-amber-50 text-amber-700" />
              <StatCard label="Datum dominante" value={text(vertices[0]?.datum || "SIRGAS 2000")} icon={MapPinned} tone="bg-emerald-50 text-emerald-700" />
            </div>
          </div>
        )}

        {tab === "importar" && (
          <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-stone-700">CSV de coordenadas</span>
              <textarea value={csv} onChange={(event) => setCsv(event.target.value)} className="min-h-72 w-full rounded-lg border border-stone-200 p-3 text-sm outline-none focus:border-leaf" />
            </label>
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
              <h3 className="font-black text-forest">Validacao de importacao</h3>
              <p className="mt-2 text-sm font-semibold text-stone-600">Campos esperados: codigo, latitude, longitude, utmE, utmN, datum, observacao.</p>
              <div className="mt-4 grid gap-2 text-sm font-bold text-stone-700">
                {["CSV de coordenadas", "GeoJSON", "KML/KMZ", "SHP compactado em ZIP", "DXF/DWG/PDF tecnico"].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-lg bg-white p-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <AppButton icon={Upload} onClick={importCsv}>
                  Importar vertices
                </AppButton>
                <AppButton icon={Download} variant="secondary" onClick={() => exportCsv("nex-rural-vertices.csv", vertices)}>
                  Exportar CSV
                </AppButton>
              </div>
            </div>
          </div>
        )}

        {tab === "vertices" && (
          <DataTable
            rows={vertices}
            columns={["code", "sequence", "latitude", "longitude", "utm_e", "utm_n", "datum", "zone", "boundary_type", "neighbor_name"]}
            onView={(row) => exportRowsPdf(text(row.code), [row])}
            actions={(row) => <IconButton label="Criar pendencia" icon={AlertTriangle} onClick={() => createTechnicalPending(row)} />}
          />
        )}

        {tab === "confrontantes" && (
          <DataTable
            rows={neighbors}
            columns={["name", "document", "property_name", "phone", "email", "consent_status", "boundary_section", "responsible_name"]}
            onView={(row) => exportRowsPdf(text(row.name), [row])}
          />
        )}

        {tab === "arquivos" && (
          <DataTable
            rows={geoFiles}
            columns={["name", "file_type", "category", "status", "visible_on_portal", "size", "notes"]}
            onView={(row) => exportRowsPdf(text(row.name), [row])}
            actions={(row) => <IconButton label={row.visible_on_portal ? "Ocultar portal" : "Liberar portal"} icon={Lock} onClick={() => toggleGeoPortal(row)} />}
          />
        )}

        {tab === "comparacao" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <AppButton icon={BadgeCheck} onClick={createAreaComparison}>
                Nova comparacao
              </AppButton>
              <AppButton icon={Download} variant="secondary" onClick={() => exportExcel("nex-rural-comparacao-areas.xls", comparisons)}>
                Excel
              </AppButton>
              <AppButton icon={FileText} variant="secondary" onClick={() => exportRowsPdf("comparacao-de-areas", comparisons)}>
                PDF
              </AppButton>
            </div>
            <DataTable
              rows={comparisons}
              columns={["property_name", "declared_area", "measured_area", "registry_area", "car_area", "difference_area", "difference_percent", "status", "recommended_action"]}
              onView={(row) => exportRowsPdf(text(row.property_name), [row])}
              actions={(row) => <IconButton label="Criar pendencia" icon={AlertTriangle} onClick={() => createTechnicalPending(row)} />}
            />
          </div>
        )}

        {tab === "conferencias" && (
          <DataTable
            rows={officialChecks}
            columns={["platform", "check_type", "property_name", "checked_at", "responsible_name", "result", "divergences", "status"]}
            onView={(row) => exportRowsPdf(text(row.platform), [row])}
          />
        )}

        {tab === "relatorios" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <AppButton icon={FileText} onClick={technicalDossier}>
                Dossie tecnico PDF
              </AppButton>
              <AppButton icon={Download} variant="secondary" onClick={() => exportCsv("nex-rural-relatorios.csv", reportRows)}>
                Relatorios CSV
              </AppButton>
              <AppButton icon={FileStack} variant="secondary" onClick={() => exportExcel("nex-rural-relatorios.xls", [...reportRows, ...reportExports])}>
                Historico Excel
              </AppButton>
            </div>
            <DataTable rows={reportRows} columns={["report_type", "title", "property_id", "status", "generated_by_name", "generated_at"]} onView={(row) => exportRowsPdf(text(row.title), [row])} />
            <DataTable rows={reportExports} columns={["report_id", "export_type", "file_name", "status", "created_at"]} />
          </div>
        )}
      </Panel>
    </div>
  );
}



function getClientSpouse(client: AnyRow, spouseRows: AnyRow[] = []) {
  const embedded = text(client.spouse_full_name || client.spouse_cpf || client.spouse_phone || client.spouse_email);
  if (embedded) {
    return {
      id: text(client.spouse_id || `embedded-${client.id}`),
      client_id: text(client.id),
      full_name: client.spouse_full_name || "",
      cpf: client.spouse_cpf || "",
      rg: client.spouse_rg || "",
      issuing_agency: client.spouse_issuing_agency || "",
      birth_date: client.spouse_birth_date || "",
      nationality: client.spouse_nationality || "",
      profession: client.spouse_profession || "",
      marital_status: client.marital_status || "",
      marriage_regime: client.marriage_regime || "",
      marriage_date: client.marriage_date || "",
      phone: client.spouse_phone || "",
      whatsapp: client.spouse_whatsapp || "",
      email: client.spouse_email || "",
      address: client.spouse_address || "",
      notes: client.spouse_notes || ""
    } as unknown as AnyRow;
  }
  return spouseRows.find((item) => item.client_id === client.id && item.deleted_at == null && item.active !== false) || null;
}

async function fileToDataUrlBrowser(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function chooseImageFile() {
  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/jpg,image/webp";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

async function loadImageDataUrlFromSource(source?: unknown) {
  const raw = text(source);
  if (!raw) return null;
  if (raw.startsWith("data:image/")) return raw;
  try {
    const response = await fetch(raw, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function getClientDisplay(row: AnyRow) {
  return text(row.name || row.full_name || row.email || row.document || row.id);
}

function clientRowsForExport(clientRows: AnyRow[], tagRows: AnyRow[], clientTagRows: AnyRow[], spouseRows: AnyRow[]) {
  return clientRows.map((client) => {
    const tags = clientTagRows
      .filter((item) => item.client_id === client.id)
      .map((link) => tagRows.find((tag) => tag.id === link.tag_id)?.name)
      .filter(Boolean)
      .join(", ");
    const spouse = getClientSpouse(client, spouseRows);
    return {
      Nome: getClientDisplay(client),
      Documento: client.document || client.cpf_cnpj || "",
      Telefone: client.phone || "",
      WhatsApp: client.whatsapp || "",
      Email: client.email || "",
      Cidade: client.city || "",
      UF: client.state || "",
      Tipo: client.type || "",
      Tags: tags || client.tags_summary || "",
      Conjuge: spouse?.full_name || "",
      CPFConjuge: spouse?.cpf || "",
      TelefoneConjuge: spouse?.phone || "",
      EmailConjuge: spouse?.email || "",
      Status: client.status || "",
      CadastradoEm: client.created_at || ""
    };
  });
}

async function exportClientSheetPdf(client: AnyRow, rows: Record<string, AnyRow[]>) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const spouse = getClientSpouse(client, rows.client_spouses ?? []);
  const properties = (rows.rural_properties ?? []).filter((item) => item.client_id === client.id);
  const services = (rows.services ?? []).filter((item) => item.client_id === client.id);
  const pendings = (rows.pending_items ?? []).filter((item) => item.client_id === client.id);
  const tagRows = rows.tags ?? [];
  const tags = (rows.client_tags ?? [])
    .filter((item) => item.client_id === client.id)
    .map((link) => tagRows.find((tag) => tag.id === link.tag_id)?.name)
    .filter(Boolean);

  doc.setFillColor(22, 59, 44);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("Nex Rural", 14, 14);
  doc.setFontSize(11);
  doc.text("Ficha cadastral do cliente", 14, 24);
  doc.setTextColor(22, 59, 44);

  let y = 46;
  doc.setFontSize(16);
  doc.text(getClientDisplay(client), 14, y);
  y += 8;
  doc.setFontSize(9);
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, 14, y);
  y += 10;

  const section = (title: string) => {
    doc.setFillColor(247, 244, 236);
    doc.roundedRect(14, y, pageWidth - 28, 8, 2, 2, "F");
    doc.setFontSize(10);
    doc.setTextColor(22, 59, 44);
    doc.text(title, 18, y + 5.5);
    y += 13;
  };
  const line = (label: string, value: unknown) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setTextColor(100, 93, 83);
    doc.text(label, 14, y);
    doc.setTextColor(22, 59, 44);
    doc.text(formatCell(value).slice(0, 92), 60, y);
    y += 6;
  };

  section("Dados principais");
  line("Nome", getClientDisplay(client));
  line("Documento", client.document || client.cpf_cnpj);
  line("Tipo", client.type);
  line("Telefone", client.phone);
  line("WhatsApp", client.whatsapp);
  line("E-mail", client.email);
  line("Endereco", client.address);
  line("Cidade/UF", `${client.city ?? ""} ${client.state ?? ""}`.trim());
  line("Tags", tags.join(", ") || client.tags_summary || "-");

  section("Conjuge");
  if (spouse) {
    line("Nome", spouse.full_name);
    line("CPF", spouse.cpf);
    line("RG", spouse.rg);
    line("Regime", spouse.marriage_regime);
    line("Telefone", spouse.phone);
    line("E-mail", spouse.email);
  } else {
    line("Status", "Conjuge nao cadastrado ou nao aplicavel.");
  }

  section("Imoveis e processos");
  line("Qtd. imoveis", properties.length);
  line("Qtd. servicos", services.length);
  line("Pendencias", pendings.length);
  properties.slice(0, 5).forEach((property, index) => line(`Imovel ${index + 1}`, `${property.name ?? property.id} - ${property.municipality ?? ""}/${property.state ?? ""}`));

  section("Observacoes para dossie");
  line("Publicas", client.notes_public || client.notes || "-");
  line("Internas", client.notes_private ? "Registradas no sistema interno" : "-");

  doc.setDrawColor(216, 193, 142);
  doc.line(14, 282, pageWidth - 14, 282);
  doc.setFontSize(8);
  doc.setTextColor(100, 93, 83);
  doc.text("Ficha gerada pelo Nex Rural para conferencia e montagem de dossie.", 14, 288);
  doc.save(`ficha-cliente-${getClientDisplay(client).toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.pdf`);
}


async function exportClientDossierPdf(client: AnyRow, rows: Record<string, AnyRow[]>, options: { includeSpouse: boolean }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const company = (rows.companies ?? []).find((item) => item.id === client.company_id) ?? (rows.companies ?? [])[0] ?? {};
  const spouse = options.includeSpouse ? getClientSpouse(client, rows.client_spouses ?? []) : null;
  const properties = (rows.rural_properties ?? []).filter((item) => item.client_id === client.id);
  const services = (rows.services ?? []).filter((item) => item.client_id === client.id);
  const documents = (rows.documents ?? []).filter((item) => item.client_id === client.id);
  const pendings = (rows.pending_items ?? []).filter((item) => item.client_id === client.id);
  const checklists = (rows.generated_checklists ?? []).filter((item) => item.client_id === client.id);
  const checklistIds = new Set(checklists.map((item) => text(item.id)));
  const checklistItems = (rows.generated_checklist_items ?? []).filter((item) => checklistIds.has(text(item.generated_checklist_id)));
  const financial = (rows.financial_entries ?? []).filter((item) => item.client_id === client.id);
  const tagRows = rows.tags ?? [];
  const tags = (rows.client_tags ?? [])
    .filter((item) => item.client_id === client.id)
    .map((link) => tagRows.find((tag) => tag.id === link.tag_id)?.name)
    .filter(Boolean) as string[];

  let photoDataUrl: string | null = await loadImageDataUrlFromSource(client.photo_url);
  if (!photoDataUrl && client.photo_storage_path) {
    try {
      const signed = await downloadDocumentFile({ storage_path: client.photo_storage_path });
      photoDataUrl = await loadImageDataUrlFromSource(signed);
    } catch {
      photoDataUrl = null;
    }
  }

  const titleColor: [number, number, number] = [22, 59, 44];
  const gold: [number, number, number] = [191, 157, 92];
  const beige: [number, number, number] = [247, 244, 236];
  let y = 0;

  function header(title: string, subtitle?: string) {
    doc.setFillColor(...titleColor);
    doc.rect(0, 0, pageWidth, 34, "F");
    doc.setFillColor(...gold);
    doc.rect(0, 33, pageWidth, 1.2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text(title, margin, 14);
    doc.setFontSize(8.5);
    doc.text(subtitle || `Emitido em ${new Date().toLocaleString("pt-BR")}`, margin, 24, { maxWidth: pageWidth - 28 });
    doc.setTextColor(...titleColor);
    y = 46;
  }

  function footer() {
    doc.setDrawColor(216, 193, 142);
    doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 93, 83);
    doc.text("Dossie gerado pelo Nex Rural para apoio administrativo, documental e cartorial.", margin, pageHeight - 10);
    doc.text(`Pagina ${doc.getNumberOfPages()}`, pageWidth - margin - 18, pageHeight - 10);
  }

  function ensureSpace(size = 18) {
    if (y + size > pageHeight - 24) {
      footer();
      doc.addPage();
      header("Nex Rural - Dossie do Cliente", getClientDisplay(client));
    }
  }

  function section(title: string) {
    ensureSpace(18);
    doc.setFillColor(...beige);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 9, 2, 2, "F");
    doc.setFontSize(10);
    doc.setTextColor(...titleColor);
    doc.text(title, margin + 4, y + 6);
    y += 14;
  }

  function line(label: string, value: unknown) {
    ensureSpace(8);
    doc.setFontSize(8.7);
    doc.setTextColor(100, 93, 83);
    doc.text(label, margin, y);
    doc.setTextColor(...titleColor);
    doc.text(formatCell(value || "-").slice(0, 100), margin + 48, y, { maxWidth: pageWidth - margin * 2 - 50 });
    y += 6.2;
  }

  function table(title: string, tableRows: AnyRow[], columns: string[]) {
    section(title);
    if (!tableRows.length) {
      line("Status", "Nenhum registro vinculado.");
      return;
    }
    tableRows.slice(0, 12).forEach((row, index) => {
      ensureSpace(8);
      doc.setFontSize(8.2);
      doc.setTextColor(...titleColor);
      const values = columns.map((col) => formatCell(row[col])).filter(Boolean).join("  |  ");
      doc.text(`${index + 1}. ${values || pickRowTitle(row)}`, margin, y, { maxWidth: pageWidth - margin * 2 });
      y += 6;
    });
  }

  header("Nex Rural - Dossie do Cliente", `${getClientDisplay(client)} • ${text(company.trade_name || company.name || "Empresa")}`);
  doc.setFontSize(21);
  doc.setTextColor(...titleColor);
  doc.text("Dossie cadastral e operacional", margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(100, 93, 83);
  doc.text("Documento corporativo para conferencia de cadastro, atendimento, pendencias, documentos e montagem de dossie fisico ou digital.", margin, y, { maxWidth: 130 });
  if (photoDataUrl) {
    try {
      doc.setDrawColor(...gold);
      doc.roundedRect(pageWidth - 62, y - 14, 40, 48, 3, 3);
      doc.addImage(photoDataUrl, photoDataUrl.includes("image/png") ? "PNG" : "JPEG", pageWidth - 60, y - 12, 36, 44, undefined, "FAST");
    } catch {
      doc.setFontSize(8);
      doc.text("Foto cadastrada indisponivel para impressao.", pageWidth - 65, y, { maxWidth: 48 });
    }
  } else {
    doc.setDrawColor(...gold);
    doc.roundedRect(pageWidth - 62, y - 14, 40, 48, 3, 3);
    doc.setFontSize(8);
    doc.setTextColor(130, 120, 105);
    doc.text("Sem foto", pageWidth - 51, y + 8);
  }
  y += 28;

  section("1. Dados do cliente");
  line("Nome", getClientDisplay(client));
  line("Documento", client.document || client.cpf_cnpj);
  line("Tipo", client.type);
  line("Telefone", client.phone);
  line("WhatsApp", client.whatsapp);
  line("E-mail", client.email);
  line("Endereco", client.address);
  line("Cidade/UF", `${client.city ?? ""}/${client.state ?? ""}`);
  line("Estado civil", client.marital_status);
  line("Regime", client.marriage_regime);
  line("Tags", tags.join(", ") || client.tags_summary || "-");

  if (options.includeSpouse) {
    section("2. Dados do conjuge");
    if (spouse) {
      line("Nome", spouse.full_name);
      line("CPF", spouse.cpf);
      line("RG", spouse.rg);
      line("Orgao emissor", spouse.issuing_agency);
      line("Nascimento", spouse.birth_date ? dateBR(String(spouse.birth_date)) : "-");
      line("Nacionalidade", spouse.nationality);
      line("Profissao", spouse.profession);
      line("Telefone", spouse.phone);
      line("WhatsApp", spouse.whatsapp);
      line("E-mail", spouse.email);
      line("Endereco", spouse.address);
      line("Observacoes", spouse.notes);
    } else {
      line("Status", "Cliente sem conjuge cadastrado ou nao aplicavel.");
    }
  }

  table("3. Imoveis vinculados", properties, ["name", "municipality", "state", "measured_area", "registry_number"]);
  table("4. Servicos e processos", services, ["service_type", "status", "priority", "expected_end_date"]);
  table("5. Checklists documentais", checklists, ["title", "status", "progress_percent"]);
  table("6. Documentos solicitados/validados", checklistItems, ["document_name", "status", "required"]);
  table("7. Documentos do cliente", documents, ["name", "category", "status", "version"]);
  table("8. Pendencias", pendings, ["title", "category", "status", "due_date"]);
  table("9. Financeiro", financial, ["entry_type", "category", "amount", "due_date", "status"]);

  section("10. Observacoes e fechamento");
  line("Observacoes publicas", client.notes_public || client.notes || "-");
  line("Observacoes internas", client.notes_private ? "Existem observacoes internas registradas no sistema." : "-");
  y += 8;
  ensureSpace(30);
  doc.setDrawColor(...gold);
  doc.line(margin, y, margin + 75, y);
  doc.line(pageWidth - margin - 75, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(100, 93, 83);
  doc.text("Responsavel pela conferencia", margin, y);
  doc.text("Cliente / representante", pageWidth - margin - 75, y);

  footer();
  doc.save(`dossie-cliente-${getClientDisplay(client).toLowerCase().replace(/[^a-z0-9]+/gi, "-")}${options.includeSpouse ? "-com-conjuge" : ""}.pdf`);
}


function exportClientDossierExcel(client: AnyRow, rows: Record<string, AnyRow[]>, options: { includeSpouse: boolean }) {
  const spouse = options.includeSpouse ? getClientSpouse(client, rows.client_spouses ?? []) : null;
  const properties = (rows.rural_properties ?? []).filter((item) => item.client_id === client.id);
  const services = (rows.services ?? []).filter((item) => item.client_id === client.id);
  const documents = (rows.documents ?? []).filter((item) => item.client_id === client.id);
  const pendings = (rows.pending_items ?? []).filter((item) => item.client_id === client.id);
  const checklists = (rows.generated_checklists ?? []).filter((item) => item.client_id === client.id);
  const checklistIds = new Set(checklists.map((item) => text(item.id)));
  const checklistItems = (rows.generated_checklist_items ?? []).filter((item) => checklistIds.has(text(item.generated_checklist_id)));
  const financial = (rows.financial_entries ?? []).filter((item) => item.client_id === client.id);
  const sheets: Record<string, AnyRow[]> = {
    Resumo: [{ Cliente: getClientDisplay(client), Documento: client.document || client.cpf_cnpj || "", Status: client.status || "", "Possui cônjuge": client.has_spouse ? "Sim" : "Não", "Qtd. imóveis": properties.length, "Qtd. serviços": services.length, "Qtd. documentos": documents.length, "Qtd. pendências": pendings.length }],
    Cliente: clientRowsForExport([client], rows.tags ?? [], rows.client_tags ?? [], rows.client_spouses ?? []),
    Imoveis: properties.map((item) => ({ Nome: item.name, Municipio: item.municipality, UF: item.state, Area: item.measured_area, Matricula: item.registry_number, CAR: item.car, CCIR: item.ccir, Status: item.documental_status })),
    Servicos: services.map((item) => ({ Tipo: item.service_type, Status: item.status, Prioridade: item.priority, Responsavel: item.responsible_name, Previsao: item.expected_end_date })),
    Checklists: checklists.map((item) => ({ Titulo: item.title, Status: item.status, Progresso: item.progress_percent, Portal: item.visible_on_portal ? "Sim" : "Não" })),
    Documentos: documents.map((item) => ({ Nome: item.name || item.original_name, Categoria: item.category, Status: item.status, Versao: item.version })),
    Pendencias: pendings.map((item) => ({ Titulo: item.title, Categoria: item.category, Status: item.status, Prazo: item.due_date, Prioridade: item.priority })),
    Financeiro: financial.map((item) => ({ Tipo: item.entry_type, Categoria: item.category, Valor: item.amount, Vencimento: item.due_date, Status: item.status }))
  };
  if (spouse) sheets["Conjuge"] = [{ Nome: spouse.full_name, CPF: spouse.cpf, RG: spouse.rg, Telefone: spouse.phone, WhatsApp: spouse.whatsapp, Email: spouse.email, Regime: spouse.marriage_regime }];

  const escapeHtml = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const sheetHtml = Object.entries(sheets)
    .map(([name, sheetRows]) => {
      const cols = Object.keys(sheetRows[0] ?? { Informação: "Sem registros" });
      const rowsToRender = sheetRows.length ? sheetRows : [{ Informação: "Sem registros" }];
      return `<h2>${escapeHtml(name)}</h2><table><thead><tr>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>${rowsToRender.map((row) => `<tr>${cols.map((c) => `<td>${escapeHtml(formatCell(row[c]))}</td>`).join("")}</tr>`).join("")}</tbody></table><br/>`;
    })
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"/><style>body{font-family:Arial,sans-serif;color:#163b2c}h1{color:#163b2c}h2{margin-top:24px;color:#163b2c}table{border-collapse:collapse;width:100%;margin-bottom:16px}th{background:#163b2c;color:#fff;text-align:left}td,th{border:1px solid #d8c18e;padding:8px;vertical-align:top}tr:nth-child(even) td{background:#f7f4ec}.meta{color:#6b6256}</style></head><body><h1>Dossiê do Cliente - Nex Rural</h1><p class="meta">Cliente: ${escapeHtml(getClientDisplay(client))} • Emitido em ${new Date().toLocaleString("pt-BR")}</p>${sheetHtml}</body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dossie-cliente-${getClientDisplay(client).toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

async function generateChecklistFromTemplate(input: {
  profile: AuthProfile;
  template: AnyRow;
  clientId?: string | null;
  propertyId?: string | null;
  serviceId?: string | null;
  title?: string;
  templateItems: AnyRow[];
  existingChecklists: AnyRow[];
  existingItems: AnyRow[];
}) {
  const checklist = await createRecord<AnyRow>("generated_checklists", {
    company_id: input.profile.company_id,
    template_id: input.template.id,
    client_id: input.clientId || null,
    property_id: input.propertyId || null,
    service_id: input.serviceId || null,
    title: input.title || `Checklist - ${input.template.name || input.template.procedure_type || "Procedimento"}`,
    status: "Em andamento",
    progress_percent: 0,
    visible_on_portal: false,
    created_by: input.profile.id
  }, input.existingChecklists);

  const items = input.templateItems.filter((item) => item.template_id === input.template.id && item.active !== false).sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
  await Promise.all(items.map((item, index) => createRecord<AnyRow>("generated_checklist_items", {
    company_id: input.profile.company_id,
    generated_checklist_id: checklist.id,
    template_item_id: item.id,
    client_id: input.clientId || null,
    document_name: item.document_name,
    description: item.description,
    required: item.required !== false,
    status: item.visible_to_client ? "Solicitado ao cliente" : "Pendente",
    responsible_type: item.who_provides || "Cliente",
    visible_to_client: item.visible_to_client !== false,
    portal_instruction: item.portal_instruction,
    internal_notes: item.internal_instruction,
    sort_order: item.sort_order ?? index + 1
  }, input.existingItems)));
  return { checklist, count: items.length };
}

function ReportsModule({ rows, auditRows }: { rows: Record<string, AnyRow[]>; auditRows: AnyRow[] }) {
  const [dossierClientId, setDossierClientId] = useState("");
  const [dossierPropertyId, setDossierPropertyId] = useState("");
  const dossierClients = rows.clients ?? [];
  const dossierProperties = (rows.rural_properties ?? []).filter((item) => !dossierClientId || text(item.client_id) === dossierClientId);
  const reports = [
    { label: "clientes ativos", table: "clients", icon: Users },
    { label: "imoveis por municipio", table: "rural_properties", icon: Map },
    { label: "servicos por status", table: "services", icon: ClipboardCheck },
    { label: "documentos pendentes", table: "documents", icon: FileText },
    { label: "protocolos por orgao", table: "protocols", icon: Landmark },
    { label: "due diligence por risco", table: "due_diligence_risks", icon: ShieldCheck },
    { label: "conferencias vencidas", table: "official_checks", icon: BadgeCheck },
    { label: "comparacao de areas", table: "technical_area_comparisons", icon: Compass },
    { label: "relatorios gerados", table: "reports", icon: FileStack },
    { label: "AGED por produtor", table: "aged_producer_registrations", icon: Sprout },
    { label: "ITERMA por etapa", table: "iterma_cases", icon: Landmark },
    { label: "financeiro por periodo", table: "financial_entries", icon: DollarSign }
  ];

  async function ruralDossier() {
    const property = dossierProperties.find((item) => text(item.id) === dossierPropertyId);
    const client = dossierClients.find((item) => text(item.id) === dossierClientId);
    if (!client || !property) return;
    const missing = [
      !text(client.cpf_cnpj || client.document) ? "CPF/CNPJ do cliente" : "",
      !text(property.registry_number || property.registration_number) ? "Matrícula do imóvel" : "",
      !text(property.car || property.car_number) ? "CAR do imóvel" : ""
    ].filter(Boolean);
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Nex Rural - Dossiê Rural", 14, 18);
    doc.setFontSize(10);
    doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, 14, 28);
    const scopedDocs = (rows.documents ?? []).filter((item) => text(item.client_id) === text(client.id) && (!property.id || text(item.property_id) === text(property.id)));
    const scopedProtocols = (rows.protocols ?? []).filter((item) => text(item.client_id) === text(client.id) && (!property.id || text(item.property_id) === text(property.id)));
    const scopedChecks = (rows.official_checks ?? []).filter((item) => !property.id || text(item.property_id) === text(property.id));
    const scopedPending = (rows.pending_items ?? []).filter((item) => text(item.client_id) === text(client.id) && (!property.id || text(item.property_id) === text(property.id)));
    const lines = [
      `Empresa: Nex Rural`,
      `Cliente: ${pickRowTitle(client)}`,
      `Documento: ${text(client.cpf_cnpj || client.document) || "Não informado"}`,
      `Imóvel: ${pickRowTitle(property)}`,
      `Município/UF: ${text(property.municipality || property.city)}/${text(property.state)}`,
      `Área medida: ${text(property.measured_area || property.area_total) || "Não informada"} ha`,
      `Matrícula: ${text(property.registry_number || property.registration_number) || "Não informada"}`,
      `CAR: ${text(property.car || property.car_number) || "Não informado"}`,
      `CCIR: ${text(property.ccir || property.ccir_number) || "Não informado"}`,
      `SIGEF: ${text(property.sigef || property.sigef_number) || "Não informado"}`,
      `Documentos vinculados: ${scopedDocs.length}`,
      `Protocolos vinculados: ${scopedProtocols.length}`,
      `Conferências oficiais: ${scopedChecks.length}`,
      `Pendências: ${scopedPending.length}`,
      missing.length ? `Atenção: dados faltantes — ${missing.join(", ")}.` : `Conferência: dados essenciais preenchidos.`,
      `Conclusão: dossiê gerado com seleção explícita de cliente e imóvel.`
    ];
    lines.forEach((line, index) => doc.text(line, 14, 44 + index * 8));
    doc.save(`nex-rural-dossie-${pickRowTitle(client).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Central de relatorios"
        subtitle="Relatorios reais por tabela, PDF, CSV e Excel."
        action={
          <div className="grid w-full gap-2 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_auto]">
            <RelationSelect label="Cliente do dossiê" value={dossierClientId} options={dossierClients.map((item) => ({ id: text(item.id), label: pickRowTitle(item), description: text(item.cpf_cnpj || item.phone) }))} onChange={(value) => { setDossierClientId(value); setDossierPropertyId(""); }} />
            <RelationSelect label="Imóvel do dossiê" value={dossierPropertyId} options={dossierProperties.map((item) => ({ id: text(item.id), label: pickRowTitle(item), description: [item.municipality || item.city, item.state].map(text).filter(Boolean).join("/") }))} onChange={setDossierPropertyId} />
            <AppButton icon={FileText} onClick={ruralDossier} disabled={!dossierClientId || !dossierPropertyId}>
              Gerar Dossiê
            </AppButton>
            <AppButton icon={Archive} variant="secondary" onClick={() => exportRowsPdf("auditoria", auditRows)}>
              Auditoria PDF
            </AppButton>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => {
            const Icon = report.icon;
            const reportRows = rows[report.table] ?? [];
            return (
              <div key={report.label} className="rounded-lg border border-stone-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-forest">{report.label}</h3>
                    <p className="text-sm text-stone-500">{reportRows.length} registros</p>
                  </div>
                  <Icon className="h-5 w-5 text-leaf" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <AppButton icon={FileText} variant="secondary" onClick={() => exportRowsPdf(report.label, reportRows)}>
                    PDF
                  </AppButton>
                  <AppButton icon={Download} variant="secondary" onClick={() => exportCsv(`nex-rural-${report.table}.csv`, reportRows)}>
                    CSV
                  </AppButton>
                  <AppButton icon={FileStack} variant="secondary" onClick={() => exportExcel(`nex-rural-${report.table}.xls`, reportRows)}>
                    Excel
                  </AppButton>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title="Auditoria recente">
        <DataTable rows={auditRows} columns={["created_at", "user_role", "action", "entity", "entity_id"]} />
      </Panel>
    </div>
  );
}

function TeamProvisioner({ profile, refresh, toast }: { profile: AuthProfile; refresh: () => Promise<void>; toast: (message: string, tone?: StatusTone) => void }) {
  const [payload, setPayload] = useState({ full_name: "", email: "", password: "", role: "gestor", client_id: "" });
  const [loading, setLoading] = useState(false);
  const availableRoles = profile.role === "admin_master_global" ? roleOptions : roleOptions.filter((role) => role !== "admin_master_global");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDemoMode) {
      toast("Criacao real de usuarios fica disponivel com Supabase configurado.", "amber");
      return;
    }
    setLoading(true);
    try {
      const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null;
      if (!token) throw new Error("Sessao expirada. Entre novamente.");
      if (payload.password.length < 8) throw new Error("A senha inicial precisa ter pelo menos 8 caracteres.");
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...payload,
          client_id: payload.role === "cliente" ? payload.client_id : null,
          company_id: profile.company_id,
          company_code: profile.company_code
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao criar usuario.");
      toast("Usuario criado no Supabase Auth.", "green");
      setPayload({ full_name: "", email: "", password: "", role: "gestor", client_id: "" });
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao criar usuario.", "red");
    } finally {
      setLoading(false);
    }
  }

  if (!companyAdminRoles.includes(profile.role)) return null;

  return (
    <Panel title="Criar usuario real" subtitle={isDemoMode ? "Disponivel no ambiente Supabase real; no demo use os perfis prontos." : "Cria Auth user e user_profile usando service role no servidor."}>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-5">
        <input value={payload.full_name} onChange={(event) => setPayload((current) => ({ ...current, full_name: event.target.value }))} className="rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-leaf" placeholder="Nome completo" required />
        <input value={payload.email} onChange={(event) => setPayload((current) => ({ ...current, email: event.target.value }))} className="rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-leaf" placeholder="E-mail" type="email" required />
        <input value={payload.password} onChange={(event) => setPayload((current) => ({ ...current, password: event.target.value }))} className="rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-leaf" placeholder="Senha inicial (min. 8)" type="password" minLength={8} required />
        <select value={payload.role} onChange={(event) => setPayload((current) => ({ ...current, role: event.target.value }))} className="rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-leaf">
          {availableRoles.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </select>
        {payload.role === "cliente" ? (
          <input value={payload.client_id} onChange={(event) => setPayload((current) => ({ ...current, client_id: event.target.value }))} className="rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-leaf" placeholder="ID cliente" />
        ) : (
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-600">Matricula: {profile.company_code || "Admin global"}</div>
        )}
        <div className="md:col-span-5">
          <AppButton icon={Plus} type="submit" disabled={loading || isDemoMode}>
            {loading ? "Criando..." : "Criar usuario"}
          </AppButton>
        </div>
      </form>
    </Panel>
  );
}

function SettingsModule({ profile, rows, refresh, toast }: { profile: AuthProfile; rows: Record<string, AnyRow[]>; refresh: () => Promise<void>; toast: (message: string, tone?: StatusTone) => void }) {
  return (
    <div className="space-y-6">
      <Panel title="Configuracao SaaS" subtitle="Ambiente, empresa, perfis, permissoes e bootstrap.">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ["Supabase", hasSupabaseConfig ? "Configurado" : "Nao configurado"],
            ["DEMO_MODE", isDemoMode ? "true" : "false"],
            ["Empresa atual", profile.company_id],
            ["Perfil", roleLabels[profile.role]],
            ["Usuarios", String((rows.user_profiles ?? []).length)],
            ["Bucket", "nex-rural-documents"]
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-stone-200 p-4">
              <p className="text-sm font-semibold text-stone-500">{label}</p>
              <p className="mt-2 break-all font-black text-forest">{value}</p>
            </div>
          ))}
        </div>
      </Panel>
      <TeamProvisioner profile={profile} refresh={refresh} toast={toast} />
      {process.env.NODE_ENV === "development" && (
        <Panel title="Bootstrap do Admin Master Global" subtitle="Bloco técnico exibido apenas em desenvolvimento.">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            Use a rota interna de bootstrap somente em ambiente controlado. Dados sensíveis não são exibidos em produção.
          </div>
        </Panel>
      )}
    </div>
  );
}

function normalizeLookup(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}


async function internalAuthHeaders() {
  if (isDemoMode) return {} as Record<string, string>;
  if (!supabase) throw new Error(backendMissingMessage);
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessao expirada. Entre novamente.");
  return { Authorization: `Bearer ${token}` };
}

type VariableMapDraftEntry = {
  source: string;
  field: string;
  label: string;
  required: boolean;
  default_value?: string;
};

function parseVariableList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.replace(/[{}]/g, "").trim()).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.split(",").map((item) => item.replace(/[{}]/g, "").trim()).filter(Boolean);
    }
  }
  return [];
}

function parseVariableMap(value: unknown): Record<string, VariableMapDraftEntry> {
  if (!value) return {};
  const raw = typeof value === "string" ? (() => { try { return JSON.parse(value) as unknown; } catch { return {}; } })() : value;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const output: Record<string, VariableMapDraftEntry> = {};
  Object.entries(raw as Record<string, Record<string, unknown>>).forEach(([key, entry]) => {
    const variable = key.replace(/[{}]/g, "").trim();
    output[variable] = {
      source: text(entry.source || entry.source_entity || "manual").toLowerCase(),
      field: text(entry.field || entry.source_field || variable),
      label: text(entry.label || friendlyLabel(variable)),
      required: Boolean(entry.required),
      default_value: entry.default_value === undefined ? undefined : text(entry.default_value)
    };
  });
  return output;
}

function DocumentEngineModule({ rows, profile, refresh, toast }: { rows: Record<string, AnyRow[]>; profile: AuthProfile; refresh: () => Promise<void>; toast: (message: string, tone?: StatusTone) => void }) {
  const templates = (rows.document_templates ?? []).filter((item) => item.company_id === profile.company_id || profile.role === "admin_master_global");
  const docxTemplates = templates.filter((item) => text(item.file_type).toLowerCase() === "docx" || Boolean(item.storage_path));
  const generatedDocs = (rows.generated_documents ?? []).filter((item) => item.company_id === profile.company_id || profile.role === "admin_master_global");
  const clients = (rows.clients ?? []).filter((item) => item.company_id === profile.company_id || profile.role === "admin_master_global");
  const properties = (rows.rural_properties ?? []).filter((item) => item.company_id === profile.company_id || profile.role === "admin_master_global");
  const services = (rows.services ?? []).filter((item) => item.company_id === profile.company_id || profile.role === "admin_master_global");
  const checklists = (rows.checklist_templates ?? []).filter((item) => item.company_id === profile.company_id || profile.role === "admin_master_global");
  const checklistItems = (rows.checklist_template_items ?? []).filter((item) => item.company_id === profile.company_id || profile.role === "admin_master_global");
  const generatedChecklistItems = (rows.generated_checklist_items ?? []).filter((item) => item.company_id === profile.company_id || profile.role === "admin_master_global");

  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingMap, setSavingMap] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("Modelo da empresa");
  const [templateDescription, setTemplateDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [sourceChecklistId, setSourceChecklistId] = useState("");
  const [sourceChecklistItemId, setSourceChecklistItemId] = useState("");
  const [lastDownloadUrl, setLastDownloadUrl] = useState("");
  const [lastGeneratedId, setLastGeneratedId] = useState("");
  const [lastMissingDetails, setLastMissingDetails] = useState<Array<{ variable: string; label?: string; reason?: string }>>([]);
  const [pendingIncomplete, setPendingIncomplete] = useState(false);
  const [mappingTemplateId, setMappingTemplateId] = useState("");
  const [mappingDraft, setMappingDraft] = useState<Record<string, VariableMapDraftEntry>>({});
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [viewerRow, setViewerRow] = useState<AnyRow | null>(null);

  const [checklistName, setChecklistName] = useState("");
  const [checklistCategory, setChecklistCategory] = useState("Documental");
  const [checklistDescription, setChecklistDescription] = useState("");
  const [activeChecklistId, setActiveChecklistId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemRequired, setItemRequired] = useState(true);
  const [itemProvider, setItemProvider] = useState("Cliente");
  const [itemVisible, setItemVisible] = useState(true);
  const [itemTemplateId, setItemTemplateId] = useState("");
  const [generateChecklistTemplateId, setGenerateChecklistTemplateId] = useState("");
  const [generateChecklistClientId, setGenerateChecklistClientId] = useState("");
  const [generateChecklistPropertyId, setGenerateChecklistPropertyId] = useState("");
  const [generateChecklistServiceId, setGenerateChecklistServiceId] = useState("");

  const selectedTemplate = docxTemplates.find((item) => text(item.id) === selectedTemplateId);
  const selectedClient = clients.find((item) => text(item.id) === selectedClientId);
  const selectedProperty = properties.find((item) => text(item.id) === selectedPropertyId);
  const selectedService = services.find((item) => text(item.id) === selectedServiceId);
  const selectedClientProperties = selectedClientId ? properties.filter((item) => text(item.client_id) === selectedClientId) : properties;
  const selectedClientServices = selectedClientId ? services.filter((item) => text(item.client_id) === selectedClientId) : services;
  const activeChecklistItems = activeChecklistId ? checklistItems.filter((item) => text(item.template_id) === activeChecklistId) : checklistItems.slice(0, 12);

  const sourceOptions: RelationOption[] = [
    { id: "client", label: "Cliente" },
    { id: "spouse", label: "Cônjuge" },
    { id: "property", label: "Imóvel" },
    { id: "service", label: "Serviço" },
    { id: "company", label: "Empresa" },
    { id: "system", label: "Sistema" },
    { id: "manual", label: "Manual" }
  ];

  const fieldOptionsBySource: Record<string, RelationOption[]> = {
    client: [
      ["full_name", "Nome completo"], ["cpf_cnpj", "CPF/CNPJ"], ["rg", "RG"], ["phone", "Telefone"], ["whatsapp", "WhatsApp"], ["email", "E-mail"], ["address", "Endereço"], ["city", "Cidade"], ["state", "UF"]
    ].map(([id, label]) => ({ id, label })),
    spouse: [
      ["spouse_full_name", "Nome do cônjuge"], ["spouse_cpf", "CPF do cônjuge"], ["spouse_rg", "RG do cônjuge"], ["spouse_phone", "Telefone"], ["spouse_email", "E-mail"]
    ].map(([id, label]) => ({ id, label })),
    property: [
      ["name", "Nome do imóvel"], ["registry_number", "Matrícula"], ["registration_number", "Matrícula"], ["municipality", "Município"], ["state", "UF"], ["measured_area", "Área"], ["car", "CAR"], ["ccir", "CCIR"], ["itr", "ITR"], ["cib_nirf", "CIB/NIRF"]
    ].map(([id, label]) => ({ id, label })),
    service: [["service_type", "Tipo do serviço"], ["status", "Status"], ["created_at", "Data do serviço"]].map(([id, label]) => ({ id, label })),
    company: [["name", "Nome da empresa"], ["trade_name", "Nome fantasia"], ["cnpj", "CNPJ"], ["phone", "Telefone"], ["email", "E-mail"]].map(([id, label]) => ({ id, label })),
    system: [["data_atual", "Data atual"], ["ano_atual", "Ano atual"], ["data_extenso", "Data por extenso"]].map(([id, label]) => ({ id, label })),
    manual: [["manual", "Valor informado na geração"]].map(([id, label]) => ({ id, label }))
  };

  function readRowValue(row: AnyRow | undefined, field: string) {
    if (!row) return "";
    const aliases: Record<string, string[]> = {
      registry_number: ["registry_number", "registration_number", "matricula"],
      registration_number: ["registration_number", "registry_number", "matricula"],
      municipality: ["municipality", "city", "municipio"],
      measured_area: ["measured_area", "area_total", "declared_area"],
      name: ["name", "property_name", "full_name", "trade_name"],
      service_type: ["service_type", "type", "title"]
    };
    const keys = aliases[field] || [field];
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && text(value).trim()) return formatCell(value);
    }
    return "";
  }

  function previewValueFor(entry: VariableMapDraftEntry, variable: string) {
    if (entry.source === "manual") return manualValues[variable] || entry.default_value || "";
    if (entry.source === "system") {
      if (entry.field === "ano_atual") return String(new Date().getFullYear());
      if (entry.field === "data_extenso") return new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
      return new Date().toLocaleDateString("pt-BR");
    }
    const sourceRow = entry.source === "client" ? selectedClient : entry.source === "spouse" ? selectedClient : entry.source === "property" ? selectedProperty : entry.source === "service" ? selectedService : entry.source === "company" ? rows.companies?.find((item) => text(item.id) === text(profile.company_id)) : undefined;
    return readRowValue(sourceRow, entry.field);
  }

  function draftForTemplate(template: AnyRow) {
    const keys = Array.from(new Set([...parseVariableList(template.variables), ...Object.keys(parseVariableMap(template.variable_map))]));
    const current = parseVariableMap(template.variable_map);
    const draft: Record<string, VariableMapDraftEntry> = {};
    keys.forEach((key) => {
      const entry = current[key] || { source: "manual", field: key, label: friendlyLabel(key), required: false };
      draft[key] = {
        source: text(entry.source || "manual"),
        field: text(entry.field || key),
        label: text(entry.label || friendlyLabel(key)),
        required: Boolean(entry.required),
        default_value: entry.default_value
      };
    });
    return draft;
  }

  function openMapping(template: AnyRow) {
    setMappingTemplateId(text(template.id));
    setMappingDraft(draftForTemplate(template));
    setSelectedTemplateId(text(template.id));
  }

  async function uploadTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      toast("Selecione um arquivo DOCX.", "amber");
      return;
    }
    setUploading(true);
    setLastMissingDetails([]);
    try {
      const headers = await internalAuthHeaders();
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("name", templateName || selectedFile.name.replace(/\.docx$/i, ""));
      form.append("category", templateCategory);
      form.append("description", templateDescription || "Modelo enviado pela empresa para preenchimento automatico.");
      const response = await fetch("/api/document-templates/upload", { method: "POST", headers, body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha no upload do modelo.");
      setSelectedTemplateId(data.template?.id || "");
      setMappingTemplateId(data.template?.id || "");
      setMappingDraft(parseVariableMap(data.template?.variable_map || data.variable_map));
      setTemplateName("");
      setTemplateDescription("");
      setSelectedFile(null);
      toast(`Modelo enviado. Variáveis encontradas: ${(data.variables || []).length}. Revise o mapeamento.`, "green");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha no upload.", "red");
    } finally {
      setUploading(false);
    }
  }

  async function analyzeTemplate(templateId: string) {
    try {
      const headers = await internalAuthHeaders();
      const response = await fetch("/api/document-templates/analyze", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao analisar modelo.");
      if (data.template) openMapping(data.template);
      toast(`Modelo analisado: ${(data.variables || []).length} variáveis encontradas.`, "green");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha na análise.", "red");
    }
  }

  async function saveVariableMap() {
    if (!mappingTemplateId) return;
    setSavingMap(true);
    try {
      const headers = await internalAuthHeaders();
      const payload = Object.fromEntries(Object.entries(mappingDraft).map(([key, entry]) => [key, {
        source: entry.source,
        source_entity: entry.source,
        field: entry.field,
        source_field: entry.field,
        label: entry.label || friendlyLabel(key),
        required: entry.required,
        default_value: entry.default_value || ""
      }]));
      const response = await fetch(`/api/document-templates/${mappingTemplateId}/variable-map`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ variable_map: payload })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao salvar mapeamento.");
      toast("Mapeamento de variáveis salvo.", "green");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao salvar mapeamento.", "red");
    } finally {
      setSavingMap(false);
    }
  }

  async function generateDocument(allowIncomplete = false) {
    if (!selectedTemplateId || !selectedClientId) {
      toast("Escolha o modelo e o cliente.", "amber");
      return;
    }
    setGenerating(true);
    setLastDownloadUrl("");
    setLastGeneratedId("");
    setLastMissingDetails([]);
    setPendingIncomplete(false);
    try {
      const headers = await internalAuthHeaders();
      const response = await fetch("/api/document-templates/generate", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: selectedTemplateId,
          client_id: selectedClientId,
          property_id: selectedPropertyId || null,
          service_id: selectedServiceId || null,
          checklist_id: sourceChecklistId || null,
          generated_checklist_item_id: sourceChecklistItemId || null,
          allow_incomplete: allowIncomplete,
          manual_values: manualValues
        })
      });
      const data = await response.json();
      if (response.status === 409 && data.requires_confirmation) {
        setLastMissingDetails(data.missing_details || (data.missing || []).map((variable: string) => ({ variable })));
        setPendingIncomplete(true);
        return;
      }
      if (!response.ok) throw new Error(data.error || "Falha ao gerar documento.");
      setLastDownloadUrl(data.download_url || "");
      setLastGeneratedId(text(data.generated_document?.id));
      toast("DOCX preenchido gerado com sucesso.", "green");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao gerar documento.", "red");
    } finally {
      setGenerating(false);
    }
  }

  async function changePortalVisibility(id: string, visible: boolean) {
    try {
      const headers = await internalAuthHeaders();
      const response = await fetch(visible ? "/api/generated-documents/release" : "/api/generated-documents/hide", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao atualizar portal.");
      toast(visible ? "Documento liberado no portal." : "Documento removido do portal.", "green");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao atualizar portal.", "red");
    }
  }

  async function downloadGeneratedDocument(idOrEndpoint: string) {
    try {
      const headers = await internalAuthHeaders();
      const endpoint = idOrEndpoint.startsWith("/api/") ? idOrEndpoint : `/api/generated-documents/${idOrEndpoint}/download`;
      const response = await fetch(endpoint, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha no download do documento.");
      window.open(String(data.url), "_blank");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha no download.", "red");
    }
  }

  async function createChecklistTemplate() {
    if (!checklistName.trim()) {
      toast("Informe o nome do checklist.", "amber");
      return;
    }
    const created = await createRecord<AnyRow>("checklist_templates", {
      company_id: profile.company_id,
      name: checklistName.trim(),
      category: checklistCategory,
      description: checklistDescription,
      is_editable: true,
      active: true,
      source_notice: "Checklist criado pela empresa.",
      created_by: profile.id
    }, rows.checklist_templates ?? []);
    setActiveChecklistId(text(created.id));
    setChecklistName("");
    setChecklistDescription("");
    toast("Checklist criado. Agora adicione os itens.", "green");
    await refresh();
  }

  async function addChecklistItem() {
    if (!activeChecklistId) {
      toast("Selecione ou crie um checklist primeiro.", "amber");
      return;
    }
    if (!itemName.trim()) {
      toast("Informe o documento necessário.", "amber");
      return;
    }
    await createRecord<AnyRow>("checklist_template_items", {
      company_id: profile.company_id,
      template_id: activeChecklistId,
      document_name: itemName.trim(),
      description: itemDescription,
      required: itemRequired,
      who_provides: itemProvider,
      visible_to_client: itemVisible,
      visible_on_portal: itemVisible,
      linked_template_id: itemTemplateId || null,
      sort_order: activeChecklistItems.length + 1,
      active: true,
      portal_instruction: itemVisible ? `Envie ou confirme: ${itemName.trim()}.` : null,
      internal_instruction: "Item criado no builder profissional."
    }, rows.checklist_template_items ?? []);
    setItemName("");
    setItemDescription("");
    setItemRequired(true);
    setItemProvider("Cliente");
    setItemVisible(true);
    setItemTemplateId("");
    toast("Item adicionado ao checklist.", "green");
    await refresh();
  }

  async function duplicateActiveChecklist() {
    const original = checklists.find((item) => text(item.id) === activeChecklistId);
    if (!original) {
      toast("Selecione um checklist para duplicar.", "amber");
      return;
    }
    const copy = await createRecord<AnyRow>("checklist_templates", {
      company_id: profile.company_id,
      name: `${pickRowTitle(original)} - cópia`,
      category: original.category || "Documental",
      description: original.description || "Checklist duplicado pela empresa.",
      is_editable: true,
      active: true,
      status: "Rascunho",
      source_notice: "Checklist duplicado pela empresa.",
      created_by: profile.id
    }, rows.checklist_templates ?? []);
    const originalItems = checklistItems.filter((item) => text(item.template_id) === activeChecklistId).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    await Promise.all(originalItems.map((item, index) => createRecord<AnyRow>("checklist_template_items", {
      company_id: profile.company_id,
      template_id: copy.id,
      document_name: item.document_name,
      description: item.description,
      required: item.required,
      who_provides: item.who_provides,
      visible_to_client: item.visible_to_client,
      visible_on_portal: item.visible_on_portal,
      linked_template_id: item.linked_template_id || null,
      sort_order: index + 1,
      active: true,
      portal_instruction: item.portal_instruction,
      internal_instruction: item.internal_instruction
    }, rows.checklist_template_items ?? [])));
    setActiveChecklistId(text(copy.id));
    toast("Checklist duplicado em rascunho.", "green");
    await refresh();
  }

  async function deactivateActiveChecklist() {
    if (!activeChecklistId) {
      toast("Selecione um checklist para desativar.", "amber");
      return;
    }
    await updateRecord("checklist_templates", activeChecklistId, { active: false, status: "Inativo", updated_at: new Date().toISOString() }, rows.checklist_templates ?? []);
    toast("Checklist desativado.", "green");
    await refresh();
  }

  async function toggleChecklistItem(row: AnyRow) {
    await updateRecord("checklist_template_items", text(row.id), { active: row.active === false ? true : false, updated_at: new Date().toISOString() }, rows.checklist_template_items ?? []);
    toast(row.active === false ? "Item reativado." : "Item removido do checklist.", "green");
    await refresh();
  }

  async function moveChecklistItem(row: AnyRow, direction: "up" | "down") {
    const sorted = [...activeChecklistItems].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const currentIndex = sorted.findIndex((item) => text(item.id) === text(row.id));
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sorted.length) return;
    const target = sorted[targetIndex];
    await Promise.all([
      updateRecord("checklist_template_items", text(row.id), { sort_order: Number(target.sort_order || targetIndex + 1), updated_at: new Date().toISOString() }, rows.checklist_template_items ?? []),
      updateRecord("checklist_template_items", text(target.id), { sort_order: Number(row.sort_order || currentIndex + 1), updated_at: new Date().toISOString() }, rows.checklist_template_items ?? [])
    ]);
    toast("Ordem dos itens atualizada.", "green");
    await refresh();
  }

  async function generateChecklistForClient() {
    if (!generateChecklistTemplateId || !generateChecklistClientId) {
      toast("Escolha checklist e cliente.", "amber");
      return;
    }
    const headers = await internalAuthHeaders();
    const response = await fetch("/api/checklists/generate-for-client", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: generateChecklistTemplateId,
        client_id: generateChecklistClientId,
        property_id: generateChecklistPropertyId || null,
        service_id: generateChecklistServiceId || null
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Falha ao gerar checklist.");
    toast(`Checklist gerado. Itens criados: ${(data.items || []).length}. Visíveis no portal: ${data.visible_count ?? 0}.`, "green");
    await refresh();
  }

  async function updateChecklistItemStatus(id: string, status: string, rejectionReason?: string) {
    try {
      const headers = await internalAuthHeaders();
      const response = await fetch("/api/checklist-items/update-status", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, rejection_reason: rejectionReason })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao atualizar item.");
      toast(`Item atualizado para: ${status}.`, status === "Recusado" ? "amber" : "green");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao atualizar item.", "red");
    }
  }

  function startDocumentFromChecklist(row: AnyRow) {
    const templateItem = checklistItems.find((item) => text(item.id) === text(row.template_item_id));
    const linkedTemplateId = text(row.linked_template_id || templateItem?.linked_template_id);
    if (!linkedTemplateId) {
      toast("Este item não possui modelo DOCX vinculado.", "amber");
      return;
    }
    setSelectedTemplateId(linkedTemplateId);
    setSelectedClientId(text(row.client_id));
    setSelectedPropertyId(text(row.property_id));
    setSelectedServiceId(text(row.service_id));
    setSourceChecklistId(text(row.generated_checklist_id));
    setSourceChecklistItemId(text(row.id));
    toast("Modelo carregado no wizard de geração. Revise e gere o DOCX vinculado ao item do checklist.", "green");
  }

  const cards = [
    ["Checklists da Empresa", "Crie listas de documentos por procedimento.", String(checklists.length), ListChecks],
    ["Modelos DOCX", "Envie modelos para preenchimento automático.", String(docxTemplates.length), FileSignature],
    ["Documentos Gerados", "Consulte documentos preenchidos para clientes.", String(generatedDocs.length), FileText],
    ["Documentos no Portal", "Controle o que foi liberado para o cliente.", String(generatedDocs.filter((item) => item.portal_visible).length), Lock]
  ] as const;

  const selectedVariableMap = selectedTemplate ? parseVariableMap(selectedTemplate.variable_map) : {};
  const selectedVariables = selectedTemplate ? Array.from(new Set([...parseVariableList(selectedTemplate.variables), ...Object.keys(selectedVariableMap)])) : [];
  const manualVariables = selectedVariables.filter((key) => (selectedVariableMap[key]?.source || "").toLowerCase() === "manual");
  const generationPreview = selectedVariables.map((key) => {
    const entry = selectedVariableMap[key] || { source: "manual", field: key, label: friendlyLabel(key), required: false };
    const value = previewValueFor(entry, key);
    const empty = !text(value).trim();
    const isManual = text(entry.source).toLowerCase() === "manual";
    const status = empty
      ? isManual
        ? entry.required ? "Manual pendente" : "Manual opcional"
        : entry.required ? "Obrigatório sem dado" : "Opcional sem dado"
      : isManual ? "Manual preenchido" : "Preenchido";
    return { key, entry, value, status };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([title, subtitle, value, Icon]) => (
          <article key={title} className="interactive-card rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-forest">{title}</p>
                <p className="mt-1 text-xs font-semibold text-stone-500">{subtitle}</p>
                <p className="mt-3 text-2xl font-black text-forest">{value}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 text-forest"><Icon className="h-5 w-5" /></div>
            </div>
          </article>
        ))}
      </div>

      <Panel title="Enviar modelo DOCX" subtitle="Envie um DOCX da empresa. O sistema detecta variáveis e abre o mapeamento visual.">
        <form onSubmit={uploadTemplate} className="grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-end">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-stone-700">Nome do modelo</span>
            <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-leaf" placeholder="Ex.: Declaração de posse" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-stone-700">Categoria</span>
            <input value={templateCategory} onChange={(event) => setTemplateCategory(event.target.value)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-leaf" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-stone-700">Arquivo DOCX</span>
            <input type="file" accept=".docx" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-leaf" />
          </label>
          <AppButton type="submit" icon={Upload} disabled={uploading}>{uploading ? "Enviando..." : "Enviar modelo"}</AppButton>
          <label className="block lg:col-span-4">
            <span className="mb-1 block text-sm font-bold text-stone-700">Descrição</span>
            <input value={templateDescription} onChange={(event) => setTemplateDescription(event.target.value)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-leaf" placeholder="Uso interno deste modelo" />
          </label>
        </form>
      </Panel>

      {mappingTemplateId && (
        <Panel title="Mapeamento visual de variáveis" subtitle="Defina a origem de cada variável sem editar JSON ou campos técnicos.">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-stone-600">Modelo: <strong>{pickRowTitle(templates.find((item) => text(item.id) === mappingTemplateId) || {})}</strong></p>
            <div className="flex flex-wrap gap-2">
              <AppButton variant="secondary" onClick={() => setMappingTemplateId("")}>Fechar</AppButton>
              <AppButton icon={Save} onClick={saveVariableMap} disabled={savingMap}>{savingMap ? "Salvando..." : "Salvar mapeamento"}</AppButton>
            </div>
          </div>
          <div className="grid gap-3">
            {Object.entries(mappingDraft).map(([key, entry]) => {
              const fieldOptions = fieldOptionsBySource[entry.source] || fieldOptionsBySource.manual;
              return (
                <div key={key} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                  <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr] lg:items-end">
                    <div>
                      <p className="text-xs font-black uppercase text-stone-400">Variável encontrada</p>
                      <p className="font-mono text-sm font-black text-forest">{`{{${key}}}`}</p>
                    </div>
                    <RelationSelect label="Origem" value={entry.source} options={sourceOptions} onChange={(value) => setMappingDraft((current) => ({ ...current, [key]: { ...entry, source: value, field: fieldOptionsBySource[value]?.[0]?.id || "manual" } }))} />
                    <RelationSelect label="Campo" value={entry.field} options={fieldOptions} onChange={(value) => setMappingDraft((current) => ({ ...current, [key]: { ...entry, field: value } }))} />
                    <label className="flex min-h-11 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-bold text-stone-700">
                      <input type="checkbox" checked={entry.required} onChange={(event) => setMappingDraft((current) => ({ ...current, [key]: { ...entry, required: event.target.checked } }))} className="h-4 w-4 accent-leaf" /> Obrigatório
                    </label>
                    <div>
                      <p className="text-xs font-black uppercase text-stone-400">Prévia</p>
                      <p className="truncate rounded-lg bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700">{previewValueFor(entry, key) || "Sem valor"}</p>
                    </div>
                  </div>
                  {entry.source === "manual" && (
                    <label className="mt-3 block">
                      <span className="mb-1 block text-sm font-bold text-stone-700">Valor padrão/manual</span>
                      <input value={entry.default_value || ""} onChange={(event) => setMappingDraft((current) => ({ ...current, [key]: { ...entry, default_value: event.target.value } }))} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-leaf" placeholder="Pode ser preenchido também no momento da geração" />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          {!Object.keys(mappingDraft).length && <EmptyState title="Nenhuma variável detectada" description="Analise o DOCX novamente ou use variáveis no padrão {{cliente_nome}}." />}
        </Panel>
      )}

      <Panel title="Wizard de geração de documento" subtitle="Escolha modelo, cliente, imóvel/serviço, revise os valores e gere um DOCX pronto para imprimir.">
        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-3">
            <RelationSelect label="1. Modelo DOCX" value={selectedTemplateId} options={docxTemplates.map((item) => ({ id: text(item.id), label: pickRowTitle(item), description: text(item.category || item.original_filename) }))} onChange={(value) => { setSelectedTemplateId(value); setManualValues({}); }} />
            <RelationSelect label="2. Cliente" value={selectedClientId} options={clients.map((item) => ({ id: text(item.id), label: pickRowTitle(item), description: text(item.cpf_cnpj || item.phone) }))} onChange={(value) => { setSelectedClientId(value); setSelectedPropertyId(""); setSelectedServiceId(""); }} />
            <RelationSelect label="3. Imóvel" value={selectedPropertyId} options={selectedClientProperties.map((item) => ({ id: text(item.id), label: pickRowTitle(item), description: [item.municipality || item.city, item.state].map(text).filter(Boolean).join("/") }))} onChange={setSelectedPropertyId} placeholder="Imóvel opcional" />
            <RelationSelect label="4. Serviço" value={selectedServiceId} options={selectedClientServices.map((item) => ({ id: text(item.id), label: text(item.service_type || item.type || item.title || "Serviço"), description: text(item.status) }))} onChange={setSelectedServiceId} placeholder="Serviço opcional" />
            {manualVariables.map((key) => (
              <label key={key} className="block">
                <span className="mb-1 block text-sm font-bold text-stone-700">Valor manual — {`{{${key}}}`}</span>
                <input value={manualValues[key] || selectedVariableMap[key]?.default_value || ""} onChange={(event) => setManualValues((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-leaf" />
              </label>
            ))}
            <div className="flex flex-wrap gap-2">
              {sourceChecklistItemId && <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">Vinculado ao item do checklist</span>}
              <AppButton icon={FileSignature} onClick={() => generateDocument(false)} disabled={generating}>{generating ? "Gerando..." : "Gerar DOCX"}</AppButton>
              {lastGeneratedId && <AppButton icon={Download} variant="secondary" onClick={() => downloadGeneratedDocument(lastGeneratedId)}>Baixar DOCX</AppButton>}
              <button type="button" disabled title="A conversão direta de DOCX para PDF será habilitada após configuração do conversor no ambiente de produção." className="rounded-lg border border-stone-200 bg-stone-100 px-3 py-2 text-sm font-black text-stone-400">Gerar PDF</button>
            </div>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="font-black text-forest">5. Prévia dos dados</h3>
            <p className="mb-3 text-sm font-semibold text-stone-500">Confira o que será usado antes de gerar.</p>
            <div className="grid gap-2">
              {generationPreview.slice(0, 24).map(({ key, entry, value, status }) => (
                <div key={key} className="grid gap-2 rounded-lg bg-stone-50 p-3 text-sm md:grid-cols-[1fr_1fr_1fr_0.8fr]">
                  <span className="font-mono font-black text-forest">{`{{${key}}}`}</span>
                  <span className="font-semibold text-stone-700">{value || "Sem valor"}</span>
                  <span className="text-stone-500">{entry.source} &gt; {entry.field}</span>
                  <span className={`rounded-full px-2 py-1 text-center text-[11px] font-black ${status.includes("Obrigatório") || status.includes("pendente") ? "bg-amber-100 text-amber-900" : status.includes("Opcional") ? "bg-stone-200 text-stone-600" : "bg-emerald-100 text-emerald-800"}`}>{status}</span>
                </div>
              ))}
              {!generationPreview.length && <p className="rounded-lg bg-stone-50 p-4 text-sm font-semibold text-stone-500">Selecione um modelo DOCX para ver a prévia.</p>}
            </div>
            {pendingIncomplete && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-black text-amber-900">Campos sem preenchimento encontrados</p>
                <ul className="mt-2 list-disc pl-5 text-sm font-semibold text-amber-900">
                  {lastMissingDetails.map((item) => <li key={item.variable}>{`{{${item.variable}}}`} — {item.label || "Campo sem valor"}</li>)}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AppButton variant="secondary" onClick={() => setPendingIncomplete(false)}>Cancelar</AppButton>
                  <AppButton icon={AlertTriangle} onClick={() => generateDocument(true)}>Gerar mesmo assim</AppButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Documentos gerados" subtitle="Arquivos DOCX preenchidos e salvos no histórico do cliente.">
        <DataTable
          rows={generatedDocs}
          columns={["title", "output_type", "status", "portal_visible", "generated_at"]}
          onView={setViewerRow}
          actions={(row) => (
            <ActionMenu
              primary={[{ label: "Baixar", onClick: () => downloadGeneratedDocument(text(row.id)) }]}
              more={[
                { label: "Liberar no portal", onClick: () => changePortalVisibility(text(row.id), true), tone: "success" },
                { label: "Ocultar do portal", onClick: () => changePortalVisibility(text(row.id), false) }
              ]}
            />
          )}
        />
        {viewerRow && (
          <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-stone-400">Visualização real do documento</p>
                <h3 className="text-lg font-black text-forest">{pickRowTitle(viewerRow)}</h3>
                <p className="text-sm font-semibold text-stone-500">DOCX: baixe o arquivo para ver a formatação completa no Word/LibreOffice. Nenhum PDF técnico de tabela é gerado aqui.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AppButton icon={Download} onClick={() => downloadGeneratedDocument(text(viewerRow.id))}>Baixar DOCX</AppButton>
                <AppButton variant="secondary" onClick={() => setViewerRow(null)}>Fechar</AppButton>
              </div>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Checklist Builder" subtitle="Crie checklists da empresa, vincule modelos DOCX e gere checklists para clientes sem UUID manual.">
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <h3 className="font-black text-forest">1. Criar / selecionar checklist</h3>
              <div className="mt-3 grid gap-3">
                <input value={checklistName} onChange={(event) => setChecklistName(event.target.value)} className="rounded-lg border border-stone-200 px-3 py-2.5 outline-none focus:border-leaf" placeholder="Nome do checklist" />
                <input value={checklistCategory} onChange={(event) => setChecklistCategory(event.target.value)} className="rounded-lg border border-stone-200 px-3 py-2.5 outline-none focus:border-leaf" placeholder="Categoria" />
                <textarea value={checklistDescription} onChange={(event) => setChecklistDescription(event.target.value)} className="min-h-20 rounded-lg border border-stone-200 px-3 py-2.5 outline-none focus:border-leaf" placeholder="Descrição/observação interna" />
                <div className="flex flex-wrap gap-2">
                  <AppButton icon={Plus} onClick={createChecklistTemplate}>Criar checklist</AppButton>
                  <AppButton icon={FileStack} variant="secondary" onClick={duplicateActiveChecklist}>Duplicar</AppButton>
                  <AppButton icon={Archive} variant="secondary" onClick={deactivateActiveChecklist}>Desativar</AppButton>
                </div>
                <RelationSelect label="Checklist ativo" value={activeChecklistId} options={checklists.map((item) => ({ id: text(item.id), label: pickRowTitle(item), description: [item.category, item.active === false ? "Inativo" : "Ativo"].map(text).filter(Boolean).join(" • ") }))} onChange={setActiveChecklistId} />
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <h3 className="font-black text-forest">2. Adicionar item</h3>
              <div className="mt-3 grid gap-3">
                <input value={itemName} onChange={(event) => setItemName(event.target.value)} className="rounded-lg border border-stone-200 px-3 py-2.5 outline-none focus:border-leaf" placeholder="Documento necessário" />
                <textarea value={itemDescription} onChange={(event) => setItemDescription(event.target.value)} className="min-h-20 rounded-lg border border-stone-200 px-3 py-2.5 outline-none focus:border-leaf" placeholder="Descrição do item" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <RelationSelect label="Quem fornece" value={itemProvider} options={["Cliente", "Empresa", "Técnico", "Cartório", "Órgão público", "Outro"].map((item) => ({ id: item, label: item }))} onChange={setItemProvider} />
                  <RelationSelect label="Modelo DOCX vinculado" value={itemTemplateId} options={docxTemplates.map((item) => ({ id: text(item.id), label: pickRowTitle(item), description: text(item.category) }))} onChange={setItemTemplateId} placeholder="Opcional" />
                </div>
                <div className="flex flex-wrap gap-3 text-sm font-bold text-stone-700">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={itemRequired} onChange={(event) => setItemRequired(event.target.checked)} className="h-4 w-4 accent-leaf" /> Obrigatório</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={itemVisible} onChange={(event) => setItemVisible(event.target.checked)} className="h-4 w-4 accent-leaf" /> Visível no portal</label>
                </div>
                <AppButton icon={Plus} onClick={addChecklistItem}>Adicionar item</AppButton>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <h3 className="font-black text-forest">3. Gerar checklist para cliente</h3>
              <div className="mt-3 grid gap-3">
                <RelationSelect label="Checklist modelo" value={generateChecklistTemplateId} options={checklists.map((item) => ({ id: text(item.id), label: pickRowTitle(item), description: text(item.category) }))} onChange={setGenerateChecklistTemplateId} />
                <RelationSelect label="Cliente" value={generateChecklistClientId} options={clients.map((item) => ({ id: text(item.id), label: pickRowTitle(item), description: text(item.cpf_cnpj || item.phone) }))} onChange={(value) => { setGenerateChecklistClientId(value); setGenerateChecklistPropertyId(""); setGenerateChecklistServiceId(""); }} />
                <RelationSelect label="Imóvel" value={generateChecklistPropertyId} options={(generateChecklistClientId ? properties.filter((item) => text(item.client_id) === generateChecklistClientId) : properties).map((item) => ({ id: text(item.id), label: pickRowTitle(item), description: [item.municipality || item.city, item.state].map(text).filter(Boolean).join("/") }))} onChange={setGenerateChecklistPropertyId} placeholder="Opcional" />
                <RelationSelect label="Serviço" value={generateChecklistServiceId} options={(generateChecklistClientId ? services.filter((item) => text(item.client_id) === generateChecklistClientId) : services).map((item) => ({ id: text(item.id), label: text(item.service_type || item.type || item.title), description: text(item.status) }))} onChange={setGenerateChecklistServiceId} placeholder="Opcional" />
                <AppButton icon={ListChecks} onClick={generateChecklistForClient}>Gerar checklist para cliente</AppButton>
              </div>
            </div>
            <div>
              <h3 className="mb-2 font-black text-forest">Itens do checklist ativo</h3>
              <DataTable
                rows={activeChecklistItems}
                columns={["document_name", "required", "who_provides", "visible_to_client", "linked_template_id", "sort_order", "active"]}
                actions={(row) => (
                  <ActionMenu
                    primary={[{ label: "Subir", onClick: () => moveChecklistItem(row, "up") }, { label: "Descer", onClick: () => moveChecklistItem(row, "down") }]}
                    more={[{ label: row.active === false ? "Reativar item" : "Remover item", onClick: () => toggleChecklistItem(row), tone: row.active === false ? "success" : "danger" }]}
                  />
                )}
              />
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Itens solicitados ao cliente" subtitle="Ações reais nos itens gerados. Se houver modelo DOCX vinculado, gere documento diretamente do checklist.">
        <DataTable
          rows={generatedChecklistItems}
          columns={["document_name", "status", "required", "visible_to_client", "linked_template_id"]}
          actions={(row) => (
            <ActionMenu
              primary={[{ label: "Gerar documento", onClick: () => startDocumentFromChecklist(row), disabled: !row.linked_template_id && !checklistItems.find((item) => text(item.id) === text(row.template_item_id))?.linked_template_id }]}
              more={[
                { label: "Solicitar ao cliente", onClick: () => updateChecklistItemStatus(text(row.id), "Solicitado ao cliente") },
                { label: "Marcar recebido", onClick: () => updateChecklistItemStatus(text(row.id), "Recebido") },
                { label: "Validar", onClick: () => updateChecklistItemStatus(text(row.id), "Validado"), tone: "success" },
                { label: "Recusar", onClick: () => updateChecklistItemStatus(text(row.id), "Recusado", "Recusado no painel operacional"), tone: "danger" },
                { label: "Não aplicável", onClick: () => updateChecklistItemStatus(text(row.id), "Não aplicável") }
              ]}
            />
          )}
        />
      </Panel>
    </div>
  );
}

function ClientPortalLookup({
  demoSeed,
  onAccess,
  toast
}: {
  demoSeed: Record<string, AnyRow[]>;
  onAccess: (profile: AuthProfile, portalToken?: string, portalRows?: Record<string, AnyRow[]>) => void;
  toast: (message: string, tone?: StatusTone) => void;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(isDemoMode ? "Joao Ferreira da Silva" : "");
  const [cpf, setCpf] = useState(isDemoMode ? "00000000000" : "");
  const [choices, setChoices] = useState<CompanyChoice[]>([]);
  const [selectedChoice, setSelectedChoice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isDemoMode) {
        const client = (demoSeed.clients ?? []).find((row) => normalizeLookup(row.full_name || row.name) === normalizeLookup(fullName));
        const company = (demoSeed.companies ?? []).find((row) => row.id === client?.company_id);
        if (!company || !client || client.portal_enabled === false || client.active === false) throw new Error("Não foi possível acessar com os dados informados. Verifique o nome completo e CPF.");
        onAccess({
          id: `portal-${client.id}`,
          email: text(client.email || `${client.id}@portal.nexrural.local`),
          full_name: text(client.full_name || client.name),
          role: "cliente",
          company_id: text(company.id),
          company_code: text(company.company_code),
          company_status: text(company.status || "Ativa"),
          client_id: text(client.id),
          client_name: text(client.name || client.full_name),
          active: true,
          access_type: "client"
        });
        return;
      }
      const result = await signInClientWithCpf(fullName, cpf, selectedChoice || undefined);
      if (result.requires_company_choice) {
        setChoices(result.companies);
        setError("Encontramos este cliente em mais de uma empresa. Selecione a empresa correta para continuar.");
        return;
      }
      const portalData = await fetch("/api/portal/data", {
        headers: { Authorization: `Bearer ${result.portalToken}` }
      });
      const portalRows = await portalData.json();
      if (!portalData.ok) throw new Error(portalRows.error || "Falha ao carregar dados do portal.");
      onAccess(result.profile as AuthProfile, result.portalToken, portalRows.rows as Record<string, AnyRow[]>);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no acesso ao portal.";
      setError(message);
      toast(message, "red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="rural-pattern flex min-h-screen items-center justify-center px-4 py-8">
      <form onSubmit={submit} className="premium-card w-full max-w-lg rounded-lg bg-white p-5 shadow-soft slide-up sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white p-2 shadow-sm ring-1 ring-stone-200">
            <Image src={logoSrc} alt="Nex Rural" width={56} height={56} className="h-full w-full object-contain" priority unoptimized onError={(event) => { event.currentTarget.src = "/nex-rural-logo.png"; }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-forest">Portal do Cliente</h1>
            <p className="text-sm font-semibold text-stone-500">Entre com nome completo e CPF.</p>
          </div>
        </div>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-bold text-stone-700">Nome completo</span>
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-3 outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20" placeholder="Nome cadastrado pela empresa" required />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-bold text-stone-700">CPF</span>
          <input value={cpf} onChange={(event) => setCpf(event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-3 outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20" placeholder="000.000.000-00" inputMode="numeric" required />
        </label>
        {choices.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="mb-2 text-sm font-black text-amber-900">Selecione a empresa</p>
            <div className="grid gap-2">
              {choices.map((choice) => (
                <button key={choice.choice_id} type="button" onClick={() => setSelectedChoice(choice.choice_id)} className={`rounded-lg border px-3 py-2 text-left text-sm font-bold ${selectedChoice === choice.choice_id ? "border-forest bg-forest text-white" : "border-stone-200 bg-white text-stone-700"}`}>
                  {choice.display_name} {choice.city || choice.state ? `— ${[choice.city, choice.state].filter(Boolean).join("/")}` : ""} {choice.company_hint ? `(${choice.company_hint})` : ""}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">{error}</p>}
        <button className="button-press w-full rounded-lg bg-forest px-4 py-3 font-black text-white transition hover:bg-leaf disabled:opacity-60" disabled={loading}>
          {loading ? "Validando..." : choices.length > 0 && !selectedChoice ? "Selecione a empresa" : "Acessar portal"}
        </button>
        <button type="button" onClick={() => router.replace("/")} className="mt-3 w-full rounded-lg border border-stone-200 px-4 py-3 text-sm font-black text-forest transition hover:bg-wheat">
          Voltar para início
        </button>
      </form>
    </main>
  );
}

function PortalModule({
  profile,
  rows,
  refresh,
  toast,
  portalToken
}: {
  profile: AuthProfile;
  rows: Record<string, AnyRow[]>;
  refresh: () => Promise<void>;
  toast: (message: string, tone?: StatusTone) => void;
  portalToken?: string;
}) {
  const clientId = profile.client_id;
  const own = (row: AnyRow) => !clientId || row.client_id === clientId || row.client_name === profile.client_name;
  const properties = (rows.rural_properties ?? []).filter(own);
  const services = (rows.services ?? []).filter(own);
  const pending = (rows.pending_items ?? []).filter((row) => own(row) && row.visible_on_portal);
  const documents = (rows.documents ?? []).filter((row) => own(row) && (row.visible_on_portal || row.uploaded_by === profile.id));
  const generatedDocuments = (rows.generated_documents ?? []).filter((row) => own(row) && row.portal_visible);
  const finance = (rows.financial_entries ?? []).filter((row) => own(row) && row.visible_on_portal);
  const reports = (rows.reports ?? []).filter((row) => own(row) && row.visible_on_portal);
  const certificates = (rows.property_certificates ?? []).filter((row) => own(row) && row.visible_on_portal);
  const portalChecklists = (rows.generated_checklists ?? []).filter((row) => own(row) && row.visible_on_portal);
  const checklistIds = new Set(portalChecklists.map((row) => text(row.id)));
  const requestedItems = (rows.generated_checklist_items ?? []).filter((row) => checklistIds.has(text(row.generated_checklist_id)) && (row.visible_to_client || row.visible_on_portal));

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (!isDemoMode && portalToken) {
        const form = new FormData();
        form.append("file", file);
        form.append("category", "Documento enviado pelo cliente");
        const response = await fetch("/api/portal/documents/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${portalToken}` },
          body: form
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Falha no envio.");
      } else {
        await uploadDocumentFile({
          file,
          companyId: profile.company_id,
          clientId: clientId ?? undefined,
          category: "Documento enviado pelo cliente",
          uploadedBy: profile.id,
          visibleOnPortal: true
        });
      }
      toast("Documento enviado.", "green");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha no envio.", "red");
    } finally {
      event.target.value = "";
    }
  }

  async function downloadPortalDocument(row: AnyRow) {
    try {
      if (!isDemoMode && portalToken) {
        const endpoint = text(row.download_endpoint) || `/api/portal/documents/${row.id}/download`;
        const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${portalToken}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Falha no download.");
        window.open(data.url, "_blank");
        return;
      }
      const url = await downloadDocumentFile(row);
      window.open(url, "_blank");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha no download.", "red");
    }
  }


  async function downloadPortalGeneratedDocument(row: AnyRow) {
    try {
      if (!isDemoMode && portalToken) {
        const endpoint = text(row.download_endpoint) || `/api/portal/generated-documents/${row.id}/download`;
        const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${portalToken}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Falha no download.");
        window.open(String(data.url), "_blank");
        return;
      }
      const url = text(row.public_url);
      if (!url) throw new Error("Documento sem link disponivel no modo demonstração.");
      window.open(url, "_blank");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha no download.", "red");
    }
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Portal do Cliente"
        subtitle="Acesso separado e filtrado por cliente."
        action={
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-forest px-3 py-2 text-sm font-black text-white hover:bg-leaf">
            <Upload className="h-4 w-4" />
            Enviar documento
            <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.csv" onChange={upload} />
          </label>
        }
      >
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Meus imoveis" value={String(properties.length)} icon={Map} tone="bg-emerald-50 text-emerald-700" />
          <StatCard label="Servicos" value={String(services.length)} icon={ClipboardCheck} tone="bg-sky-50 text-sky-700" />
          <StatCard label="Pendencias" value={String(pending.length)} icon={AlertTriangle} tone="bg-amber-50 text-amber-700" />
          <StatCard label="Arquivos" value={String(documents.length + generatedDocuments.length)} icon={Archive} tone="bg-lime-50 text-lime-700" />
          <StatCard label="Documentos solicitados" value={String(requestedItems.length)} icon={ListChecks} tone="bg-amber-50 text-amber-700" />
        </div>
      </Panel>
      <Panel title="Meus imoveis">
        <DataTable rows={properties} columns={["name", "municipality", "state", "measured_area", "registry_number", "car", "documental_status"]} />
      </Panel>
      <Panel title="Meus servicos">
        <DataTable rows={services} columns={["service_type", "status", "priority", "expected_end_date", "contracted_value"]} />
      </Panel>
      <Panel title="Pendencias visiveis">
        <DataTable rows={pending} columns={["title", "category", "due_date", "priority", "status"]} />
      </Panel>
      <Panel title="Documentos solicitados pela empresa">
        <DataTable rows={requestedItems} columns={["document_name", "status", "required", "due_date", "portal_instruction", "rejection_reason"]} />
      </Panel>

      <Panel title="Documentos liberados pela empresa">
        <DataTable
          rows={generatedDocuments}
          columns={["title", "output_type", "status", "generated_at"]}
          actions={(row) => row.can_download ? <IconButton label="Baixar" icon={Download} onClick={() => downloadPortalGeneratedDocument(row)} /> : null}
        />
      </Panel>
      <Panel title="Documentos liberados e enviados">
        <DataTable
          rows={documents}
          columns={["name", "category", "status", "version", "visible_on_portal"]}
          actions={(row) => <IconButton label="Download" icon={Download} onClick={() => downloadPortalDocument(row)} />}
        />
      </Panel>
      <Panel title="Contratos, parcelas e recibos">
        <DataTable rows={[...(rows.rural_contracts ?? []).filter(own), ...finance]} columns={["contract_type", "entry_type", "amount", "due_date", "status", "visible_on_portal"]} />
      </Panel>
      <Panel title="Relatorios e certidoes liberadas">
        <DataTable rows={[...reports, ...certificates]} columns={["title", "certificate_type", "agency", "status", "issued_at", "expires_at"]} />
      </Panel>
    </div>
  );
}

export function NexRuralApp({ portalOnly = false }: { portalOnly?: boolean }) {
  const router = useRouter();
  const demoSeed = useMemo(() => makeDemoDatabase(), []);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [portalToken, setPortalToken] = useState<string | undefined>();
  const [staffToken, setStaffToken] = useState<string | undefined>();
  const [rows, setRows] = useState<Record<string, AnyRow[]>>(demoSeed);
  const [active, setActive] = useState("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [toastState, setToastState] = useState<{ message: string; tone: StatusTone } | null>(null);

  const toast = useCallback((message: string, tone: StatusTone = "blue") => {
    setToastState({ message, tone });
    window.setTimeout(() => setToastState(null), 4500);
  }, []);

  const refresh = useCallback(async () => {
    if (!profile) return;
    if (!isDemoMode && !hasSupabaseConfig) {
      toast(backendMissingMessage, "red");
      setLoading(false);
      return;
    }
    setRefreshLoading(true);
    try {
      if (portalOnly && profile.role === "cliente" && !isDemoMode) {
        const token = portalToken || getStoredPortalToken();
        if (!token) throw new Error("Sessao do portal expirada. Acesse novamente.");
        const response = await fetch("/api/portal/data", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Falha ao carregar portal.");
        setRows(data.rows ?? {});
        toast("Dados do portal atualizados.", "green");
        return;
      }

      if (profile.access_type === "staff" && !isDemoMode) {
        const token = staffToken || getStoredStaffToken();
        if (!token) throw new Error("Sessao do funcionário expirada. Acesse novamente.");
        const response = await fetch("/api/access/data", { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Falha ao carregar dados do funcionário.");
        setRows((current) => ({ ...current, ...(data.rows ?? {}) }));
        if (Array.isArray(data.denied) && data.denied.length) toast("Dados carregados conforme permissões da função.", "blue");
        else toast("Dados atualizados.", "green");
        return;
      }

      const loaded: Record<string, AnyRow[]> = {};
      const failedTables: string[] = [];
      for (const table of tableNames) {
        try {
          const tableRows = await listRecords(table, {}, demoSeed[table] ?? []);
          loaded[table] = isDemoMode ? scopeRowsForProfile(table, tableRows, profile) : tableRows;
        } catch (error) {
          console.warn(`[Nex Rural] Falha ao carregar tabela ${table}`, error);
          failedTables.push(table);
        }
      }
      setRows((current) => ({ ...current, ...loaded }));
      if (failedTables.length) toast(`Alguns dados nao puderam ser carregados: ${failedTables.slice(0, 3).join(", ")}.`, "amber");
      else toast("Dados atualizados.", "green");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao carregar dados.", "red");
    } finally {
      setLoading(false);
      setRefreshLoading(false);
    }
  }, [demoSeed, portalOnly, portalToken, staffToken, profile, toast]);

  useEffect(() => {
    async function boot() {
      try {
        const current = await getCurrentProfile();
        if (current) {
          setProfile(current);
          const storedPortal = getStoredPortalToken();
          const storedStaff = getStoredStaffToken();
          if (storedPortal) setPortalToken(storedPortal);
          if (storedStaff) setStaffToken(storedStaff);
          if (current.role === "cliente" && !portalOnly) router.replace("/portal");
          if (portalOnly) setActive("portal");
        }
      } catch (err) {
        toast(err instanceof Error ? err.message : "Sessao invalida.", "red");
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, [portalOnly, router, toast]);

  useEffect(() => {
    if (profile) refresh();
  }, [profile, refresh]);

  async function login(email: string, password: string, companyCode?: string) {
    const nextProfile = await signInWithPassword(email, password, companyCode);
    setProfile(nextProfile);
    await auditAction({ companyId: nextProfile.company_id, userId: nextProfile.id, userRole: nextProfile.role, action: "login", entity: "auth" });
    const nextPath = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    if (nextProfile.role === "cliente" || nextPath === "/portal") router.replace("/portal");
    else if (nextProfile.role === "admin_master_global") router.replace("/master");
    else setActive("dashboard");
  }

  async function staffLogin(nextProfile: AuthProfile, token: string) {
    setStaffToken(token);
    setProfile(nextProfile);
    setActive("dashboard");
    toast(`Bem-vindo, ${nextProfile.full_name}.`, "green");
  }

  async function logout() {
    setLogoutLoading(true);
    const currentProfile = profile;
    try {
      if (currentProfile) {
        await auditAction({ companyId: currentProfile.company_id, userId: currentProfile.id, userRole: currentProfile.role, action: "logout", entity: "auth" });
      }
    } catch (error) {
      console.warn("[Nex Rural] Logout sem auditoria", error);
    }
    try {
      const token = staffToken || getStoredStaffToken();
      if (token) await fetch("/api/access/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
    } catch {}
    try {
      await signOut();
    } catch (error) {
      console.warn("[Nex Rural] Supabase signOut falhou; limpando sessao local", error);
    } finally {
      clearLocalSession();
      setProfile(null);
      setPortalToken(undefined);
      setStaffToken(undefined);
      setRows(demoSeed);
      setActive("dashboard");
      setMobileMenu(false);
      setLogoutLoading(false);
      router.replace(portalOnly ? "/portal" : "/");
      router.refresh();
    }
  }

  async function handleCreate(config: ModuleConfig, values: AnyRow) {
    if (!profile) return;
    const payload =
      config.table === "companies"
        ? { ...values, created_by: profile.id }
        : { ...values, company_id: values.company_id ?? profile.company_id, created_by: profile.id };
    const created = await createRecord<AnyRow>(config.table, payload, rows[config.table] ?? []);
    await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "create", entity: config.table, entityId: String(created.id), newValue: created });
    if (config.table === "services") await createChecklistForService(created);
    toast("Registro criado.", "green");
    await refresh();
  }

  async function handleUpdate(config: ModuleConfig, row: AnyRow, values: AnyRow) {
    if (!profile) return;
    const updated = await updateRecord(config.table, String(row.id), { ...values, updated_by: profile.id }, rows[config.table] ?? []);
    await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "update", entity: config.table, entityId: String(row.id), oldValue: row, newValue: updated });
    toast("Registro salvo.", "green");
    await refresh();
  }

  async function handleDelete(config: ModuleConfig, row: AnyRow) {
    if (!profile) return;
    if (config.table === "documents") await softDeleteRecord(config.table, String(row.id), rows[config.table] ?? []);
    else await deleteRecord(config.table, String(row.id), rows[config.table] ?? []);
    await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "delete", entity: config.table, entityId: String(row.id), oldValue: row });
    toast("Registro excluido.", "green");
    await refresh();
  }

  async function createChecklistForService(service: AnyRow) {
    if (!profile) return;
    const templates = rows.checklist_templates ?? [];
    const serviceType = text(service.service_type);
    const matchingTemplate = templates.find((item) => {
      const haystack = [item.service_type, item.procedure_type, item.name, item.category].map(text).join(" ").toLowerCase();
      const needle = serviceType.toLowerCase();
      return item.active !== false && needle && (haystack.includes(needle) || needle.includes(text(item.procedure_type || item.name).toLowerCase()));
    });
    if (matchingTemplate) {
      const result = await generateChecklistFromTemplate({
        profile,
        template: matchingTemplate,
        clientId: service.client_id ? String(service.client_id) : null,
        propertyId: service.property_id ? String(service.property_id) : null,
        serviceId: String(service.id),
        title: `Checklist ${matchingTemplate.name || service.service_type}`,
        templateItems: rows.checklist_template_items ?? [],
        existingChecklists: rows.generated_checklists ?? [],
        existingItems: rows.generated_checklist_items ?? []
      });
      toast(`Checklist inteligente gerado com ${result.count} itens.`, "green");
      return;
    }

    const library = (rows.document_library_items ?? []).filter(
      (item) => item.active !== false && (!item.process_type || text(service.service_type).toLowerCase().includes(text(item.process_type).toLowerCase()) || text(item.process_type).toLowerCase().includes(text(service.service_type).toLowerCase()))
    );
    const selected = library.length ? library : (rows.document_library_items ?? []).slice(0, 6);
    await Promise.all(
      selected.map((item, index) =>
        createRecord<AnyRow>("service_checklists", {
          company_id: profile.company_id,
          service_id: service.id,
          title: item.document_name,
          status: "Pendente",
          checklist_item_id: item.id,
          position: item.checklist_order ?? index + 1
        })
      )
    );
  }

  async function handleRowAction(action: RowAction, config: ModuleConfig, row: AnyRow) {
    if (!profile) return;
    if (action === "convert-lead") {
      const client = await createRecord<AnyRow>("clients", {
        company_id: profile.company_id,
        created_by: profile.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        city: row.city,
        state: row.state,
        type: "Produtor rural",
        status: "Ativo",
        notes: `Convertido do lead ${row.id}`
      });
      await updateRecord("leads", String(row.id), { status: "Contrato fechado" }, rows.leads ?? []);
      await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "lead_convert", entity: "leads", entityId: String(row.id), newValue: client });
      toast("Lead convertido em cliente.", "green");
    }
    if (action === "create-checklist") {
      await createChecklistForService(row);
      toast("Checklist gerado pela biblioteca documental.", "green");
    }
    if (action === "generate-contract") {
      const contract = await createRecord<AnyRow>("rural_contracts", {
        company_id: profile.company_id,
        client_id: row.client_id,
        property_id: row.property_id,
        service_id: row.id,
        contract_type: row.service_type || "Prestacao de servicos",
        status: "Minuta",
        total_value: row.contracted_value ?? 0,
        visible_on_portal: false
      });
      await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "contract_generate", entity: "rural_contracts", entityId: String(contract.id), newValue: contract });
      toast("Contrato rural gerado.", "green");
    }
    if (action === "release-portal" || action === "hide-portal") {
      const visible = action === "release-portal";
      const portalPayload = config.table === "clients" ? { portal_enabled: visible, active: visible } : config.table === "generated_checklist_items" ? { visible_to_client: visible } : { visible_on_portal: visible };
      await updateRecord(config.table, String(row.id), portalPayload, rows[config.table] ?? []);
      await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: action === "release-portal" ? "portal_release" : "portal_hide", entity: config.table, entityId: String(row.id) });
      toast(action === "release-portal" ? "Liberado no portal." : "Oculto do portal.", "green");
    }
    if (action === "approve" || action === "reject") {
      const patch = config.table === "generated_checklist_items"
        ? { status: action === "approve" ? "Validado" : "Recusado", validated_at: action === "approve" ? new Date().toISOString() : null, rejected_at: action === "reject" ? new Date().toISOString() : null }
        : { status: action === "approve" ? "Sem divergencia" : "Com divergencia" };
      await updateRecord(config.table, String(row.id), patch, rows[config.table] ?? []);
      toast(action === "approve" ? "Registro aprovado." : "Registro reprovado.", action === "approve" ? "green" : "red");
    }
    if (action === "generate-pdf") {
      const blockedPdfTables = new Set(["document_templates", "generated_documents", "checklist_templates", "checklist_template_items", "generated_checklists", "generated_checklist_items"]);
      if (blockedPdfTables.has(config.table)) {
        toast("PDF técnico desativado para documentos e checklists. Use DOCX preenchido, dossiê ou relatório próprio.", "amber");
      } else {
        exportRowsPdf(pickRowTitle(row), [row]);
      }
    }
    if (action === "block-company" || action === "unblock-company") {
      if (profile.role !== "admin_master_global") throw new Error("Apenas Admin Master Global pode alterar empresas.");
      const blocked = action === "block-company";
      await updateRecord("companies", String(row.id), {
        status: blocked ? "Bloqueada" : "Ativa",
        blocked_at: blocked ? new Date().toISOString() : null,
        blocked_reason: blocked ? "Bloqueio administrativo pelo Admin Master Global" : null
      }, rows.companies ?? []);
      await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: blocked ? "company_block" : "company_unblock", entity: "companies", entityId: String(row.id) });
      toast(blocked ? "Empresa bloqueada." : "Empresa reativada.", blocked ? "amber" : "green");
    }
    if (action === "block-user" || action === "unblock-user") {
      const blocked = action === "block-user";
      await updateRecord("user_profiles", String(row.id), { active: !blocked, status: blocked ? "Bloqueado" : "Ativo" }, rows.user_profiles ?? []);
      await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: blocked ? "user_block" : "user_unblock", entity: "user_profiles", entityId: String(row.id) });
      toast(blocked ? "Usuario bloqueado." : "Usuario reativado.", blocked ? "amber" : "green");
    }
    if (action === "make-company-admin" || action === "remove-company-admin") {
      const role = action === "make-company-admin" ? "company_admin" : "gestor";
      await updateRecord("user_profiles", String(row.id), { role, active: true, status: "Ativo" }, rows.user_profiles ?? []);
      await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: action === "make-company-admin" ? "user_promote_company_admin" : "user_demote_company_admin", entity: "user_profiles", entityId: String(row.id) });
      toast(action === "make-company-admin" ? "Usuario promovido a admin da empresa." : "Admin removido do usuario.", "green");
    }
    if (action === "generate-access-code") {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await updateRecord("clients", String(row.id), { client_access_code: code, portal_enabled: true, active: true }, rows.clients ?? []);
      await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "portal_code_generate", entity: "clients", entityId: String(row.id) });
      toast(`Codigo do portal gerado: ${code}`, "green");
    }
    if (action === "upload-client-photo") {
      const file = await chooseImageFile();
      if (!file) return;
      if (!isDemoMode) {
        const headers = await internalAuthHeaders();
        const form = new FormData();
        form.append("file", file);
        form.append("client_id", String(row.id));
        const response = await fetch("/api/clients/photo", { method: "POST", headers, body: form });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Falha ao enviar foto.");
      } else {
        const imagePreview = await fileToDataUrlBrowser(file);
        await updateRecord("clients", String(row.id), {
          photo_url: imagePreview,
          updated_by: profile.id
        }, rows.clients ?? []);
      }
      await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "client_photo_upload", entity: "clients", entityId: String(row.id) });
      toast("Foto do cliente anexada ao cadastro.", "green");
      await refresh();
    }
    if (action === "generate-client-dossier" || action === "generate-client-dossier-spouse") {
      if (action === "generate-client-dossier-spouse" && !row.has_spouse) throw new Error("Este cliente não possui cônjuge marcado no cadastro.");
      await exportClientDossierPdf(row, rows, { includeSpouse: action === "generate-client-dossier-spouse" });
      await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: action === "generate-client-dossier-spouse" ? "client_dossier_spouse_export" : "client_dossier_export", entity: "clients", entityId: String(row.id) });
      toast(action === "generate-client-dossier-spouse" ? "Dossie com conjuge gerado." : "Dossie do cliente gerado.", "green");
    }
    if (action === "generate-client-dossier-excel") {
      exportClientDossierExcel(row, rows, { includeSpouse: Boolean(row.has_spouse) });
      await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "client_dossier_excel_export", entity: "clients", entityId: String(row.id) });
      toast("Dossie do cliente exportado em Excel.", "green");
    }
    if (action === "generate-client-sheet") {
      await exportClientSheetPdf(row, rows);
      await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "client_sheet_export", entity: "clients", entityId: String(row.id) });
      toast("Ficha do cliente gerada em PDF.", "green");
    }
    if (action === "export-client-contacts") {
      const exportRows = clientRowsForExport([row], rows.tags ?? [], rows.client_tags ?? [], rows.client_spouses ?? []);
      exportExcel(`contato-cliente-${text(row.name || row.full_name || row.id)}.xls`, exportRows);
      await createRecord<AnyRow>("client_exports", {
        company_id: profile.company_id,
        export_type: "Excel",
        scope: "Cliente individual",
        filters: { client_id: row.id },
        row_count: exportRows.length,
        created_by: profile.id
      }, rows.client_exports ?? []);
      toast("Contatos do cliente exportados.", "green");
    }
    if (action === "create-client-checklist") {
      const templates = rows.checklist_templates ?? [];
      const template = templates.find((item) => item.active !== false) ?? null;
      if (!template) throw new Error("Nenhum modelo de checklist ativo encontrado. Cadastre ou execute os seeds de modelos.");
      const result = await generateChecklistFromTemplate({
        profile,
        template,
        clientId: String(row.id),
        propertyId: null,
        serviceId: null,
        title: `Checklist - ${pickRowTitle(row)}`,
        templateItems: rows.checklist_template_items ?? [],
        existingChecklists: rows.generated_checklists ?? [],
        existingItems: rows.generated_checklist_items ?? []
      });
      await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "client_checklist_generate", entity: "generated_checklists", entityId: String(result.checklist.id) });
      toast(`Checklist gerado com ${result.count} itens.`, "green");
    }
    if (action === "duplicate-checklist-template") {
      const duplicate = await createRecord<AnyRow>("checklist_templates", {
        ...row,
        id: undefined,
        name: `${pickRowTitle(row)} - Copia`,
        is_global_default: false,
        is_editable: true,
        company_id: profile.company_id,
        created_by: profile.id
      }, rows.checklist_templates ?? []);
      const items = (rows.checklist_template_items ?? []).filter((item) => item.template_id === row.id);
      await Promise.all(items.map((item) => createRecord<AnyRow>("checklist_template_items", {
        ...item,
        id: undefined,
        template_id: duplicate.id,
        company_id: profile.company_id
      }, rows.checklist_template_items ?? [])));
      toast("Modelo duplicado para edicao.", "green");
    }
    if (action === "request-checklist-items") {
      await updateRecord(config.table, String(row.id), { status: "Aguardando cliente", visible_on_portal: true }, rows[config.table] ?? []);
      const related = (rows.generated_checklist_items ?? []).filter((item) => item.generated_checklist_id === row.id);
      await Promise.all(related.map((item) => updateRecord("generated_checklist_items", String(item.id), { status: "Solicitado ao cliente", visible_to_client: true }, rows.generated_checklist_items ?? [])));
      toast("Checklist liberado e itens solicitados ao cliente.", "green");
    }
    if (action === "create-pending") {
      const pending = await createRecord<AnyRow>("pending_items", {
        company_id: row.company_id ?? profile.company_id,
        property_id: row.property_id,
        title: `Conferencia tecnica: ${pickRowTitle(row)}`,
        description: text(row.recommended_action || row.status || "Revisar comparacao de areas."),
        category: "Geoprocessamento",
        priority: /exige|diverg/i.test(text(row.status)) ? "Alta" : "Media",
        status: "Aberta",
        visible_on_portal: false
      });
      await auditAction({ companyId: profile.company_id, userId: profile.id, userRole: profile.role, action: "technical_pending_create", entity: "pending_items", entityId: String(pending.id), newValue: pending });
      toast("Pendencia tecnica criada.", "green");
    }
    await refresh();
  }

  if (loading && !profile) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f4ec] text-sm font-black text-forest">Carregando Nex Rural...</div>;
  }

  if (!profile && portalOnly) {
    return (
      <ClientPortalLookup
        demoSeed={demoSeed}
        toast={toast}
        onAccess={(clientProfile, token, portalRows) => {
          setProfile(clientProfile);
          setPortalToken(token);
          if (portalRows) setRows(portalRows);
          setActive("portal");
        }}
      />
    );
  }

  if (!profile) return <LoginScreen onLogin={login} onStaffAccess={staffLogin} />;

  if (portalOnly && profile.role !== "cliente") {
    return (
      <main className="min-h-screen bg-[#f7f4ec] p-6">
        <Panel title="Portal exclusivo para cliente" action={<AppButton icon={LogOut} onClick={logout}>Sair</AppButton>}>
          <p className="text-sm font-semibold text-stone-600">Seu perfil atual e {roleLabels[profile.role]}. Acesse o painel interno pela rota principal.</p>
        </Panel>
      </main>
    );
  }

  const allowedModules = moduleConfigs.filter((config) => config.roles.includes(profile.role));
  const selected = active === "portal" ? null : allowedModules.find((config) => config.id === active);
  const ActiveIcon = active === "dashboard" ? LayoutDashboard : active === "workflow" ? ClipboardCheck : active === "documentos" ? FolderOpen : active === "modelos-docx" ? FileSignature : active === "geoprocessamento" ? Compass : active === "relatorios" ? BarChart3 : active === "configuracoes" ? Settings : selected?.icon ?? Home;

  const moduleMenuItems = allowedModules.map((config) => ({ id: config.id, label: config.label, icon: config.icon }));
  const itemById = (id: string, fallbackLabel?: string, fallbackIcon?: ElementType) => moduleMenuItems.find((item) => item.id === id) ?? { id, label: fallbackLabel ?? id, icon: fallbackIcon ?? Home };
  const menuGroups = portalOnly
    ? [{ title: "Portal", items: [{ id: "portal", label: "Portal", icon: Lock }] }]
    : [
        { title: "Inicio", items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }] },
        { title: "Operação", items: allInternalRoles.includes(profile.role) ? [{ id: "workflow", label: "Workflow", icon: ClipboardCheck }] : [] },
        { title: "Atendimento", items: [itemById("crm", "CRM", MessageSquare), itemById("pendencias", "Pendencias", AlertTriangle)].filter((item) => moduleMenuItems.some((module) => module.id === item.id)) },
        { title: "Clientes", items: [itemById("clientes", "Clientes", Users), itemById("tags-clientes", "Tags", BadgeCheck), itemById("vinculos-tags", "Clientes x Tags", BadgeCheck)].filter((item) => moduleMenuItems.some((module) => module.id === item.id)) },
        { title: "Imoveis e Terra", items: [itemById("imoveis", "Imoveis", Map), itemById("due-diligence", "Due Diligence", ShieldCheck), itemById("certidoes", "Certidoes", FileText)].filter((item) => moduleMenuItems.some((module) => module.id === item.id)) },
        { title: "Documentos e Checklists", items: [{ id: "modelos-docx", label: "Modelos DOCX", icon: FileSignature }, itemById("modelos-checklist", "Checklists", ListChecks), itemById("itens-checklist", "Itens", ClipboardCheck), itemById("checklists-gerados", "Checklists por Cliente", ListChecks), itemById("itens-gerados", "Documentos Solicitados", FileStack), { id: "documentos", label: "Biblioteca", icon: FolderOpen }] },
        { title: "Cartorio", items: [itemById("cartorio", "Cartorio", Landmark), itemById("protocolos", "Protocolos", Landmark), itemById("conferencias", "Conferencias", BadgeCheck), itemById("contratos-rurais", "Contratos Rurais", FileSignature)].filter((item) => item.id === "documentos" || moduleMenuItems.some((module) => module.id === item.id)) },
        { title: "Geo", items: [{ id: "geoprocessamento", label: "Geoprocessamento", icon: Compass }, itemById("sigef", "SIGEF", Compass), itemById("equipamentos", "Equipamentos", Wrench)].filter((item) => item.id === "geoprocessamento" || moduleMenuItems.some((module) => module.id === item.id)) },
        { title: "Orgaos Rurais", items: [itemById("car", "CAR", Sprout), itemById("ccir", "CCIR/SNCR", FileText), itemById("itr", "ITR/DITR", FileText), itemById("cib-nirf", "CIB/NIRF", FileText), itemById("aged", "AGED", Sprout), itemById("iterma", "ITERMA", Landmark)].filter((item) => moduleMenuItems.some((module) => module.id === item.id)) },
        { title: "Financeiro e Relatorios", items: [itemById("financeiro", "Financeiro", DollarSign), { id: "relatorios", label: "Relatorios", icon: BarChart3 }] },
        { title: "Administracao", items: [itemById("empresas", "Empresas", Home), itemById("usuarios", "Usuarios", Users), itemById("funcionarios", "Funcionários", Users), itemById("templates", "Templates", FileText), ...(companyAdminRoles.includes(profile.role) ? [{ id: "configuracoes", label: "Configuracoes", icon: Settings }] : [])].filter((item) => item.id === "configuracoes" || moduleMenuItems.some((module) => module.id === item.id)) }
      ].filter((group) => group.items.length > 0);
  const menu = menuGroups.flatMap((group) => group.items);

  return (
    <div className="min-h-screen bg-[#f7f4ec]">
      {toastState && (
        <div className="fixed right-4 top-4 z-50 max-w-sm rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
          <Badge tone={toastState.tone}>{toastState.message}</Badge>
        </div>
      )}
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-stone-200 bg-white/95 p-4 shadow-soft transition-transform lg:static lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="mb-6 flex items-center justify-between">
            <Logo />
            <button className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 lg:hidden" onClick={() => setMobileMenu(false)} aria-label="Fechar menu">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="scrollbar-thin h-[calc(100vh-120px)] space-y-3 overflow-y-auto pr-1">
            {menuGroups.map((group) => (
              <div key={group.title} className="rounded-xl border border-stone-100 bg-stone-50/70 p-2 transition hover:border-gold/30 hover:bg-white">
                <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-wide text-stone-400">{group.title}</p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActive(item.id);
                          setMobileMenu(false);
                        }}
                        className={`button-press flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition hover:translate-x-0.5 ${active === item.id ? "bg-forest text-white shadow-sm" : "text-stone-600 hover:bg-wheat hover:text-forest"}`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#f7f4ec]/90 px-4 py-3 backdrop-blur lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button className="rounded-lg bg-white p-2 text-forest shadow-sm lg:hidden" onClick={() => setMobileMenu(true)} aria-label="Abrir menu">
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-forest text-white">
                  <ActiveIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-stone-500">{portalOnly ? "Portal" : "Painel interno"}</p>
                  <h1 className="text-xl font-black text-forest">{portalOnly ? "Portal do Cliente" : menu.find((item) => item.id === active)?.label ?? "Dashboard"}</h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden text-right text-sm lg:block">
                  <p className="font-black text-forest">{profile.full_name}</p>
                  <p className="text-stone-500">{roleLabels[profile.role]}{profile.company_code ? ` - ${profile.company_code}` : ""}</p>
                </div>
                <AppButton icon={refreshLoading ? undefined : RefreshCw} variant="secondary" onClick={refresh} disabled={refreshLoading || logoutLoading}>
                  <span className="inline-flex items-center gap-2">
                    {refreshLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                    {refreshLoading ? "Atualizando" : "Atualizar"}
                  </span>
                </AppButton>
                <AppButton icon={LogOut} onClick={logout} disabled={logoutLoading}>
                  {logoutLoading ? "Saindo..." : "Sair"}
                </AppButton>
              </div>
            </div>
          </header>

          <section className="px-4 pb-24 pt-6 lg:px-8 lg:pb-6">
            {active === "dashboard" && <Dashboard rows={rows} />}
            {active === "portal" && <PortalModule profile={profile} rows={rows} refresh={refresh} toast={toast} portalToken={portalToken} />}
            {active === "documentos" && <DocumentsModule rows={rows} profile={profile} refresh={refresh} toast={toast} />}
            {active === "modelos-docx" && <DocumentEngineModule rows={rows} profile={profile} refresh={refresh} toast={toast} />}
            {active === "geoprocessamento" && <GeoModule rows={rows} profile={profile} refresh={refresh} toast={toast} />}
            {active === "workflow" && <WorkflowModule rows={rows} profile={profile} refresh={refresh} toast={toast} />}
            {active === "relatorios" && <ReportsModule rows={rows} auditRows={rows.audit_logs ?? []} />}
            {active === "configuracoes" && <SettingsModule profile={profile} rows={rows} refresh={refresh} toast={toast} />}
            {selected && profile && <CrudPanel config={selected} rows={rows[selected.table] ?? []} allRows={rows} profile={profile} onCreate={handleCreate} onUpdate={handleUpdate} onDelete={handleDelete} onRowAction={handleRowAction} />}
          </section>
        </main>
      </div>
    </div>
  );
}
