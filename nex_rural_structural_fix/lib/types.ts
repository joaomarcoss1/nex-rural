export type StatusTone = "green" | "amber" | "red" | "blue" | "gray";

export type ModuleId =
  | "dashboard"
  | "crm"
  | "clientes"
  | "imoveis"
  | "servicos"
  | "processos"
  | "protocolos"
  | "documentos"
  | "pendencias"
  | "agenda"
  | "vistorias"
  | "mapa"
  | "geoprocessamento"
  | "cartorio"
  | "due-diligence"
  | "certidoes"
  | "equipamentos"
  | "comercial"
  | "aged"
  | "iterma"
  | "contratos-rurais"
  | "equipe"
  | "financeiro"
  | "relatorios"
  | "portal"
  | "configuracoes";

export type Lead = {
  id: string;
  nome: string;
  telefone: string;
  cidade: string;
  interesse: string;
  origem: string;
  status: string;
  prioridade: string;
  valor: number;
  proximoContato: string;
};

export type Client = {
  id: string;
  nome: string;
  tipo: string;
  documento: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
  responsavel: string;
  status: string;
};

export type RuralProperty = {
  id: string;
  nome: string;
  cliente: string;
  municipio: string;
  estado: string;
  areaDeclarada: number;
  areaMedida: number;
  matricula: string;
  car: string;
  ccir: string;
  sigef: string;
  situacaoDocumental: string;
  situacaoAmbiental: string;
  situacaoTributaria: string;
  latitude: string;
  longitude: string;
};

export type Service = {
  id: string;
  cliente: string;
  imovel: string;
  tipo: string;
  responsavel: string;
  status: string;
  prioridade: string;
  inicio: string;
  previsao: string;
  valor: number;
  checklist: string[];
};

export type PendingItem = {
  id: string;
  titulo: string;
  categoria: string;
  cliente: string;
  imovel: string;
  responsavel: string;
  prazo: string;
  prioridade: string;
  status: string;
  portal: boolean;
};

export type Protocol = {
  id: string;
  orgao: string;
  numero: string;
  cliente: string;
  imovel: string;
  status: string;
  prazo: string;
  responsavel: string;
};

export type FinancialEntry = {
  id: string;
  cliente: string;
  servico: string;
  tipo: string;
  categoria: string;
  valor: number;
  vencimento: string;
  status: string;
};

export type GeoFile = {
  id: string;
  nome: string;
  tipo: string;
  categoria: string;
  imovel: string;
  servico: string;
  responsavel: string;
  dataEnvio: string;
  versao: string;
  status: string;
  portal: boolean;
  observacoes: string;
};

export type PropertyVertex = {
  id: string;
  imovel: string;
  codigo: string;
  sequencia: number;
  latitude: number;
  longitude: number;
  utmE: string;
  utmN: string;
  fuso: string;
  datum: string;
  altitude: number;
  tipoMarco: string;
  tipoLimite: string;
  confrontante: string;
  observacoes: string;
};

export type Neighbor = {
  id: string;
  imovel: string;
  nome: string;
  documento: string;
  tipo: string;
  imovelConfrontante: string;
  telefone: string;
  email: string;
  anuencia: string;
  trecho: string;
  vertices: string[];
  responsavel: string;
  dataContato: string;
};

export type Equipment = {
  id: string;
  nome: string;
  tipo: string;
  marca: string;
  modelo: string;
  serie: string;
  patrimonio: string;
  conservacao: string;
  responsavel: string;
  unidade: string;
  status: string;
  proximaManutencao: string;
  ultimaCalibracao: string;
};

export type RegistryRecord = {
  id: string;
  cliente: string;
  imovel: string;
  cartorio: string;
  municipio: string;
  matricula: string;
  ato: string;
  protocolo: string;
  prenotacao: string;
  prazoPrenotacao: string;
  emolumentos: number;
  status: string;
  responsavel: string;
};

export type RegistryRequirement = {
  id: string;
  registro: string;
  tipo: string;
  descricao: string;
  emissao: string;
  prazo: string;
  responsavel: string;
  status: string;
  documentos: string;
};

export type DueDiligenceCase = {
  id: string;
  cliente: string;
  imovel: string;
  proprietario: string;
  finalidade: string;
  tecnico: string;
  juridico: string;
  inicio: string;
  previsao: string;
  status: string;
  risco: string;
  conclusao: string;
  recomendacoes: string;
};

export type DueDiligenceItem = {
  id: string;
  caso: string;
  grupo: string;
  item: string;
  status: string;
  responsavel: string;
  risco: string;
  recomendacao: string;
};

export type Certificate = {
  id: string;
  cliente: string;
  imovel: string;
  tipo: string;
  orgao: string;
  municipio: string;
  estado: string;
  solicitacao: string;
  emissao: string;
  validade: string;
  status: string;
  custo: number;
  responsavel: string;
  portal: boolean;
};

export type OfficialCheck = {
  id: string;
  imovel: string;
  tipo: string;
  plataforma: string;
  data: string;
  responsavel: string;
  resultado: string;
  divergencia: string;
  status: string;
};

export type CommercialTemplate = {
  id: string;
  nome: string;
  tipo: string;
  variaveis: string[];
  status: string;
  ultimaAtualizacao: string;
};
