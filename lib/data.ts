import type {
  Certificate,
  Client,
  CommercialTemplate,
  DueDiligenceCase,
  DueDiligenceItem,
  Equipment,
  FinancialEntry,
  GeoFile,
  Lead,
  Neighbor,
  OfficialCheck,
  PendingItem,
  PropertyVertex,
  Protocol,
  RegistryRecord,
  RegistryRequirement,
  RuralProperty,
  Service
} from "./types";

export const roles = [
  "Admin Master",
  "Gestor / Coordenador",
  "Tecnico / Topografo",
  "Administrativo",
  "Financeiro",
  "Cliente"
];

export const leads: Lead[] = [
  {
    id: "LE-1048",
    nome: "Joao Ferreira da Silva",
    telefone: "(63) 99120-3344",
    cidade: "Araguaina",
    interesse: "Georreferenciamento",
    origem: "Indicacao",
    status: "Proposta enviada",
    prioridade: "Alta",
    valor: 18500,
    proximoContato: "2026-07-08"
  },
  {
    id: "LE-1049",
    nome: "Agropecuaria Horizonte Ltda.",
    telefone: "(62) 98810-7741",
    cidade: "Rio Verde",
    interesse: "CAR e ITR",
    origem: "Google",
    status: "Triagem",
    prioridade: "Media",
    valor: 7200,
    proximoContato: "2026-07-05"
  },
  {
    id: "LE-1050",
    nome: "Maria Oliveira Santos",
    telefone: "(65) 99642-1187",
    cidade: "Sinop",
    interesse: "Regularizacao fundiaria",
    origem: "WhatsApp",
    status: "Documentos solicitados",
    prioridade: "Alta",
    valor: 26000,
    proximoContato: "2026-07-06"
  }
];

export const clients: Client[] = [
  {
    id: "CL-2201",
    nome: "Joao Ferreira da Silva",
    tipo: "Pessoa fisica",
    documento: "123.456.789-10",
    cidade: "Araguaina",
    estado: "TO",
    telefone: "(63) 99120-3344",
    email: "joao.ferreira@example.com",
    responsavel: "Camila Rocha",
    status: "Ativo"
  },
  {
    id: "CL-2202",
    nome: "Maria Oliveira Santos",
    tipo: "Produtor rural",
    documento: "987.654.321-00",
    cidade: "Sinop",
    estado: "MT",
    telefone: "(65) 99642-1187",
    email: "maria.oliveira@example.com",
    responsavel: "Rafael Lima",
    status: "Ativo"
  },
  {
    id: "CL-2203",
    nome: "Agropecuaria Horizonte Ltda.",
    tipo: "Pessoa juridica",
    documento: "12.345.678/0001-90",
    cidade: "Rio Verde",
    estado: "GO",
    telefone: "(62) 98810-7741",
    email: "contato@horizonte.example.com",
    responsavel: "Bianca Martins",
    status: "Ativo"
  },
  {
    id: "CL-2204",
    nome: "Fazenda Boa Esperanca",
    tipo: "Empresa rural",
    documento: "45.234.112/0001-33",
    cidade: "Unaí",
    estado: "MG",
    telefone: "(38) 99133-2001",
    email: "administrativo@boaesperanca.example.com",
    responsavel: "Camila Rocha",
    status: "Com pendencia"
  }
];

export const properties: RuralProperty[] = [
  {
    id: "IM-3101",
    nome: "Fazenda Santa Luzia",
    cliente: "Joao Ferreira da Silva",
    municipio: "Araguaina",
    estado: "TO",
    areaDeclarada: 842.4,
    areaMedida: 839.9,
    matricula: "12.443",
    car: "TO-1702109-A12B34C56D",
    ccir: "901.123.456.789-0",
    sigef: "Aguardando certificacao",
    situacaoDocumental: "Em regularizacao",
    situacaoAmbiental: "Pendente",
    situacaoTributaria: "Regular",
    latitude: "-7.1908",
    longitude: "-48.2078"
  },
  {
    id: "IM-3102",
    nome: "Sitio Recanto Verde",
    cliente: "Maria Oliveira Santos",
    municipio: "Sinop",
    estado: "MT",
    areaDeclarada: 96.2,
    areaMedida: 96.2,
    matricula: "8.773",
    car: "MT-5107909-F88E21A90",
    ccir: "902.887.112.542-1",
    sigef: "Nao aplicavel",
    situacaoDocumental: "Pendente",
    situacaoAmbiental: "Em analise",
    situacaoTributaria: "Pendente",
    latitude: "-11.8604",
    longitude: "-55.5091"
  },
  {
    id: "IM-3103",
    nome: "Chacara Nova Vida",
    cliente: "Agropecuaria Horizonte Ltda.",
    municipio: "Rio Verde",
    estado: "GO",
    areaDeclarada: 54.8,
    areaMedida: 55.1,
    matricula: "33.210",
    car: "GO-5218805-B77D90K12",
    ccir: "903.144.442.981-2",
    sigef: "Certificado",
    situacaoDocumental: "Regular",
    situacaoAmbiental: "Regular",
    situacaoTributaria: "Regular",
    latitude: "-17.7923",
    longitude: "-50.9192"
  }
];

export const services: Service[] = [
  {
    id: "SV-4101",
    cliente: "Joao Ferreira da Silva",
    imovel: "Fazenda Santa Luzia",
    tipo: "Georreferenciamento",
    responsavel: "Andre Freitas",
    status: "Em levantamento tecnico",
    prioridade: "Alta",
    inicio: "2026-06-12",
    previsao: "2026-08-20",
    valor: 18500,
    checklist: ["Matricula atualizada", "CCIR", "CAR", "Levantamento de campo", "Memorial descritivo", "ART", "Protocolo SIGEF"]
  },
  {
    id: "SV-4102",
    cliente: "Maria Oliveira Santos",
    imovel: "Sitio Recanto Verde",
    tipo: "Regularizacao fundiaria",
    responsavel: "Camila Rocha",
    status: "Aguardando documentos",
    prioridade: "Alta",
    inicio: "2026-06-22",
    previsao: "2026-09-30",
    valor: 26000,
    checklist: ["Documentos pessoais", "Comprovantes de posse", "Confrontantes", "Planta", "Memorial", "Protocolo em orgao"]
  },
  {
    id: "SV-4103",
    cliente: "Agropecuaria Horizonte Ltda.",
    imovel: "Chacara Nova Vida",
    tipo: "ITR",
    responsavel: "Bianca Martins",
    status: "Protocolado",
    prioridade: "Media",
    inicio: "2026-07-01",
    previsao: "2026-07-25",
    valor: 4200,
    checklist: ["Dados do proprietario", "CCIR", "CAR", "Area tributavel", "Declaracao", "Recibo de entrega"]
  }
];

export const pendencies: PendingItem[] = [
  {
    id: "PD-6001",
    titulo: "Enviar matricula atualizada",
    categoria: "Documento",
    cliente: "Joao Ferreira da Silva",
    imovel: "Fazenda Santa Luzia",
    responsavel: "Camila Rocha",
    prazo: "2026-07-07",
    prioridade: "Alta",
    status: "Aguardando cliente",
    portal: true
  },
  {
    id: "PD-6002",
    titulo: "Validar divergencia de area medida",
    categoria: "Tecnico",
    cliente: "Joao Ferreira da Silva",
    imovel: "Fazenda Santa Luzia",
    responsavel: "Andre Freitas",
    prazo: "2026-07-10",
    prioridade: "Media",
    status: "Em andamento",
    portal: false
  },
  {
    id: "PD-6003",
    titulo: "Regularizar recibo do CAR",
    categoria: "Ambiental",
    cliente: "Maria Oliveira Santos",
    imovel: "Sitio Recanto Verde",
    responsavel: "Rafael Lima",
    prazo: "2026-07-04",
    prioridade: "Alta",
    status: "Atrasada",
    portal: true
  }
];

export const protocols: Protocol[] = [
  {
    id: "PR-8101",
    orgao: "SIGEF",
    numero: "SIGEF-2026-004281",
    cliente: "Joao Ferreira da Silva",
    imovel: "Fazenda Santa Luzia",
    status: "Em analise",
    prazo: "2026-07-28",
    responsavel: "Andre Freitas"
  },
  {
    id: "PR-8102",
    orgao: "Cartorio",
    numero: "CRT-2OF-99210",
    cliente: "Agropecuaria Horizonte Ltda.",
    imovel: "Chacara Nova Vida",
    status: "Aguardando exigencia",
    prazo: "2026-07-18",
    responsavel: "Bianca Martins"
  }
];

export const financialEntries: FinancialEntry[] = [
  {
    id: "FN-5001",
    cliente: "Joao Ferreira da Silva",
    servico: "Georreferenciamento",
    tipo: "Receita",
    categoria: "Servico contratado",
    valor: 9250,
    vencimento: "2026-07-12",
    status: "A receber"
  },
  {
    id: "FN-5002",
    cliente: "Maria Oliveira Santos",
    servico: "Regularizacao fundiaria",
    tipo: "Receita",
    categoria: "Parcela",
    valor: 6500,
    vencimento: "2026-07-01",
    status: "Vencido"
  },
  {
    id: "FN-5003",
    cliente: "Agropecuaria Horizonte Ltda.",
    servico: "ITR",
    tipo: "Receita",
    categoria: "Servico contratado",
    valor: 4200,
    vencimento: "2026-07-20",
    status: "Recebido"
  },
  {
    id: "FN-5004",
    cliente: "Operacao interna",
    servico: "Vistoria de campo",
    tipo: "Despesa",
    categoria: "Deslocamento",
    valor: 1180,
    vencimento: "2026-07-09",
    status: "A pagar"
  }
];

export const monthlyRevenue = [
  { mes: "Fev", receita: 38000, despesas: 11200 },
  { mes: "Mar", receita: 45500, despesas: 12900 },
  { mes: "Abr", receita: 52200, despesas: 14100 },
  { mes: "Mai", receita: 61000, despesas: 16200 },
  { mes: "Jun", receita: 74200, despesas: 19800 },
  { mes: "Jul", receita: 58900, despesas: 15100 }
];

export const serviceStatus = [
  { name: "Aguardando docs", value: 8 },
  { name: "Tecnico", value: 6 },
  { name: "Protocolado", value: 5 },
  { name: "Concluido", value: 11 }
];

export const productivity = [
  { nome: "Camila", tarefas: 28 },
  { nome: "Andre", tarefas: 21 },
  { nome: "Bianca", tarefas: 19 },
  { nome: "Rafael", tarefas: 17 }
];

export const auditLogs = [
  "Camila criou cliente Joao Ferreira da Silva",
  "Andre alterou status do servico SV-4101 para Em levantamento tecnico",
  "Bianca gerou relatorio financeiro de julho",
  "Cliente Maria enviou documento CAR",
  "Sistema marcou pagamento FN-5002 como vencido"
];

export const geoFiles: GeoFile[] = [
  {
    id: "GF-1001",
    nome: "Perimetro Fazenda Santa Luzia.geojson",
    tipo: "GeoJSON",
    categoria: "Arquivo geoespacial",
    imovel: "Fazenda Santa Luzia",
    servico: "Georreferenciamento",
    responsavel: "Andre Freitas",
    dataEnvio: "2026-07-02",
    versao: "v2",
    status: "Aprovado",
    portal: false,
    observacoes: "Poligono revisado apos campo."
  },
  {
    id: "GF-1002",
    nome: "Memorial descritivo.pdf",
    tipo: "PDF",
    categoria: "Memorial",
    imovel: "Fazenda Santa Luzia",
    servico: "Georreferenciamento",
    responsavel: "Andre Freitas",
    dataEnvio: "2026-07-01",
    versao: "v1",
    status: "Em analise",
    portal: true,
    observacoes: "Liberado ao cliente para conferencia."
  },
  {
    id: "GF-1003",
    nome: "ART levantamento.pdf",
    tipo: "ART/RRT",
    categoria: "ART/RRT",
    imovel: "Sitio Recanto Verde",
    servico: "Regularizacao fundiaria",
    responsavel: "Rafael Lima",
    dataEnvio: "2026-06-29",
    versao: "v1",
    status: "Final",
    portal: true,
    observacoes: "Documento assinado."
  }
];

export const propertyVertices: PropertyVertex[] = [
  { id: "VT-001", imovel: "Fazenda Santa Luzia", codigo: "M-001", sequencia: 1, latitude: -7.1851, longitude: -48.2114, utmE: "791234", utmN: "9205120", fuso: "22S", datum: "SIRGAS 2000", altitude: 246, tipoMarco: "Marco concreto", tipoLimite: "Cerca", confrontante: "Fazenda Santa Rita", observacoes: "Marco preservado" },
  { id: "VT-002", imovel: "Fazenda Santa Luzia", codigo: "M-002", sequencia: 2, latitude: -7.1813, longitude: -48.2031, utmE: "792148", utmN: "9205538", fuso: "22S", datum: "SIRGAS 2000", altitude: 251, tipoMarco: "Marco metalico", tipoLimite: "Estrada", confrontante: "Estrada vicinal", observacoes: "Acesso principal" },
  { id: "VT-003", imovel: "Fazenda Santa Luzia", codigo: "M-003", sequencia: 3, latitude: -7.1924, longitude: -48.1986, utmE: "792640", utmN: "9204310", fuso: "22S", datum: "SIRGAS 2000", altitude: 238, tipoMarco: "Ponto natural", tipoLimite: "Corrego", confrontante: "Sitio Agua Clara", observacoes: "Trecho com APP" },
  { id: "VT-004", imovel: "Fazenda Santa Luzia", codigo: "M-004", sequencia: 4, latitude: -7.1982, longitude: -48.2098, utmE: "791410", utmN: "9203669", fuso: "22S", datum: "SIRGAS 2000", altitude: 240, tipoMarco: "Marco concreto", tipoLimite: "Divisa seca", confrontante: "Gleba Sao Jorge", observacoes: "Requer anuencia" }
];

export const neighbors: Neighbor[] = [
  {
    id: "CF-001",
    imovel: "Fazenda Santa Luzia",
    nome: "Carlos Mendonca",
    documento: "555.120.991-88",
    tipo: "Pessoa fisica",
    imovelConfrontante: "Fazenda Santa Rita",
    telefone: "(63) 99111-9090",
    email: "carlos.mendonca@example.com",
    anuencia: "Solicitado",
    trecho: "M-001 a M-002",
    vertices: ["M-001", "M-002"],
    responsavel: "Camila Rocha",
    dataContato: "2026-07-01"
  },
  {
    id: "CF-002",
    imovel: "Fazenda Santa Luzia",
    nome: "Municipio de Araguaina",
    documento: "00.000.000/0001-01",
    tipo: "Orgao publico",
    imovelConfrontante: "Estrada vicinal",
    telefone: "(63) 0000-0000",
    email: "obras@araguaina.example.gov",
    anuencia: "Dispensado",
    trecho: "M-002 a M-003",
    vertices: ["M-002", "M-003"],
    responsavel: "Andre Freitas",
    dataContato: "2026-06-28"
  }
];

export const equipment: Equipment[] = [
  { id: "EQ-001", nome: "RTK Trimble R12", tipo: "GPS RTK", marca: "Trimble", modelo: "R12", serie: "TR-98211", patrimonio: "PAT-0044", conservacao: "Otimo", responsavel: "Andre Freitas", unidade: "Matriz", status: "Em campo", proximaManutencao: "2026-09-12", ultimaCalibracao: "2026-05-20" },
  { id: "EQ-002", nome: "Drone DJI Mavic 3E", tipo: "Drone", marca: "DJI", modelo: "Mavic 3 Enterprise", serie: "DJI-77621", patrimonio: "PAT-0081", conservacao: "Bom", responsavel: "Rafael Lima", unidade: "Matriz", status: "Disponivel", proximaManutencao: "2026-08-15", ultimaCalibracao: "2026-06-02" },
  { id: "EQ-003", nome: "Estacao Total Leica TS07", tipo: "Estacao total", marca: "Leica", modelo: "TS07", serie: "LC-12098", patrimonio: "PAT-0038", conservacao: "Bom", responsavel: "Almoxarifado", unidade: "Unidade GO", status: "Em manutencao", proximaManutencao: "2026-07-09", ultimaCalibracao: "2026-03-18" }
];

export const registryRecords: RegistryRecord[] = [
  { id: "CR-001", cliente: "Joao Ferreira da Silva", imovel: "Fazenda Santa Luzia", cartorio: "2 Oficio de Registro de Imoveis", municipio: "Araguaina", matricula: "12.443", ato: "Retificacao", protocolo: "CRT-88421", prenotacao: "PN-2026-441", prazoPrenotacao: "2026-07-19", emolumentos: 2840, status: "Com exigencia", responsavel: "Bianca Martins" },
  { id: "CR-002", cliente: "Agropecuaria Horizonte Ltda.", imovel: "Chacara Nova Vida", cartorio: "1 Registro de Imoveis", municipio: "Rio Verde", matricula: "33.210", ato: "Averbacao", protocolo: "CRT-99210", prenotacao: "PN-2026-512", prazoPrenotacao: "2026-08-02", emolumentos: 1370, status: "Prenotado", responsavel: "Camila Rocha" }
];

export const registryRequirements: RegistryRequirement[] = [
  { id: "EX-001", registro: "CR-001", tipo: "Nota devolutiva", descricao: "Apresentar anuencia do confrontante Carlos Mendonca.", emissao: "2026-07-02", prazo: "2026-07-12", responsavel: "Camila Rocha", status: "Aguardando cliente", documentos: "Anuencia assinada" },
  { id: "EX-002", registro: "CR-001", tipo: "Exigencia documental", descricao: "Atualizar reconhecimento de firma em procuracao.", emissao: "2026-07-02", prazo: "2026-07-09", responsavel: "Bianca Martins", status: "Aberta", documentos: "Procuracao atualizada" }
];

export const dueDiligenceCases: DueDiligenceCase[] = [
  { id: "DD-001", cliente: "Agropecuaria Horizonte Ltda.", imovel: "Chacara Nova Vida", proprietario: "Agropecuaria Horizonte Ltda.", finalidade: "Financiamento", tecnico: "Andre Freitas", juridico: "Bianca Martins", inicio: "2026-06-25", previsao: "2026-07-30", status: "Em analise cartorial", risco: "Medio", conclusao: "Em andamento", recomendacoes: "Regularizar certidao de onus e validar area registrada." },
  { id: "DD-002", cliente: "Maria Oliveira Santos", imovel: "Sitio Recanto Verde", proprietario: "Maria Oliveira Santos", finalidade: "Regularizacao", tecnico: "Rafael Lima", juridico: "Camila Rocha", inicio: "2026-07-01", previsao: "2026-08-10", status: "Pendencias identificadas", risco: "Alto", conclusao: "Pendente", recomendacoes: "Priorizar cadeia dominial e CAR divergente." }
];

export const dueDiligenceChecklist: DueDiligenceItem[] = [
  { id: "DDI-001", caso: "DD-001", grupo: "Documental", item: "Matricula atualizada", status: "Recebido", responsavel: "Bianca Martins", risco: "Baixo", recomendacao: "Analisar onus." },
  { id: "DDI-002", caso: "DD-001", grupo: "Registral", item: "Existencia de gravames", status: "Em analise", responsavel: "Bianca Martins", risco: "Medio", recomendacao: "Aguardar certidao." },
  { id: "DDI-003", caso: "DD-002", grupo: "Ambiental", item: "CAR divergente", status: "Com pendencia", responsavel: "Rafael Lima", risco: "Alto", recomendacao: "Retificar recibo CAR." },
  { id: "DDI-004", caso: "DD-002", grupo: "Riscos", item: "Herdeiros nao regularizados", status: "Solicitado", responsavel: "Camila Rocha", risco: "Alto", recomendacao: "Solicitar inventario." }
];

export const certificates: Certificate[] = [
  { id: "CE-001", cliente: "Joao Ferreira da Silva", imovel: "Fazenda Santa Luzia", tipo: "Matricula atualizada", orgao: "Cartorio", municipio: "Araguaina", estado: "TO", solicitacao: "2026-06-28", emissao: "2026-06-30", validade: "2026-07-30", status: "Valida", custo: 128, responsavel: "Bianca Martins", portal: true },
  { id: "CE-002", cliente: "Maria Oliveira Santos", imovel: "Sitio Recanto Verde", tipo: "Certidao ambiental", orgao: "SEMA", municipio: "Sinop", estado: "MT", solicitacao: "2026-06-20", emissao: "2026-06-22", validade: "2026-07-05", status: "Proxima do vencimento", custo: 90, responsavel: "Rafael Lima", portal: false },
  { id: "CE-003", cliente: "Agropecuaria Horizonte Ltda.", imovel: "Chacara Nova Vida", tipo: "Onus reais", orgao: "Cartorio", municipio: "Rio Verde", estado: "GO", solicitacao: "2026-05-12", emissao: "2026-05-15", validade: "2026-06-15", status: "Vencida", custo: 156, responsavel: "Bianca Martins", portal: true }
];

export const officialChecks: OfficialCheck[] = [
  { id: "OC-001", imovel: "Fazenda Santa Luzia", tipo: "Meu Imovel Rural", plataforma: "SNCR", data: "2026-07-01", responsavel: "Camila Rocha", resultado: "Area declarada divergente", divergencia: "Area divergente", status: "Com divergencia" },
  { id: "OC-002", imovel: "Chacara Nova Vida", tipo: "SIGEF", plataforma: "SIGEF", data: "2026-06-30", responsavel: "Andre Freitas", resultado: "Certificacao localizada", divergencia: "Sem divergencia", status: "Sem divergencia" }
];

export const commercialTemplates: CommercialTemplate[] = [
  { id: "TM-001", nome: "Proposta comercial de georreferenciamento", tipo: "Proposta comercial", variaveis: ["{{cliente_nome}}", "{{imovel_nome}}", "{{servico_valor}}"], status: "Ativo", ultimaAtualizacao: "2026-07-02" },
  { id: "TM-002", nome: "Contrato de prestacao de servicos rurais", tipo: "Contrato", variaveis: ["{{cliente_cpf_cnpj}}", "{{servico_tipo}}", "{{empresa_nome}}"], status: "Ativo", ultimaAtualizacao: "2026-06-25" },
  { id: "TM-003", nome: "Termo de entrega final", tipo: "Termo de entrega", variaveis: ["{{imovel_matricula}}", "{{responsavel_nome}}", "{{data_atual}}"], status: "Ativo", ultimaAtualizacao: "2026-06-18" }
];

export const ruralCalendarAlerts = [
  { titulo: "Prazo de prenotacao CR-001", tipo: "Cartorio", cliente: "Joao Ferreira da Silva", imovel: "Fazenda Santa Luzia", responsavel: "Bianca Martins", data: "2026-07-19", prioridade: "Alta", status: "Pendente" },
  { titulo: "Certidao ambiental vencendo", tipo: "Certidao", cliente: "Maria Oliveira Santos", imovel: "Sitio Recanto Verde", responsavel: "Rafael Lima", data: "2026-07-05", prioridade: "Alta", status: "Vencido" },
  { titulo: "Calibracao RTK Trimble R12", tipo: "Equipamento", cliente: "Interno", imovel: "-", responsavel: "Andre Freitas", data: "2026-09-12", prioridade: "Media", status: "Pendente" }
];

export const ownershipChain = [
  { ordem: 1, imovel: "Fazenda Santa Luzia", anterior: "Jose Pereira", atual: "Antonio Ferreira", tipo: "Compra e venda", registro: "R-02/8.441", data: "1998-04-12", area: "812 ha", inconsistencia: "Area menor que declarada" },
  { ordem: 2, imovel: "Fazenda Santa Luzia", anterior: "Antonio Ferreira", atual: "Joao Ferreira da Silva", tipo: "Inventario", registro: "R-05/12.443", data: "2014-09-03", area: "842,4 ha", inconsistencia: "Pendente retificacao" }
];

export const advancedAuditLogs = [
  "Andre importou vertices do arquivo coordenadas_santa_luzia.csv",
  "Bianca cadastrou nota devolutiva EX-001",
  "Sistema criou alerta de certidao vencida CE-003",
  "Rafael fez check-out do drone DJI Mavic 3E",
  "Camila liberou memorial descritivo no portal do cliente"
];
