import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar o seed.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
const notice = 'Modelo de apoio operacional. As exigencias podem variar conforme cartorio, orgao, municipio ou situacao do imovel. Revise antes de protocolar.'

const templates = [
  ['Checklist de Averbacao','Cartorio','Averbacao','Averbacao', ['Matricula atualizada do imovel','Documentos pessoais do proprietario','Documentos do conjuge, se aplicavel','Requerimento de averbacao','Comprovante de pagamento de emolumentos']],
  ['Checklist de Escritura e Registro','Cartorio','Escritura e Registro','Escritura publica', ['Documentos pessoais das partes','Estado civil e regime de casamento','Matricula atualizada','Certidoes fiscais quando exigidas','Comprovante de pagamento/impostos']],
  ['Checklist de Retificacao de Matricula','Cartorio','Retificacao','Retificacao de matricula', ['Matricula atualizada','Planta e memorial','ART/RRT','Anuencia de confrontantes','Requerimento de retificacao']],
  ['Checklist de Georreferenciamento','Geo','Georreferenciamento','Georreferenciamento', ['Matricula ou documento de posse','CAR e CCIR, se existentes','Levantamento de campo','Planta e memorial descritivo','ART/RRT','Planilha SIGEF/arquivo tecnico']],
  ['Checklist de SIGEF','Geo','SIGEF','Certificacao SIGEF', ['Planilha ODS/arquivo SIGEF','Planta e memorial','ART','Dados do responsavel tecnico','Declaracao/anuencias quando aplicavel']],
  ['Checklist de CAR','Ambiental','CAR','CAR', ['Documentos pessoais do proprietario','Comprovante de propriedade ou posse','Dados do imovel rural','Mapa/arquivo geo quando disponivel','Recibo CAR anterior, se retificacao']],
  ['Checklist de CCIR/SNCR','INCRA','CCIR/SNCR','CCIR', ['Dados do titular','Dados do imovel rural','Area total e exploracoes','Comprovante de cadastro anterior','Comprovante de taxa quando aplicavel']],
  ['Checklist de ITR/DITR','Fiscal','ITR/DITR','ITR', ['Dados do titular','CIB/NIRF','Areas tributaveis e isentas','Informacoes ambientais','Recibo/declaracao anterior']],
  ['Checklist de CIB/NIRF','Fiscal','CIB/NIRF','CIB', ['CPF/CNPJ do titular','Dados do imovel','Matricula/documento de posse','CCIR quando houver','Comprovante de situacao cadastral']],
  ['Checklist AGED - Produtor/Propriedade','AGED','AGED','Cadastro AGED', ['Documentos do produtor','Comprovante de propriedade ou posse','Dados da propriedade','Exploracoes pecuarias','Comprovantes sanitarios quando aplicavel']],
  ['Checklist ITERMA - Regularizacao Fundiaria','ITERMA','ITERMA','Regularizacao fundiaria', ['Documentos pessoais','Comprovacao de posse','Dados do imovel','Croqui/planta/memorial','Declaracoes e requerimentos']],
  ['Checklist de Usucapiao Rural','Cartorio','Usucapiao rural','Usucapiao rural', ['Documentos pessoais','Comprovantes de posse','Planta e memorial','Confrontantes','Certidoes e declaracoes']],
  ['Checklist de Inventario Rural','Cartorio','Inventario rural','Inventario rural', ['Documentos do falecido/herdeiros','Matricula do imovel','Certidoes','Dados do conjuge/herdeiros','Partilha/termo aplicavel']],
  ['Checklist de Due Diligence Rural','Dossie','Due diligence rural','Due diligence', ['Matricula atualizada e cadeia dominial','Certidoes do imovel e proprietarios','CAR, CCIR, ITR e CIB/NIRF','Planta, memorial e arquivos tecnicos','Pendencias financeiras, ambientais e cartoriais']],
  ['Checklist de Dossie Rural','Dossie','Dossie rural','Dossie', ['Dados do cliente','Dados do imovel','Documentos rurais','Documentos cartoriais','Relatorio final e pendencias']]
]

const { data: companies, error } = await supabase.from('companies').select('id')
if (error) throw error
for (const company of companies ?? []) {
  for (const [name, category, serviceType, procedureType, items] of templates) {
    let { data: existing } = await supabase.from('checklist_templates').select('id').eq('company_id', company.id).eq('name', name).maybeSingle()
    let templateId = existing?.id
    if (!templateId) {
      const { data: created, error: createError } = await supabase.from('checklist_templates').insert({ company_id: company.id, name, category, service_type: serviceType, procedure_type: procedureType, target_entity: 'Servico', is_global_default: true, is_editable: true, active: true, source_notice: notice }).select('id').single()
      if (createError) throw createError
      templateId = created.id
    }
    let order = 1
    for (const document_name of items) {
      const { data: itemExists } = await supabase.from('checklist_template_items').select('id').eq('template_id', templateId).eq('document_name', document_name).maybeSingle()
      if (!itemExists) {
        const { error: itemError } = await supabase.from('checklist_template_items').insert({ company_id: company.id, template_id: templateId, document_name, description: `Item de apoio para ${name}. Revise conforme cartorio/orgao competente.`, required: true, who_provides: document_name.toLowerCase().includes('planta') || document_name.toLowerCase().includes('art') ? 'Tecnico' : 'Cliente', visible_to_client: true, portal_instruction: `Envie ou confirme: ${document_name}.`, source_name: 'Modelo operacional editavel', sort_order: order })
        if (itemError) throw itemError
      }
      order++
    }
  }
}
console.log(`Seeds de checklists aplicados para ${companies?.length ?? 0} empresa(s).`)
