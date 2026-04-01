/**
 * Script de seed para criar 30 deals com histórico rico na org existente.
 *
 * Pré-requisitos:
 *   - Banco migrado + seed principal rodou (`pnpm prisma db seed`)
 *   - Uma organização + usuário OWNER já existem no banco
 *   - Pipeline com os 6 estágios padrão deve existir na org
 *
 * Execução:
 *   npx tsx prisma/scripts/seed-deals.ts
 *
 * Idempotente: limpa todos os registros com ID prefixado por "seed0000-" antes de recriar.
 */

import { PrismaClient } from '@prisma/client'

// Instância local para execução fora do contexto Next.js
const db = new PrismaClient()

// ============================================================
// CONSTANTES
// ============================================================

const SEED_PREFIX = 'seed0000'

// Nomes reais dos 6 estágios do pipeline da conta de desenvolvimento
const STAGE_NAMES = [
  'Novo Contato',
  'Qualificação',
  'Demo Agendada',
  'Proposta Enviada',
  'Negociação',
  'Fechamento',
] as const

type StageName = (typeof STAGE_NAMES)[number]

// ============================================================
// HELPERS
// ============================================================

/** Gera UUID determinístico com prefixo seed.
 * O sufixo numérico de 12 dígitos garante unicidade global entre todas as entidades.
 * Usa um namespace numérico simples: tipo (100-900) * 10000 + índice.
 */
function seedId(entity: string, index: number): string {
  const prefix = entity.slice(0, 4).toLowerCase().padEnd(4, '0')
  const suffix = String(index).padStart(12, '0')
  return `${SEED_PREFIX}-${prefix}-0000-0000-${suffix}`
}

/**
 * Gera ID único para entidades filhas de deals, evitando colisões quando o nome
 * da entidade + índice do deal têm mais de 4 caracteres combinados.
 * Usa o índice do deal como parte do sufixo de 12 dígitos (deal * 1000 + posição).
 */
function seedChildId(childType: 'dc' | 'dp' | 'act' | 'tsk' | 'apt', dealIdx: number, childIdx: number): string {
  const prefixes: Record<typeof childType, string> = {
    dc: 'dcnt',  // deal contact
    dp: 'dPrd',  // deal product
    act: 'actv',  // activity
    tsk: 'task',  // task
    apt: 'appt',  // appointment
  }
  const prefix = prefixes[childType]
  // Sufixo: 6 dígitos do dealIdx + 6 dígitos do childIdx
  const dealPart = String(dealIdx).padStart(6, '0')
  const childPart = String(childIdx).padStart(6, '0')
  return `${SEED_PREFIX}-${prefix}-0000-0000-${dealPart}${childPart}`
}

/** Retorna uma data relativa a hoje (dias negativos = passado) */
function daysFromNow(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

/** Retorna data no passado com hora específica (para ordenar atividades) */
function dateAt(daysAgo: number, hour: number, minute = 0): Date {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, minute, 0, 0)
  return date
}

/** Escolhe item de posição fixa em um array (evita aleatoriedade no seed) */
function pick<T>(array: T[], index: number): T {
  return array[index % array.length]
}

/** Escolhe os primeiros N elementos do array */
function takeFirst<T>(array: T[], count: number): T[] {
  return array.slice(0, Math.min(count, array.length))
}

// ============================================================
// DADOS ESTÁTICOS
// ============================================================

interface CompanyData {
  id: string
  name: string
  domain: string
  industry: string
  size: 'SIZE_1_10' | 'SIZE_11_50' | 'SIZE_50_PLUS'
}

const COMPANIES: CompanyData[] = [
  { id: seedId('comp', 0), name: 'TechNova Soluções', domain: 'technova.com.br', industry: 'Tecnologia', size: 'SIZE_11_50' },
  { id: seedId('comp', 1), name: 'Saúde+ Clínicas', domain: 'saudemais.com.br', industry: 'Saúde', size: 'SIZE_50_PLUS' },
  { id: seedId('comp', 2), name: 'EduPrime Ensino', domain: 'eduprime.com.br', industry: 'Educação', size: 'SIZE_11_50' },
  { id: seedId('comp', 3), name: 'LogiExpress Transportes', domain: 'logiexpress.com.br', industry: 'Logística', size: 'SIZE_50_PLUS' },
  { id: seedId('comp', 4), name: 'Bella Vista Imóveis', domain: 'bellavista.com.br', industry: 'Imobiliário', size: 'SIZE_1_10' },
  { id: seedId('comp', 5), name: 'AgroVerde Alimentos', domain: 'agroverde.com.br', industry: 'Agronegócio', size: 'SIZE_50_PLUS' },
  { id: seedId('comp', 6), name: 'FinControl Consultoria', domain: 'fincontrol.com.br', industry: 'Financeiro', size: 'SIZE_1_10' },
  { id: seedId('comp', 7), name: 'Digital Wave Marketing', domain: 'digitalwave.com.br', industry: 'Marketing', size: 'SIZE_11_50' },
  { id: seedId('comp', 8), name: 'Construtora Horizonte', domain: 'horizonte.eng.br', industry: 'Construção Civil', size: 'SIZE_50_PLUS' },
  { id: seedId('comp', 9), name: 'Pet & Cia Veterinária', domain: 'petecia.com.br', industry: 'Veterinária', size: 'SIZE_1_10' },
]

interface ContactData {
  id: string
  name: string
  email: string
  phone: string
  role: string
  isDecisionMaker: boolean
  companyIdx: number
}

// 3 contatos por empresa (30 total): posição 0 = decisor, 1 = influenciador, 2 = operacional
const CONTACTS_DATA: ContactData[] = [
  // TechNova (0)
  { id: seedId('cont', 0), name: 'Carlos Eduardo Silva', email: 'carlos.silva@technova.com.br', phone: '11987654321', role: 'CEO', isDecisionMaker: true, companyIdx: 0 },
  { id: seedId('cont', 1), name: 'Ana Paula Ferreira', email: 'ana.ferreira@technova.com.br', phone: '11976543210', role: 'CTO', isDecisionMaker: true, companyIdx: 0 },
  { id: seedId('cont', 2), name: 'Lucas Martins', email: 'lucas.martins@technova.com.br', phone: '11965432109', role: 'Gerente de Projetos', isDecisionMaker: false, companyIdx: 0 },
  // Saúde+ (1)
  { id: seedId('cont', 3), name: 'Dr. Marcos Oliveira', email: 'marcos.oliveira@saudemais.com.br', phone: '21987654321', role: 'Diretor Clínico', isDecisionMaker: true, companyIdx: 1 },
  { id: seedId('cont', 4), name: 'Patrícia Souza', email: 'patricia.souza@saudemais.com.br', phone: '21976543210', role: 'Gerente Administrativa', isDecisionMaker: true, companyIdx: 1 },
  { id: seedId('cont', 5), name: 'Renato Barbosa', email: 'renato.barbosa@saudemais.com.br', phone: '21965432109', role: 'Coordenador de TI', isDecisionMaker: false, companyIdx: 1 },
  // EduPrime (2)
  { id: seedId('cont', 6), name: 'Prof. Ricardo Lima', email: 'ricardo.lima@eduprime.com.br', phone: '31987654321', role: 'Diretor Acadêmico', isDecisionMaker: true, companyIdx: 2 },
  { id: seedId('cont', 7), name: 'Beatriz Nascimento', email: 'beatriz.nascimento@eduprime.com.br', phone: '31976543210', role: 'Coordenadora Pedagógica', isDecisionMaker: false, companyIdx: 2 },
  { id: seedId('cont', 8), name: 'Thiago Pereira', email: 'thiago.pereira@eduprime.com.br', phone: '31965432109', role: 'Gerente de TI', isDecisionMaker: true, companyIdx: 2 },
  // LogiExpress (3)
  { id: seedId('cont', 9), name: 'André Gomes', email: 'andre.gomes@logiexpress.com.br', phone: '41987654321', role: 'CEO', isDecisionMaker: true, companyIdx: 3 },
  { id: seedId('cont', 10), name: 'Claudia Farias', email: 'claudia.farias@logiexpress.com.br', phone: '41976543210', role: 'Diretora de Operações', isDecisionMaker: true, companyIdx: 3 },
  { id: seedId('cont', 11), name: 'Pedro Henrique Souza', email: 'pedro.souza@logiexpress.com.br', phone: '41965432109', role: 'Gerente de Logística', isDecisionMaker: false, companyIdx: 3 },
  // Bella Vista (4)
  { id: seedId('cont', 12), name: 'Rafael Cardoso', email: 'rafael.cardoso@bellavista.com.br', phone: '51987654321', role: 'Sócio-Fundador', isDecisionMaker: true, companyIdx: 4 },
  { id: seedId('cont', 13), name: 'Tatiana Moreira', email: 'tatiana.moreira@bellavista.com.br', phone: '51976543210', role: 'Corretora Sênior', isDecisionMaker: false, companyIdx: 4 },
  { id: seedId('cont', 14), name: 'Diego Nogueira', email: 'diego.nogueira@bellavista.com.br', phone: '51965432109', role: 'Gerente Comercial', isDecisionMaker: true, companyIdx: 4 },
  // AgroVerde (5)
  { id: seedId('cont', 15), name: 'João Paulo Rezende', email: 'joao.rezende@agroverde.com.br', phone: '62987654321', role: 'Diretor Geral', isDecisionMaker: true, companyIdx: 5 },
  { id: seedId('cont', 16), name: 'Sandra Melo', email: 'sandra.melo@agroverde.com.br', phone: '62976543210', role: 'Gerente de Produção', isDecisionMaker: false, companyIdx: 5 },
  { id: seedId('cont', 17), name: 'Henrique Bastos', email: 'henrique.bastos@agroverde.com.br', phone: '62965432109', role: 'Diretor Comercial', isDecisionMaker: true, companyIdx: 5 },
  // FinControl (6)
  { id: seedId('cont', 18), name: 'Rodrigo Campos', email: 'rodrigo.campos@fincontrol.com.br', phone: '71987654321', role: 'Sócio-Fundador', isDecisionMaker: true, companyIdx: 6 },
  { id: seedId('cont', 19), name: 'Adriana Pinto', email: 'adriana.pinto@fincontrol.com.br', phone: '71976543210', role: 'Consultora Sênior', isDecisionMaker: false, companyIdx: 6 },
  { id: seedId('cont', 20), name: 'Marcelo Andrade', email: 'marcelo.andrade@fincontrol.com.br', phone: '71965432109', role: 'Diretor de Consultoria', isDecisionMaker: true, companyIdx: 6 },
  // Digital Wave (7)
  { id: seedId('cont', 21), name: 'Felipe Araújo', email: 'felipe.araujo@digitalwave.com.br', phone: '81987654321', role: 'CEO', isDecisionMaker: true, companyIdx: 7 },
  { id: seedId('cont', 22), name: 'Gabriela Mendonça', email: 'gabriela.mendonca@digitalwave.com.br', phone: '81976543210', role: 'Diretora Criativa', isDecisionMaker: true, companyIdx: 7 },
  { id: seedId('cont', 23), name: 'Vinícius Brito', email: 'vinicius.brito@digitalwave.com.br', phone: '81965432109', role: 'Head de Performance', isDecisionMaker: false, companyIdx: 7 },
  // Construtora Horizonte (8)
  { id: seedId('cont', 24), name: 'Paulo Roberto Neves', email: 'paulo.neves@horizonte.eng.br', phone: '85987654321', role: 'Diretor de Engenharia', isDecisionMaker: true, companyIdx: 8 },
  { id: seedId('cont', 25), name: 'Mariana Tavares', email: 'mariana.tavares@horizonte.eng.br', phone: '85976543210', role: 'Gerente de Obras', isDecisionMaker: false, companyIdx: 8 },
  { id: seedId('cont', 26), name: 'Sérgio Barros', email: 'sergio.barros@horizonte.eng.br', phone: '85965432109', role: 'Diretor Comercial', isDecisionMaker: true, companyIdx: 8 },
  // Pet & Cia (9)
  { id: seedId('cont', 27), name: 'Dr. Renata Azevedo', email: 'renata.azevedo@petecia.com.br', phone: '91987654321', role: 'Veterinária Sócia', isDecisionMaker: true, companyIdx: 9 },
  { id: seedId('cont', 28), name: 'Matheus Guimarães', email: 'matheus.guimaraes@petecia.com.br', phone: '91976543210', role: 'Gerente da Loja', isDecisionMaker: false, companyIdx: 9 },
  { id: seedId('cont', 29), name: 'Luana Peixoto', email: 'luana.peixoto@petecia.com.br', phone: '91965432109', role: 'Veterinária', isDecisionMaker: false, companyIdx: 9 },
]

interface ProductData {
  id: string
  name: string
  description: string
  price: number
}

const PRODUCTS_DATA: ProductData[] = [
  { id: seedId('prod', 0), name: 'Consultoria Estratégica', description: 'Análise e planejamento estratégico para transformação digital', price: 15000 },
  { id: seedId('prod', 1), name: 'Implantação CRM', description: 'Setup completo do CRM com migração de dados e treinamento', price: 25000 },
  { id: seedId('prod', 2), name: 'Suporte Premium Mensal', description: 'Suporte técnico prioritário com SLA de 2h', price: 2500 },
  { id: seedId('prod', 3), name: 'Treinamento de Equipe', description: 'Capacitação presencial ou online para até 20 pessoas', price: 8000 },
  { id: seedId('prod', 4), name: 'Integração de Sistemas', description: 'Integração via API com ERPs, e-commerces e ferramentas externas', price: 18000 },
  { id: seedId('prod', 5), name: 'Automação de Marketing', description: 'Configuração de fluxos automatizados de email e WhatsApp', price: 12000 },
  { id: seedId('prod', 6), name: 'Dashboard Analytics', description: 'Painel customizado de BI com métricas do negócio', price: 9500 },
  { id: seedId('prod', 7), name: 'Licença Enterprise Anual', description: 'Licença anual com todas as funcionalidades desbloqueadas', price: 45000 },
]

const LOST_REASONS = [
  'Preço acima do orçamento',
  'Escolheu a concorrência',
  'Projeto adiado / sem timing',
  'Sem budget aprovado',
  'Sem retorno do cliente',
]

const TASK_TITLES = [
  'Ligar para confirmar reunião',
  'Enviar proposta comercial atualizada',
  'Agendar demo do produto',
  'Follow-up pós apresentação',
  'Preparar contrato para assinatura',
  'Revisar requisitos técnicos',
  'Enviar case de sucesso por email',
  'Visita técnica ao cliente',
  'Reunião de alinhamento interno',
  'Atualizar valores da proposta',
  'Enviar material de treinamento',
  'Verificar status do pagamento',
  'Agendar kickoff do projeto',
  'Enviar NDA para assinatura',
  'Preparar apresentação executiva',
]

const ACTIVITY_NOTES = [
  'Cliente demonstrou muito interesse na solução. Pediu para agendar uma demo para a equipe técnica.',
  'Reunião produtiva. Alinhamos escopo e cronograma. Próximo passo: enviar proposta formal.',
  'Ligação rápida para follow-up. Cliente está comparando com duas outras soluções no mercado.',
  'Enviada proposta comercial v2 com desconto de 10% para fechamento até o fim do mês.',
  'Cliente solicitou ajustes no contrato: cláusula de SLA e multa rescisória.',
  'Apresentação para o board da empresa. Feedback muito positivo do diretor financeiro.',
  'Demo técnica realizada com sucesso. Equipe de TI aprovou a integração sem ressalvas.',
  'Cliente pediu para adiar decisão para o próximo trimestre. Manter follow-up mensal.',
  'Negociação de preço em andamento. Cliente quer parcelamento em 6x.',
  'Kickoff realizado! Projeto começa na próxima segunda-feira.',
  'Cliente elogiou o atendimento e indicou para parceiro do mesmo segmento.',
  'Reunião cancelada pelo cliente. Reagendamos para a próxima semana.',
  'Enviamos o contrato assinado digitalmente. Aguardando retorno com assinatura do cliente.',
  'Primeiro pagamento confirmado. Ativando acessos e iniciando onboarding.',
  'Call de alinhamento: cliente quer incluir módulo adicional no escopo do projeto.',
]

const APPOINTMENT_TITLES = [
  'Demo do produto',
  'Reunião de discovery',
  'Alinhamento técnico',
  'Apresentação executiva',
  'Kickoff do projeto',
]

// ============================================================
// CONFIGURAÇÃO DOS 30 DEALS
// ============================================================

type DealStatusValue = 'OPEN' | 'IN_PROGRESS' | 'WON' | 'LOST' | 'PAUSED'
type DealPriorityValue = 'low' | 'medium' | 'high' | 'urgent'
type DiscountTypeValue = 'percentage' | 'fixed'

interface DealProductConfig {
  productIdx: number
  quantity: number
  discountType: DiscountTypeValue
  discountValue: number
}

interface SeedDealConfig {
  idx: number
  title: string
  stageKey: StageName
  status: DealStatusValue
  priority: DealPriorityValue
  value: number
  companyIdx: number
  contactIndices: number[]
  productConfigs?: DealProductConfig[]
  daysAgo: number
  expectedCloseDaysFromNow: number
  lostReasonIdx?: number
  notes?: string
}

// Distribuição: Novo Contato (6), Qualificação (6), Demo Agendada (5),
// Proposta Enviada (4), Negociação (5), Fechamento (4 — 2 WON + 2 LOST)
const DEAL_CONFIGS: SeedDealConfig[] = [
  // ── Novo Contato (6) ─────────────────────────────────────────────────────
  {
    idx: 0,
    title: 'Implantação CRM Completo',
    stageKey: 'Novo Contato',
    status: 'OPEN',
    priority: 'low',
    value: 25000,
    companyIdx: 0,
    contactIndices: [0],
    daysAgo: 2,
    expectedCloseDaysFromNow: 60,
  },
  {
    idx: 1,
    title: 'Consultoria de Processos',
    stageKey: 'Novo Contato',
    status: 'OPEN',
    priority: 'low',
    value: 15000,
    companyIdx: 1,
    contactIndices: [3],
    daysAgo: 4,
    expectedCloseDaysFromNow: 45,
    notes: 'Lead inbound via LinkedIn. Demonstrou interesse em automação.',
  },
  {
    idx: 2,
    title: 'Setup Inicial Plataforma',
    stageKey: 'Novo Contato',
    status: 'OPEN',
    priority: 'low',
    value: 8000,
    companyIdx: 2,
    contactIndices: [6],
    daysAgo: 1,
    expectedCloseDaysFromNow: 30,
  },
  {
    idx: 3,
    title: 'Automação de Atendimento',
    stageKey: 'Novo Contato',
    status: 'OPEN',
    priority: 'medium',
    value: 12000,
    companyIdx: 3,
    contactIndices: [9, 10],
    daysAgo: 5,
    expectedCloseDaysFromNow: 40,
    notes: 'Interesse em integrar WhatsApp com CRM para equipe de 15 atendentes.',
  },
  {
    idx: 4,
    title: 'Projeto de BI',
    stageKey: 'Novo Contato',
    status: 'OPEN',
    priority: 'low',
    value: 9500,
    companyIdx: 4,
    contactIndices: [12],
    daysAgo: 3,
    expectedCloseDaysFromNow: 50,
  },
  {
    idx: 5,
    title: 'Chatbot para Atendimento',
    stageKey: 'Novo Contato',
    status: 'OPEN',
    priority: 'medium',
    value: 18000,
    companyIdx: 5,
    contactIndices: [15],
    daysAgo: 7,
    expectedCloseDaysFromNow: 60,
    notes: 'Empresa quer reduzir volume de chamados no callcenter com IA.',
  },

  // ── Qualificação (6) ─────────────────────────────────────────────────────
  {
    idx: 6,
    title: 'Migração de ERP',
    stageKey: 'Qualificação',
    status: 'IN_PROGRESS',
    priority: 'medium',
    value: 45000,
    companyIdx: 6,
    contactIndices: [18, 19],
    daysAgo: 18,
    expectedCloseDaysFromNow: 30,
  },
  {
    idx: 7,
    title: 'Automação de Vendas',
    stageKey: 'Qualificação',
    status: 'IN_PROGRESS',
    priority: 'medium',
    value: 22000,
    companyIdx: 7,
    contactIndices: [21],
    daysAgo: 12,
    expectedCloseDaysFromNow: 25,
    notes: 'Equipe de 8 vendedores. Querem automatizar follow-up pós-demo.',
  },
  {
    idx: 8,
    title: 'Dashboard Gerencial',
    stageKey: 'Qualificação',
    status: 'IN_PROGRESS',
    priority: 'medium',
    value: 9500,
    companyIdx: 8,
    contactIndices: [24, 25],
    daysAgo: 20,
    expectedCloseDaysFromNow: 20,
  },
  {
    idx: 9,
    title: 'Integração WhatsApp + CRM',
    stageKey: 'Qualificação',
    status: 'IN_PROGRESS',
    priority: 'high',
    value: 35000,
    companyIdx: 9,
    contactIndices: [27],
    daysAgo: 15,
    expectedCloseDaysFromNow: 15,
    notes: 'Urgência real: contrato atual com concorrente vence em 30 dias.',
  },
  {
    idx: 10,
    title: 'Consultoria de Marketing Digital',
    stageKey: 'Qualificação',
    status: 'IN_PROGRESS',
    priority: 'low',
    value: 12000,
    companyIdx: 0,
    contactIndices: [1],
    daysAgo: 25,
    expectedCloseDaysFromNow: 30,
    // Sem atividade há 8 dias — bom para testar indicador de "X dias parado"
  },
  {
    idx: 11,
    title: 'Pacote Premium de Suporte',
    stageKey: 'Qualificação',
    status: 'IN_PROGRESS',
    priority: 'medium',
    value: 30000,
    companyIdx: 1,
    contactIndices: [4, 5],
    daysAgo: 30,
    expectedCloseDaysFromNow: 20,
    notes: 'Cliente atual migrando de plano. Potencial de upsell para Enterprise.',
  },

  // ── Demo Agendada (5) ─────────────────────────────────────────────────────
  {
    idx: 12,
    title: 'Licenciamento Enterprise',
    stageKey: 'Demo Agendada',
    status: 'IN_PROGRESS',
    priority: 'high',
    value: 45000,
    companyIdx: 2,
    contactIndices: [6, 7, 8],
    daysAgo: 20,
    expectedCloseDaysFromNow: 15,
  },
  {
    idx: 13,
    title: 'Plano de Expansão CRM',
    stageKey: 'Demo Agendada',
    status: 'IN_PROGRESS',
    priority: 'medium',
    value: 28000,
    companyIdx: 3,
    contactIndices: [9, 11],
    daysAgo: 22,
    expectedCloseDaysFromNow: 20,
    notes: 'Demo marcada para mostrar módulo de automação + pipeline visual.',
  },
  {
    idx: 14,
    title: 'Integração com E-commerce',
    stageKey: 'Demo Agendada',
    status: 'IN_PROGRESS',
    priority: 'high',
    value: 18000,
    companyIdx: 4,
    contactIndices: [12, 14],
    daysAgo: 18,
    expectedCloseDaysFromNow: 10,
  },
  {
    idx: 15,
    title: 'Revamp do Pipeline de Vendas',
    stageKey: 'Demo Agendada',
    status: 'IN_PROGRESS',
    priority: 'medium',
    value: 15000,
    companyIdx: 5,
    contactIndices: [15, 16],
    daysAgo: 24,
    expectedCloseDaysFromNow: 25,
    notes: 'Cliente atual com pipeline desatualizado. Demo focada em nova estrutura.',
  },
  {
    idx: 16,
    title: 'Desenvolvimento Customizado',
    stageKey: 'Demo Agendada',
    status: 'IN_PROGRESS',
    priority: 'urgent',
    value: 65000,
    companyIdx: 6,
    contactIndices: [18, 20],
    daysAgo: 15,
    expectedCloseDaysFromNow: 7,
    notes: 'Requisito específico: integração com sistema legado de ERP customizado.',
  },

  // ── Proposta Enviada (4) ──────────────────────────────────────────────────
  {
    idx: 17,
    title: 'Setup Multi-Filial',
    stageKey: 'Proposta Enviada',
    status: 'IN_PROGRESS',
    priority: 'high',
    value: 78000,
    companyIdx: 7,
    contactIndices: [21, 22],
    productConfigs: [
      { productIdx: 1, quantity: 1, discountType: 'percentage', discountValue: 5 },
      { productIdx: 3, quantity: 2, discountType: 'fixed', discountValue: 500 },
    ],
    daysAgo: 35,
    expectedCloseDaysFromNow: 10,
    notes: '3 filiais com dados separados. Proposta enviada com desconto de fidelidade.',
  },
  {
    idx: 18,
    title: 'Projeto IoT + CRM',
    stageKey: 'Proposta Enviada',
    status: 'IN_PROGRESS',
    priority: 'urgent',
    value: 120000,
    companyIdx: 8,
    contactIndices: [24, 25, 26],
    productConfigs: [
      { productIdx: 4, quantity: 1, discountType: 'percentage', discountValue: 10 },
      { productIdx: 7, quantity: 1, discountType: 'percentage', discountValue: 0 },
    ],
    daysAgo: 40,
    expectedCloseDaysFromNow: 5,
    notes: 'Proposta técnica complexa. Necessita aprovação do board executivo.',
  },
  {
    idx: 19,
    title: 'Contrato de Manutenção',
    stageKey: 'Proposta Enviada',
    status: 'IN_PROGRESS',
    priority: 'medium',
    value: 30000,
    companyIdx: 9,
    contactIndices: [27, 28],
    productConfigs: [
      { productIdx: 2, quantity: 12, discountType: 'percentage', discountValue: 8 },
    ],
    daysAgo: 28,
    expectedCloseDaysFromNow: 15,
    // Sem atividade há 10 dias — para testar indicador de inatividade
  },
  {
    idx: 20,
    title: 'POC Inteligência Artificial',
    stageKey: 'Proposta Enviada',
    status: 'IN_PROGRESS',
    priority: 'urgent',
    value: 45000,
    companyIdx: 0,
    contactIndices: [0, 2],
    productConfigs: [
      { productIdx: 0, quantity: 1, discountType: 'fixed', discountValue: 1000 },
      { productIdx: 5, quantity: 1, discountType: 'percentage', discountValue: 5 },
    ],
    daysAgo: 32,
    expectedCloseDaysFromNow: 3,
    notes: 'Proposta de PoC com prazo apertado. Cliente comparando com 1 concorrente.',
  },

  // ── Negociação (5) ───────────────────────────────────────────────────────
  {
    idx: 21,
    title: 'Implantação Fase 2',
    stageKey: 'Negociação',
    status: 'IN_PROGRESS',
    priority: 'high',
    value: 55000,
    companyIdx: 1,
    contactIndices: [3, 4],
    productConfigs: [
      { productIdx: 1, quantity: 1, discountType: 'percentage', discountValue: 5 },
      { productIdx: 3, quantity: 1, discountType: 'fixed', discountValue: 0 },
    ],
    daysAgo: 50,
    expectedCloseDaysFromNow: 7,
    notes: 'Cliente atual migrando para versão maior. Negociando desconto por fidelidade.',
  },
  {
    idx: 22,
    title: 'Suporte Técnico Anual',
    stageKey: 'Negociação',
    status: 'IN_PROGRESS',
    priority: 'medium',
    value: 28000,
    companyIdx: 2,
    contactIndices: [6, 8],
    productConfigs: [
      { productIdx: 2, quantity: 12, discountType: 'percentage', discountValue: 10 },
    ],
    daysAgo: 45,
    expectedCloseDaysFromNow: 5,
    notes: 'Renovação anual. Discutindo inclusão de horas de consultoria no pacote.',
  },
  {
    idx: 23,
    title: 'Treinamento Equipe Comercial',
    stageKey: 'Negociação',
    status: 'PAUSED',
    priority: 'medium',
    value: 16000,
    companyIdx: 3,
    contactIndices: [9],
    productConfigs: [
      { productIdx: 3, quantity: 2, discountType: 'fixed', discountValue: 800 },
    ],
    daysAgo: 60,
    expectedCloseDaysFromNow: 30,
    notes: 'Pausado aguardando orçamento Q2. Cliente confirmou interesse para próximo trimestre.',
  },
  {
    idx: 24,
    title: 'Consultoria Tributária Digital',
    stageKey: 'Negociação',
    status: 'IN_PROGRESS',
    priority: 'urgent',
    value: 95000,
    companyIdx: 4,
    contactIndices: [12, 13, 14],
    productConfigs: [
      { productIdx: 0, quantity: 2, discountType: 'percentage', discountValue: 8 },
      { productIdx: 4, quantity: 1, discountType: 'percentage', discountValue: 5 },
      { productIdx: 6, quantity: 1, discountType: 'fixed', discountValue: 500 },
    ],
    daysAgo: 55,
    expectedCloseDaysFromNow: 3,
    notes: 'Maior deal do trimestre. Jurídico do cliente revisando cláusulas contratuais.',
  },
  {
    idx: 25,
    title: 'Integração Logística',
    stageKey: 'Negociação',
    status: 'IN_PROGRESS',
    priority: 'high',
    value: 42000,
    companyIdx: 5,
    contactIndices: [15, 17],
    productConfigs: [
      { productIdx: 4, quantity: 1, discountType: 'percentage', discountValue: 7 },
      { productIdx: 1, quantity: 1, discountType: 'percentage', discountValue: 5 },
    ],
    daysAgo: 48,
    expectedCloseDaysFromNow: 10,
  },

  // ── Fechamento — WON (2) ─────────────────────────────────────────────────
  {
    idx: 26,
    title: 'Auditoria de Dados',
    stageKey: 'Fechamento',
    status: 'WON',
    priority: 'high',
    value: 35000,
    companyIdx: 6,
    contactIndices: [18, 19, 20],
    productConfigs: [
      { productIdx: 0, quantity: 1, discountType: 'percentage', discountValue: 0 },
      { productIdx: 6, quantity: 1, discountType: 'percentage', discountValue: 5 },
    ],
    daysAgo: 70,
    expectedCloseDaysFromNow: -10,
    notes: 'Fechado com sucesso após 70 dias. Cliente assinou digitalmente.',
  },
  {
    idx: 27,
    title: 'Projeto de Escalabilidade',
    stageKey: 'Fechamento',
    status: 'WON',
    priority: 'urgent',
    value: 150000,
    companyIdx: 7,
    contactIndices: [21, 22, 23],
    productConfigs: [
      { productIdx: 7, quantity: 1, discountType: 'percentage', discountValue: 10 },
      { productIdx: 1, quantity: 1, discountType: 'percentage', discountValue: 5 },
      { productIdx: 3, quantity: 3, discountType: 'fixed', discountValue: 1000 },
    ],
    daysAgo: 85,
    expectedCloseDaysFromNow: -5,
    notes: 'Maior contrato do ano. Inclui licença Enterprise + implantação + treinamento.',
  },

  // ── Fechamento — LOST (2) ────────────────────────────────────────────────
  {
    idx: 28,
    title: 'Capacitação Gestores',
    stageKey: 'Fechamento',
    status: 'LOST',
    priority: 'medium',
    value: 24000,
    companyIdx: 8,
    contactIndices: [24, 25],
    productConfigs: [
      { productIdx: 3, quantity: 3, discountType: 'percentage', discountValue: 5 },
    ],
    daysAgo: 60,
    expectedCloseDaysFromNow: -15,
    lostReasonIdx: 0, // Preço acima do orçamento
    notes: 'Cliente foi para concorrente com preço 20% menor. Sem margem para negociar.',
  },
  {
    idx: 29,
    title: 'Modernização de Infraestrutura',
    stageKey: 'Fechamento',
    status: 'LOST',
    priority: 'high',
    value: 85000,
    companyIdx: 9,
    contactIndices: [27, 28, 29],
    productConfigs: [
      { productIdx: 7, quantity: 1, discountType: 'percentage', discountValue: 0 },
      { productIdx: 4, quantity: 1, discountType: 'percentage', discountValue: 0 },
    ],
    daysAgo: 75,
    expectedCloseDaysFromNow: -20,
    lostReasonIdx: 2, // Projeto adiado / sem timing
    notes: 'Projeto cortado no orçamento anual da empresa. Possível retomada no próximo ano.',
  },
]

// ============================================================
// CLEANUP
// ============================================================

async function cleanup(): Promise<void> {
  console.log('[seed-deals] Iniciando limpeza de registros seed anteriores...')

  // Coleta IDs seed determinísticos
  const companyIds = COMPANIES.map((c) => c.id)
  const contactIds = CONTACTS_DATA.map((c) => c.id)
  const productIds = PRODUCTS_DATA.map((p) => p.id)
  const dealIds = DEAL_CONFIGS.map((d) => seedId('deal', d.idx))
  const lostReasonIds = LOST_REASONS.map((_, i) => seedId('lore', i))

  // Para entidades filhas dos deals, deleta cascateando pelo dealId ao invés de
  // tentar reconstruir todos os IDs compostos (evita divergência entre execuções)
  if (dealIds.length > 0) {
    await db.automationExecution.deleteMany({ where: { dealId: { in: dealIds } } })
    await db.appointment.deleteMany({ where: { dealId: { in: dealIds } } })
    await db.activity.deleteMany({ where: { dealId: { in: dealIds } } })
    await db.task.deleteMany({ where: { dealId: { in: dealIds } } })
    await db.dealProduct.deleteMany({ where: { dealId: { in: dealIds } } })
    await db.dealContact.deleteMany({ where: { dealId: { in: dealIds } } })
  }

  await db.deal.deleteMany({ where: { id: { in: dealIds } } })
  await db.product.deleteMany({ where: { id: { in: productIds } } })
  await db.contact.deleteMany({ where: { id: { in: contactIds } } })
  await db.company.deleteMany({ where: { id: { in: companyIds } } })
  await db.dealLostReason.deleteMany({ where: { id: { in: lostReasonIds } } })

  console.log('[seed-deals] Limpeza concluída.')
}

// ============================================================
// CRIAÇÃO DE ATIVIDADES POR ESTÁGIO
// ============================================================

type ActivityTypeValue =
  | 'note'
  | 'call'
  | 'email'
  | 'meeting'
  | 'stage_change'
  | 'product_added'
  | 'task_created'
  | 'task_completed'
  | 'deal_won'
  | 'deal_lost'

interface ActivitySpec {
  type: ActivityTypeValue
  content: string
  daysAgo: number
  metadata?: Record<string, string>
}

function buildActivities(config: SeedDealConfig, stageNames: Record<StageName, string>): ActivitySpec[] {
  const stageName = config.stageKey
  const baseDay = config.daysAgo

  // Atividade inicial de criação do lead
  const initial: ActivitySpec = {
    type: 'note',
    content: ACTIVITY_NOTES[config.idx % ACTIVITY_NOTES.length],
    daysAgo: baseDay,
  }

  if (stageName === 'Novo Contato') {
    return [initial]
  }

  const activities: ActivitySpec[] = [initial]

  // Qualificação: adicionamos calls e emails
  if (stageName === 'Qualificação') {
    activities.push({
      type: 'stage_change',
      content: `Movido para ${stageNames['Qualificação']}`,
      daysAgo: baseDay - 3,
      metadata: { fromStage: stageNames['Novo Contato'], toStage: stageNames['Qualificação'] },
    })
    activities.push({
      type: 'call',
      content: `Ligação de qualificação realizada. ${ACTIVITY_NOTES[(config.idx + 2) % ACTIVITY_NOTES.length]}`,
      daysAgo: baseDay - 5,
    })
    // Deals em Qualificação antigos ficam sem atividade recente (para testar idle indicator)
    if (config.daysAgo > 20) {
      activities.push({
        type: 'email',
        content: 'Enviado material de apresentação da plataforma por email.',
        daysAgo: baseDay - 8,
      })
    }
    return activities
  }

  // Demo Agendada
  if (stageName === 'Demo Agendada') {
    activities.push({
      type: 'stage_change',
      content: `Movido para ${stageNames['Qualificação']}`,
      daysAgo: baseDay - 3,
      metadata: { fromStage: stageNames['Novo Contato'], toStage: stageNames['Qualificação'] },
    })
    activities.push({
      type: 'call',
      content: 'Ligação de qualificação bem-sucedida. Cliente tem budget e urgência confirmados.',
      daysAgo: baseDay - 6,
    })
    activities.push({
      type: 'stage_change',
      content: `Movido para ${stageNames['Demo Agendada']}`,
      daysAgo: baseDay - 8,
      metadata: { fromStage: stageNames['Qualificação'], toStage: stageNames['Demo Agendada'] },
    })
    activities.push({
      type: 'meeting',
      content: `Demo agendada com equipe do cliente. ${ACTIVITY_NOTES[(config.idx + 5) % ACTIVITY_NOTES.length]}`,
      daysAgo: Math.max(1, baseDay - 12),
    })
    return activities
  }

  // Proposta Enviada
  if (stageName === 'Proposta Enviada') {
    activities.push({
      type: 'stage_change',
      content: `Movido para ${stageNames['Qualificação']}`,
      daysAgo: baseDay - 3,
      metadata: { fromStage: stageNames['Novo Contato'], toStage: stageNames['Qualificação'] },
    })
    activities.push({
      type: 'call',
      content: 'Qualificação detalhada. Identificados decisores e prazo de decisão.',
      daysAgo: baseDay - 7,
    })
    activities.push({
      type: 'meeting',
      content: 'Demo realizada com sucesso. Equipe técnica aprovou a solução.',
      daysAgo: baseDay - 12,
    })
    activities.push({
      type: 'stage_change',
      content: `Movido para ${stageNames['Proposta Enviada']}`,
      daysAgo: baseDay - 15,
      metadata: { fromStage: stageNames['Demo Agendada'], toStage: stageNames['Proposta Enviada'] },
    })
    activities.push({
      type: 'email',
      content: 'Enviada proposta comercial detalhada com cronograma e condições de pagamento.',
      daysAgo: baseDay - 18,
    })
    if (config.productConfigs && config.productConfigs.length > 0) {
      activities.push({
        type: 'product_added',
        content: `Produtos vinculados à proposta: ${config.productConfigs.length} item(s)`,
        daysAgo: baseDay - 20,
      })
    }
    // Deals com última atividade antiga para testar indicador de parado
    if (config.idx === 19) {
      // Contrato de Manutenção — última atividade há 10 dias
      return activities
    }
    activities.push({
      type: 'note',
      content: 'Cliente está analisando proposta internamente. Follow-up previsto em 5 dias.',
      daysAgo: Math.max(2, baseDay - 25),
    })
    return activities
  }

  // Negociação
  if (stageName === 'Negociação') {
    activities.push({
      type: 'call',
      content: 'Qualificação inicial. Identificado orçamento disponível.',
      daysAgo: baseDay - 5,
    })
    activities.push({
      type: 'meeting',
      content: 'Demo realizada. Apresentados cases de sucesso do setor.',
      daysAgo: baseDay - 12,
    })
    activities.push({
      type: 'email',
      content: 'Proposta comercial enviada com três opções de escopo e preço.',
      daysAgo: baseDay - 18,
    })
    if (config.productConfigs && config.productConfigs.length > 0) {
      activities.push({
        type: 'product_added',
        content: `${config.productConfigs.length} produto(s) adicionado(s) à proposta`,
        daysAgo: baseDay - 20,
      })
    }
    activities.push({
      type: 'stage_change',
      content: `Movido para ${stageNames['Negociação']}`,
      daysAgo: baseDay - 25,
      metadata: { fromStage: stageNames['Proposta Enviada'], toStage: stageNames['Negociação'] },
    })
    activities.push({
      type: 'call',
      content: ACTIVITY_NOTES[(config.idx + 8) % ACTIVITY_NOTES.length],
      daysAgo: baseDay - 30,
    })
    if (config.status === 'PAUSED') {
      activities.push({
        type: 'note',
        content: 'Deal pausado por solicitação do cliente. Orçamento bloqueado até próximo trimestre.',
        daysAgo: baseDay - 35,
      })
    } else {
      activities.push({
        type: 'meeting',
        content: 'Reunião de negociação final. Discutidas cláusulas contratuais e SLA.',
        daysAgo: Math.max(1, baseDay - 40),
      })
    }
    return activities
  }

  // Fechamento — WON
  if (stageName === 'Fechamento' && config.status === 'WON') {
    activities.push({ type: 'call', content: 'Qualificação. Oportunidade confirmada com alto potencial.', daysAgo: baseDay - 5 })
    activities.push({ type: 'meeting', content: 'Demo executada com excelente receptividade.', daysAgo: baseDay - 12 })
    activities.push({ type: 'email', content: 'Proposta formal enviada. Tres opções de contratação.', daysAgo: baseDay - 18 })
    if (config.productConfigs) {
      activities.push({ type: 'product_added', content: `Produtos finalizados para proposta: ${config.productConfigs.length} item(s)`, daysAgo: baseDay - 20 })
    }
    activities.push({
      type: 'stage_change',
      content: `Movido para ${stageNames['Negociação']}`,
      daysAgo: baseDay - 25,
      metadata: { fromStage: stageNames['Proposta Enviada'], toStage: stageNames['Negociação'] },
    })
    activities.push({ type: 'call', content: 'Negociação final. Acordado desconto adicional para pagamento à vista.', daysAgo: baseDay - 35 })
    activities.push({ type: 'meeting', content: 'Apresentação executiva para tomadores de decisão. Aprovação obtida!', daysAgo: baseDay - 45 })
    activities.push({
      type: 'stage_change',
      content: `Movido para ${stageNames['Fechamento']}`,
      daysAgo: baseDay - 50,
      metadata: { fromStage: stageNames['Negociação'], toStage: stageNames['Fechamento'] },
    })
    // deal_won é sempre a última atividade
    activities.push({
      type: 'deal_won',
      content: `Negociação ganha! Valor total: R$${config.value.toLocaleString('pt-BR')},00. Kickoff agendado.`,
      daysAgo: Math.max(1, baseDay - 55),
    })
    return activities
  }

  // Fechamento — LOST
  if (stageName === 'Fechamento' && config.status === 'LOST') {
    activities.push({ type: 'call', content: 'Qualificação inicial realizada.', daysAgo: baseDay - 5 })
    activities.push({ type: 'meeting', content: 'Demo apresentada ao time de decisão.', daysAgo: baseDay - 15 })
    activities.push({ type: 'email', content: 'Proposta enviada com condições comerciais detalhadas.', daysAgo: baseDay - 22 })
    activities.push({ type: 'call', content: 'Follow-up após proposta. Cliente pediu mais tempo para avaliar.', daysAgo: baseDay - 30 })
    activities.push({
      type: 'stage_change',
      content: `Movido para ${stageNames['Negociação']}`,
      daysAgo: baseDay - 38,
      metadata: { fromStage: stageNames['Proposta Enviada'], toStage: stageNames['Negociação'] },
    })
    activities.push({ type: 'note', content: 'Sinais negativos na última call. Cliente muito focado em preço.', daysAgo: baseDay - 45 })
    const lostReasonName = config.lostReasonIdx !== undefined ? LOST_REASONS[config.lostReasonIdx] : 'Motivo não informado'
    // deal_lost é sempre a última atividade
    activities.push({
      type: 'deal_lost',
      content: `Negociação perdida. Motivo: ${lostReasonName}`,
      daysAgo: Math.max(1, baseDay - 50),
    })
    return activities
  }

  return activities
}

// ============================================================
// CRIAÇÃO DE TASKS POR ESTÁGIO
// ============================================================

type TaskTypeValue = 'TASK' | 'MEETING' | 'CALL' | 'WHATSAPP' | 'VISIT' | 'EMAIL'

interface TaskSpec {
  title: string
  type: TaskTypeValue
  isCompleted: boolean
  daysFromNowDue: number // positivo = futuro, negativo = passado
}

function buildTasks(config: SeedDealConfig): TaskSpec[] {
  const stageKey = config.stageKey

  if (stageKey === 'Novo Contato') {
    // 0-1 task futura de follow-up
    if (config.idx % 3 === 0) return []
    return [
      { title: pick(TASK_TITLES, config.idx), type: 'CALL', isCompleted: false, daysFromNowDue: 3 },
    ]
  }

  if (stageKey === 'Qualificação') {
    return [
      { title: TASK_TITLES[config.idx % TASK_TITLES.length], type: 'EMAIL', isCompleted: true, daysFromNowDue: -(config.daysAgo - 10) },
      { title: pick(TASK_TITLES, config.idx + 1), type: 'CALL', isCompleted: false, daysFromNowDue: 5 },
    ]
  }

  if (stageKey === 'Demo Agendada') {
    return [
      { title: 'Preparar roteiro da demo', type: 'TASK', isCompleted: true, daysFromNowDue: -(config.daysAgo - 12) },
      { title: 'Agendar demo do produto', type: 'MEETING', isCompleted: true, daysFromNowDue: -(config.daysAgo - 8) },
      { title: 'Follow-up pós apresentação', type: 'CALL', isCompleted: false, daysFromNowDue: 2 },
    ]
  }

  if (stageKey === 'Proposta Enviada') {
    return [
      { title: 'Enviar proposta comercial atualizada', type: 'EMAIL', isCompleted: true, daysFromNowDue: -(config.daysAgo - 18) },
      { title: 'Revisar requisitos técnicos', type: 'TASK', isCompleted: true, daysFromNowDue: -(config.daysAgo - 15) },
      { title: 'Follow-up da proposta enviada', type: 'CALL', isCompleted: false, daysFromNowDue: 4 },
    ]
  }

  if (stageKey === 'Negociação') {
    return [
      { title: 'Enviar proposta comercial atualizada', type: 'EMAIL', isCompleted: true, daysFromNowDue: -(config.daysAgo - 20) },
      { title: 'Reunião de alinhamento interno', type: 'MEETING', isCompleted: true, daysFromNowDue: -(config.daysAgo - 30) },
      { title: 'Preparar contrato para assinatura', type: 'TASK', isCompleted: false, daysFromNowDue: 3 },
      { title: 'Verificar status do pagamento', type: 'CALL', isCompleted: false, daysFromNowDue: 1 },
    ]
  }

  if (stageKey === 'Fechamento' && config.status === 'WON') {
    return [
      { title: 'Preparar contrato para assinatura', type: 'TASK', isCompleted: true, daysFromNowDue: -(config.daysAgo - 40) },
      { title: 'Agendar kickoff do projeto', type: 'MEETING', isCompleted: true, daysFromNowDue: -(config.daysAgo - 55) },
      { title: 'Enviar NDA para assinatura', type: 'EMAIL', isCompleted: true, daysFromNowDue: -(config.daysAgo - 60) },
    ]
  }

  if (stageKey === 'Fechamento' && config.status === 'LOST') {
    return [
      { title: 'Ligar para confirmar reunião', type: 'CALL', isCompleted: true, daysFromNowDue: -(config.daysAgo - 30) },
      { title: 'Enviar case de sucesso por email', type: 'EMAIL', isCompleted: false, daysFromNowDue: -3 },
    ]
  }

  return []
}

// ============================================================
// CRIAÇÃO DE APPOINTMENTS POR ESTÁGIO
// ============================================================

type AppointmentStatusValue = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW'

interface AppointmentSpec {
  title: string
  description: string
  startDaysFromNow: number // positivo = futuro, negativo = passado
  durationHours: number
  status: AppointmentStatusValue
}

function buildAppointments(config: SeedDealConfig): AppointmentSpec[] {
  const stageKey = config.stageKey

  if (stageKey === 'Novo Contato' || stageKey === 'Qualificação') {
    // Qualificação: apenas 1/3 dos deals tem appointment agendado
    if (stageKey === 'Qualificação' && config.idx % 3 === 0) {
      return [{ title: 'Reunião de discovery', description: 'Entender necessidades e contexto do cliente', startDaysFromNow: 5, durationHours: 1, status: 'SCHEDULED' }]
    }
    return []
  }

  if (stageKey === 'Demo Agendada') {
    return [
      { title: 'Demo do produto', description: 'Demonstração completa da plataforma para equipe do cliente', startDaysFromNow: -(config.daysAgo - 14), durationHours: 1, status: 'COMPLETED' },
      { title: 'Alinhamento técnico', description: 'Reunião de acompanhamento com time de TI do cliente', startDaysFromNow: 7, durationHours: 1, status: 'SCHEDULED' },
    ]
  }

  if (stageKey === 'Proposta Enviada') {
    return [
      { title: 'Apresentação da proposta', description: 'Apresentar e detalhar proposta comercial enviada', startDaysFromNow: -(config.daysAgo - 20), durationHours: 1, status: 'COMPLETED' },
      { title: 'Reunião de esclarecimento', description: 'Tirar dúvidas sobre escopo e condições', startDaysFromNow: 3, durationHours: 1, status: 'SCHEDULED' },
    ]
  }

  if (stageKey === 'Negociação') {
    if (config.status === 'PAUSED') {
      return [
        { title: 'Reunião de retomada', description: 'Retomar negociação após aprovação de orçamento', startDaysFromNow: 30, durationHours: 1, status: 'SCHEDULED' },
      ]
    }
    return [
      { title: 'Apresentação executiva', description: 'Apresentação para tomadores de decisão', startDaysFromNow: -(config.daysAgo - 35), durationHours: 2, status: 'COMPLETED' },
      { title: 'Kickoff do projeto', description: 'Reunião de kick-off para início da implantação', startDaysFromNow: 5, durationHours: 1, status: 'SCHEDULED' },
    ]
  }

  if (stageKey === 'Fechamento' && config.status === 'WON') {
    return [
      { title: 'Apresentação executiva', description: 'Apresentação final para aprovação do board', startDaysFromNow: -(config.daysAgo - 50), durationHours: 2, status: 'COMPLETED' },
      { title: 'Kickoff do projeto', description: 'Início oficial do projeto contratado', startDaysFromNow: -(config.daysAgo - 60), durationHours: 1, status: 'COMPLETED' },
    ]
  }

  if (stageKey === 'Fechamento' && config.status === 'LOST') {
    return [
      { title: 'Demo do produto', description: 'Última tentativa de demonstração de valor', startDaysFromNow: -(config.daysAgo - 20), durationHours: 1, status: config.lostReasonIdx === 2 ? 'CANCELED' : 'NO_SHOW' },
    ]
  }

  return []
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

export async function seedDeals(): Promise<void> {
  console.log('[seed-deals] Iniciando seed de deals...')

  // ── 1. Resolver org e membros ──────────────────────────────────────────
  const ownerMember = await db.member.findFirst({
    where: { role: 'OWNER', status: 'ACCEPTED', userId: { not: null } },
    include: {
      organization: true,
      user: true,
    },
  })

  if (!ownerMember || !ownerMember.userId || !ownerMember.user) {
    throw new Error('[seed-deals] Nenhuma org com OWNER encontrada. Execute o seed principal primeiro.')
  }

  const org = ownerMember.organization
  const ownerId = ownerMember.userId

  // Busca todos os membros ACCEPTED para distribuir assignedTo entre eles
  const allMembers = await db.member.findMany({
    where: { organizationId: org.id, status: 'ACCEPTED', userId: { not: null } },
    select: { userId: true },
  })

  // IDs de usuários disponíveis para atribuição (nunca null após filtro)
  const memberUserIds = allMembers
    .map((member) => member.userId)
    .filter((uid): uid is string => uid !== null)

  if (memberUserIds.length === 0) {
    throw new Error('[seed-deals] Nenhum membro com userId encontrado na org.')
  }

  console.log(`[seed-deals] Org: "${org.name}" (${org.id})`)
  console.log(`[seed-deals] Membros disponíveis: ${memberUserIds.length}`)

  // ── 2. Resolver pipeline e stages ──────────────────────────────────────
  const pipeline = await db.pipeline.findFirst({
    where: { organizationId: org.id },
    include: { stages: { orderBy: { position: 'asc' } } },
  })

  if (!pipeline) {
    throw new Error('[seed-deals] Nenhum pipeline encontrado na org. Execute o seed principal primeiro.')
  }

  // Mapeia nome do stage para seu ID real
  const stageIdByName: Partial<Record<StageName, string>> = {}
  for (const stageName of STAGE_NAMES) {
    const found = pipeline.stages.find((stage) => stage.name === stageName)
    if (found) {
      stageIdByName[stageName] = found.id
    }
  }

  // Verifica se todos os estágios necessários existem
  const missingStages = STAGE_NAMES.filter((name) => !stageIdByName[name])
  if (missingStages.length > 0) {
    console.warn(`[seed-deals] Estágios não encontrados: ${missingStages.join(', ')}`)
    console.warn('[seed-deals] Estágios disponíveis:', pipeline.stages.map((s) => s.name).join(', '))
    throw new Error('[seed-deals] Pipeline incompleto. Verifique os nomes dos estágios.')
  }

  // Garante que todos os IDs estão presentes (narrowing após verificação acima)
  const resolvedStageIds = stageIdByName as Record<StageName, string>

  console.log('[seed-deals] Pipeline encontrado com', pipeline.stages.length, 'estágios')

  // ── 3. Cleanup ──────────────────────────────────────────────────────────
  await cleanup()

  // ── 4. Criar Companies ──────────────────────────────────────────────────
  console.log('[seed-deals] Criando 10 empresas...')
  await db.$transaction(
    COMPANIES.map((company) =>
      db.company.create({
        data: {
          id: company.id,
          name: company.name,
          domain: company.domain,
          industry: company.industry,
          size: company.size,
          organizationId: org.id,
        },
      })
    )
  )
  console.log('[seed-deals] 10 empresas criadas.')

  // ── 5. Criar Contacts ──────────────────────────────────────────────────
  console.log('[seed-deals] Criando 30 contatos...')
  await db.$transaction(
    CONTACTS_DATA.map((contact) => {
      const company = COMPANIES[contact.companyIdx]
      return db.contact.create({
        data: {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          role: contact.role,
          isDecisionMaker: contact.isDecisionMaker,
          companyId: company.id,
          organizationId: org.id,
          assignedTo: memberUserIds[contact.companyIdx % memberUserIds.length],
        },
      })
    })
  )
  console.log('[seed-deals] 30 contatos criados.')

  // ── 6. Criar Products ──────────────────────────────────────────────────
  console.log('[seed-deals] Criando 8 produtos...')
  await db.$transaction(
    PRODUCTS_DATA.map((product) =>
      db.product.create({
        data: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          organizationId: org.id,
        },
      })
    )
  )
  console.log('[seed-deals] 8 produtos criados.')

  // ── 7. Criar DealLostReasons ───────────────────────────────────────────
  console.log('[seed-deals] Criando 5 motivos de perda...')
  const lostReasonIds: Record<number, string> = {}

  await db.$transaction(
    LOST_REASONS.map((reason, index) => {
      const id = seedId('lore', index)
      lostReasonIds[index] = id
      return db.dealLostReason.create({
        data: { id, name: reason, organizationId: org.id },
      })
    })
  )
  console.log('[seed-deals] 5 motivos de perda criados.')

  // ── 8. Criar os 30 Deals com histórico ────────────────────────────────
  console.log('[seed-deals] Criando 30 deals com histórico...')

  let totalActivities = 0
  let totalTasks = 0
  let totalAppointments = 0
  let totalDealContacts = 0
  let totalDealProducts = 0

  for (const config of DEAL_CONFIGS) {
    const dealId = seedId('deal', config.idx)
    const stageId = resolvedStageIds[config.stageKey]

    // Distribui deals entre membros disponíveis de forma determinística
    const assignedUserId = memberUserIds[config.idx % memberUserIds.length]
    const companyData = COMPANIES[config.companyIdx]

    const createdAt = daysFromNow(-config.daysAgo)
    const expectedCloseDate = daysFromNow(config.expectedCloseDaysFromNow)

    // Cria o deal base
    await db.deal.create({
      data: {
        id: dealId,
        title: config.title,
        pipelineStageId: stageId,
        companyId: companyData.id,
        organizationId: org.id,
        assignedTo: assignedUserId,
        status: config.status,
        priority: config.priority,
        value: config.value,
        notes: config.notes ?? null,
        expectedCloseDate,
        lossReasonId: config.lostReasonIdx !== undefined ? lostReasonIds[config.lostReasonIdx] : null,
        createdAt,
        // Deal pausado tem pausedAt definido
        ...(config.status === 'PAUSED' ? { pausedAt: daysFromNow(-Math.floor(config.daysAgo * 0.3)) } : {}),
      },
    })

    // DealContacts ──────────────────────────────────────────────────────
    const contactRoles = ['Decisor', 'Influenciador', 'Comprador', 'Usuário Final', 'Sponsor']

    for (let roleIdx = 0; roleIdx < config.contactIndices.length; roleIdx++) {
      const contactIdx = config.contactIndices[roleIdx]
      const contact = CONTACTS_DATA[contactIdx]
      if (!contact) continue

      await db.dealContact.create({
        data: {
          id: seedChildId('dc', config.idx, roleIdx),
          dealId,
          contactId: contact.id,
          role: contactRoles[roleIdx % contactRoles.length],
          isPrimary: roleIdx === 0,
        },
      })
      totalDealContacts++
    }

    // DealProducts ──────────────────────────────────────────────────────
    if (config.productConfigs) {
      for (let prodIdx = 0; prodIdx < config.productConfigs.length; prodIdx++) {
        const prodConfig = config.productConfigs[prodIdx]
        const product = PRODUCTS_DATA[prodConfig.productIdx]
        if (!product) continue

        await db.dealProduct.create({
          data: {
            id: seedChildId('dp', config.idx, prodIdx),
            dealId,
            productId: product.id,
            quantity: prodConfig.quantity,
            unitPrice: product.price,
            discountType: prodConfig.discountType,
            discountValue: prodConfig.discountValue,
          },
        })
        totalDealProducts++
      }
    }

    // Activities ────────────────────────────────────────────────────────
    const stageDisplayNames: Record<StageName, string> = {
      'Novo Contato': 'Novo Contato',
      'Qualificação': 'Qualificação',
      'Demo Agendada': 'Demo Agendada',
      'Proposta Enviada': 'Proposta Enviada',
      'Negociação': 'Negociação',
      'Fechamento': 'Fechamento',
    }

    const activitySpecs = buildActivities(config, stageDisplayNames)

    for (let actIdx = 0; actIdx < activitySpecs.length; actIdx++) {
      const spec = activitySpecs[actIdx]
      await db.activity.create({
        data: {
          id: seedChildId('act', config.idx, actIdx),
          dealId,
          type: spec.type,
          content: spec.content,
          performedBy: ownerId,
          metadata: spec.metadata ?? undefined,
          createdAt: dateAt(spec.daysAgo, 9 + (actIdx % 8)),
        },
      })
      totalActivities++
    }

    // Tasks ─────────────────────────────────────────────────────────────
    const taskSpecs = buildTasks(config)

    for (let taskIdx = 0; taskIdx < taskSpecs.length; taskIdx++) {
      const spec = taskSpecs[taskIdx]
      await db.task.create({
        data: {
          id: seedChildId('tsk', config.idx, taskIdx),
          dealId,
          title: spec.title,
          type: spec.type,
          isCompleted: spec.isCompleted,
          assignedTo: assignedUserId,
          createdBy: ownerId,
          organizationId: org.id,
          dueDate: daysFromNow(spec.daysFromNowDue),
          createdAt,
        },
      })
      totalTasks++
    }

    // Appointments ──────────────────────────────────────────────────────
    const appointmentSpecs = buildAppointments(config)

    for (let apIdx = 0; apIdx < appointmentSpecs.length; apIdx++) {
      const spec = appointmentSpecs[apIdx]
      const startDate = daysFromNow(spec.startDaysFromNow)
      startDate.setHours(14, 0, 0, 0)
      const endDate = new Date(startDate)
      endDate.setHours(startDate.getHours() + spec.durationHours)

      await db.appointment.create({
        data: {
          id: seedChildId('apt', config.idx, apIdx),
          dealId,
          organizationId: org.id,
          title: spec.title,
          description: spec.description,
          startDate,
          endDate,
          status: spec.status,
          assignedTo: assignedUserId,
          createdAt,
        },
      })
      totalAppointments++
    }

    console.log(`[seed-deals]   ✓ Deal ${config.idx + 1}/30: "${config.title}" (${config.stageKey} — ${config.status})`)
  }

  // ── 9. Resumo final ────────────────────────────────────────────────────
  console.log('\n[seed-deals] Seed concluído com sucesso!')
  console.log('[seed-deals] Resumo:')
  console.log(`[seed-deals]   Deals:         30`)
  console.log(`[seed-deals]   DealContacts:  ${totalDealContacts}`)
  console.log(`[seed-deals]   DealProducts:  ${totalDealProducts}`)
  console.log(`[seed-deals]   Activities:    ${totalActivities}`)
  console.log(`[seed-deals]   Tasks:         ${totalTasks}`)
  console.log(`[seed-deals]   Appointments:  ${totalAppointments}`)
}

// ============================================================
// EXECUÇÃO DIRETA
// ============================================================

seedDeals()
  .catch((error: unknown) => {
    if (error instanceof Error) {
      console.error('[seed-deals] Erro fatal:', error.message)
    } else {
      console.error('[seed-deals] Erro fatal:', error)
    }
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
