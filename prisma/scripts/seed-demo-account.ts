/**
 * Seed para criar uma conta demo completa com dados realistas.
 *
 * Pré-requisitos:
 *   - Banco migrado + seed principal rodou (`pnpm prisma db seed`)
 *   - Uma organização + usuário OWNER já existem no banco
 *
 * Execução:
 *   npx tsx prisma/scripts/seed-demo-account.ts
 *
 * ⚠️  Este script DELETA dados existentes (companies, contacts, deals, etc.)
 *     da organização antes de recriar. NÃO use em produção.
 */

import { db } from '@/_lib/prisma'
import { createDefaultPipeline } from '@/_data-access/pipeline/create-default-pipeline'

const DEMO_ORG_SLUG = 'empresa-demo'

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/** Retorna uma data relativa a hoje (dias negativos = passado) */
function daysFromNow(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

/** Retorna um horário específico em uma data relativa */
function dateTimeFromNow(days: number, hour: number, minute = 0): Date {
  const date = daysFromNow(days)
  date.setHours(hour, minute, 0, 0)
  return date
}

/** Escolhe item aleatório de um array */
function pick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

/** Escolhe N itens aleatórios únicos */
function pickN<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(count, array.length))
}

// ---------------------------------------------------------------------------
// DATA
// ---------------------------------------------------------------------------

const COMPANIES = [
  { name: 'TechNova Soluções', domain: 'technova.com.br', industry: 'Tecnologia', size: 'SIZE_11_50' as const },
  { name: 'Saúde+ Clínicas', domain: 'saudemais.com.br', industry: 'Saúde', size: 'SIZE_50_PLUS' as const },
  { name: 'EduPrime Ensino', domain: 'eduprime.com.br', industry: 'Educação', size: 'SIZE_11_50' as const },
  { name: 'LogiExpress Transportes', domain: 'logiexpress.com.br', industry: 'Logística', size: 'SIZE_50_PLUS' as const },
  { name: 'Bella Vista Imóveis', domain: 'bellavista.com.br', industry: 'Imobiliário', size: 'SIZE_1_10' as const },
  { name: 'AgroVerde Alimentos', domain: 'agroverde.com.br', industry: 'Agronegócio', size: 'SIZE_50_PLUS' as const },
  { name: 'FinControl Consultoria', domain: 'fincontrol.com.br', industry: 'Financeiro', size: 'SIZE_1_10' as const },
  { name: 'Digital Wave Marketing', domain: 'digitalwave.com.br', industry: 'Marketing', size: 'SIZE_11_50' as const },
  { name: 'Construtora Horizonte', domain: 'horizonte.eng.br', industry: 'Construção Civil', size: 'SIZE_50_PLUS' as const },
  { name: 'Pet & Cia Veterinária', domain: 'petecia.com.br', industry: 'Veterinária', size: 'SIZE_1_10' as const },
]

const CONTACTS_DATA = [
  // TechNova (0)
  { name: 'Carlos Eduardo Silva', email: 'carlos.silva@technova.com.br', phone: '11987654321', role: 'CEO', isDecisionMaker: true, companyIdx: 0 },
  { name: 'Ana Paula Ferreira', email: 'ana.ferreira@technova.com.br', phone: '11976543210', role: 'CTO', isDecisionMaker: true, companyIdx: 0 },
  { name: 'Lucas Martins', email: 'lucas.martins@technova.com.br', phone: '11965432109', role: 'Gerente de Projetos', isDecisionMaker: false, companyIdx: 0 },
  { name: 'Fernanda Costa', email: 'fernanda.costa@technova.com.br', phone: '11954321098', role: 'Analista de TI', isDecisionMaker: false, companyIdx: 0 },
  { name: 'Roberto Almeida', email: 'roberto.almeida@technova.com.br', phone: '11943210987', role: 'Diretor Financeiro', isDecisionMaker: true, companyIdx: 0 },
  { name: 'Juliana Rocha', email: 'juliana.rocha@technova.com.br', phone: '11932109876', role: 'Coordenadora de RH', isDecisionMaker: false, companyIdx: 0 },
  // Saúde+ (1)
  { name: 'Dr. Marcos Oliveira', email: 'marcos.oliveira@saudemais.com.br', phone: '21987654321', role: 'Diretor Clínico', isDecisionMaker: true, companyIdx: 1 },
  { name: 'Patrícia Souza', email: 'patricia.souza@saudemais.com.br', phone: '21976543210', role: 'Gerente Administrativa', isDecisionMaker: true, companyIdx: 1 },
  { name: 'Renato Barbosa', email: 'renato.barbosa@saudemais.com.br', phone: '21965432109', role: 'Coordenador de TI', isDecisionMaker: false, companyIdx: 1 },
  { name: 'Camila Duarte', email: 'camila.duarte@saudemais.com.br', phone: '21954321098', role: 'Enfermeira Chefe', isDecisionMaker: false, companyIdx: 1 },
  { name: 'Dr. Felipe Mendes', email: 'felipe.mendes@saudemais.com.br', phone: '21943210987', role: 'Diretor Médico', isDecisionMaker: true, companyIdx: 1 },
  { name: 'Isabela Correia', email: 'isabela.correia@saudemais.com.br', phone: '21932109876', role: 'Analista Financeira', isDecisionMaker: false, companyIdx: 1 },
  // EduPrime (2)
  { name: 'Prof. Ricardo Lima', email: 'ricardo.lima@eduprime.com.br', phone: '31987654321', role: 'Diretor Acadêmico', isDecisionMaker: true, companyIdx: 2 },
  { name: 'Beatriz Nascimento', email: 'beatriz.nascimento@eduprime.com.br', phone: '31976543210', role: 'Coordenadora Pedagógica', isDecisionMaker: false, companyIdx: 2 },
  { name: 'Thiago Pereira', email: 'thiago.pereira@eduprime.com.br', phone: '31965432109', role: 'Gerente de TI', isDecisionMaker: true, companyIdx: 2 },
  { name: 'Marina Santos', email: 'marina.santos@eduprime.com.br', phone: '31954321098', role: 'Secretária Acadêmica', isDecisionMaker: false, companyIdx: 2 },
  { name: 'Gustavo Ribeiro', email: 'gustavo.ribeiro@eduprime.com.br', phone: '31943210987', role: 'Diretor Financeiro', isDecisionMaker: true, companyIdx: 2 },
  { name: 'Larissa Moura', email: 'larissa.moura@eduprime.com.br', phone: '31932109876', role: 'Analista de Marketing', isDecisionMaker: false, companyIdx: 2 },
  // LogiExpress (3)
  { name: 'André Gomes', email: 'andre.gomes@logiexpress.com.br', phone: '41987654321', role: 'CEO', isDecisionMaker: true, companyIdx: 3 },
  { name: 'Claudia Farias', email: 'claudia.farias@logiexpress.com.br', phone: '41976543210', role: 'Diretora de Operações', isDecisionMaker: true, companyIdx: 3 },
  { name: 'Pedro Henrique Souza', email: 'pedro.souza@logiexpress.com.br', phone: '41965432109', role: 'Gerente de Logística', isDecisionMaker: false, companyIdx: 3 },
  { name: 'Vanessa Lopes', email: 'vanessa.lopes@logiexpress.com.br', phone: '41954321098', role: 'Analista de Compras', isDecisionMaker: false, companyIdx: 3 },
  { name: 'Márcio Teixeira', email: 'marcio.teixeira@logiexpress.com.br', phone: '41943210987', role: 'Diretor Comercial', isDecisionMaker: true, companyIdx: 3 },
  { name: 'Aline Vieira', email: 'aline.vieira@logiexpress.com.br', phone: '41932109876', role: 'Coordenadora de Frotas', isDecisionMaker: false, companyIdx: 3 },
  // Bella Vista (4)
  { name: 'Rafael Cardoso', email: 'rafael.cardoso@bellavista.com.br', phone: '51987654321', role: 'Sócio-Fundador', isDecisionMaker: true, companyIdx: 4 },
  { name: 'Tatiana Moreira', email: 'tatiana.moreira@bellavista.com.br', phone: '51976543210', role: 'Corretora Sênior', isDecisionMaker: false, companyIdx: 4 },
  { name: 'Diego Nogueira', email: 'diego.nogueira@bellavista.com.br', phone: '51965432109', role: 'Gerente Comercial', isDecisionMaker: true, companyIdx: 4 },
  { name: 'Priscila Ramos', email: 'priscila.ramos@bellavista.com.br', phone: '51954321098', role: 'Assistente Administrativa', isDecisionMaker: false, companyIdx: 4 },
  { name: 'Bruno Fonseca', email: 'bruno.fonseca@bellavista.com.br', phone: '51943210987', role: 'Corretor', isDecisionMaker: false, companyIdx: 4 },
  { name: 'Simone Aguiar', email: 'simone.aguiar@bellavista.com.br', phone: '51932109876', role: 'Diretora de Marketing', isDecisionMaker: true, companyIdx: 4 },
  // AgroVerde (5)
  { name: 'João Paulo Rezende', email: 'joao.rezende@agroverde.com.br', phone: '62987654321', role: 'Diretor Geral', isDecisionMaker: true, companyIdx: 5 },
  { name: 'Sandra Melo', email: 'sandra.melo@agroverde.com.br', phone: '62976543210', role: 'Gerente de Produção', isDecisionMaker: false, companyIdx: 5 },
  { name: 'Henrique Bastos', email: 'henrique.bastos@agroverde.com.br', phone: '62965432109', role: 'Diretor Comercial', isDecisionMaker: true, companyIdx: 5 },
  { name: 'Débora Cunha', email: 'debora.cunha@agroverde.com.br', phone: '62954321098', role: 'Analista de Qualidade', isDecisionMaker: false, companyIdx: 5 },
  { name: 'Fábio Monteiro', email: 'fabio.monteiro@agroverde.com.br', phone: '62943210987', role: 'Gerente de Logística', isDecisionMaker: false, companyIdx: 5 },
  { name: 'Luciana Dias', email: 'luciana.dias@agroverde.com.br', phone: '62932109876', role: 'Coordenadora Financeira', isDecisionMaker: true, companyIdx: 5 },
  // FinControl (6)
  { name: 'Rodrigo Campos', email: 'rodrigo.campos@fincontrol.com.br', phone: '71987654321', role: 'Sócio-Fundador', isDecisionMaker: true, companyIdx: 6 },
  { name: 'Adriana Pinto', email: 'adriana.pinto@fincontrol.com.br', phone: '71976543210', role: 'Consultora Sênior', isDecisionMaker: false, companyIdx: 6 },
  { name: 'Marcelo Andrade', email: 'marcelo.andrade@fincontrol.com.br', phone: '71965432109', role: 'Diretor de Consultoria', isDecisionMaker: true, companyIdx: 6 },
  { name: 'Carla Silveira', email: 'carla.silveira@fincontrol.com.br', phone: '71954321098', role: 'Analista Contábil', isDecisionMaker: false, companyIdx: 6 },
  { name: 'Eduardo Figueiredo', email: 'eduardo.figueiredo@fincontrol.com.br', phone: '71943210987', role: 'Gerente Administrativo', isDecisionMaker: false, companyIdx: 6 },
  { name: 'Natália Borges', email: 'natalia.borges@fincontrol.com.br', phone: '71932109876', role: 'Assistente Financeira', isDecisionMaker: false, companyIdx: 6 },
  // Digital Wave (7)
  { name: 'Felipe Araújo', email: 'felipe.araujo@digitalwave.com.br', phone: '81987654321', role: 'CEO', isDecisionMaker: true, companyIdx: 7 },
  { name: 'Gabriela Mendonça', email: 'gabriela.mendonca@digitalwave.com.br', phone: '81976543210', role: 'Diretora Criativa', isDecisionMaker: true, companyIdx: 7 },
  { name: 'Vinícius Brito', email: 'vinicius.brito@digitalwave.com.br', phone: '81965432109', role: 'Head de Performance', isDecisionMaker: false, companyIdx: 7 },
  { name: 'Amanda Freitas', email: 'amanda.freitas@digitalwave.com.br', phone: '81954321098', role: 'Gerente de Contas', isDecisionMaker: false, companyIdx: 7 },
  { name: 'Leandro Castro', email: 'leandro.castro@digitalwave.com.br', phone: '81943210987', role: 'Desenvolvedor Full Stack', isDecisionMaker: false, companyIdx: 7 },
  { name: 'Daniela Queiroz', email: 'daniela.queiroz@digitalwave.com.br', phone: '81932109876', role: 'Coordenadora de Social Media', isDecisionMaker: false, companyIdx: 7 },
  // Construtora Horizonte (8)
  { name: 'Paulo Roberto Neves', email: 'paulo.neves@horizonte.eng.br', phone: '85987654321', role: 'Diretor de Engenharia', isDecisionMaker: true, companyIdx: 8 },
  { name: 'Mariana Tavares', email: 'mariana.tavares@horizonte.eng.br', phone: '85976543210', role: 'Gerente de Obras', isDecisionMaker: false, companyIdx: 8 },
  { name: 'Sérgio Barros', email: 'sergio.barros@horizonte.eng.br', phone: '85965432109', role: 'Diretor Comercial', isDecisionMaker: true, companyIdx: 8 },
  { name: 'Cristina Machado', email: 'cristina.machado@horizonte.eng.br', phone: '85954321098', role: 'Arquiteta', isDecisionMaker: false, companyIdx: 8 },
  { name: 'Alexandre Fontes', email: 'alexandre.fontes@horizonte.eng.br', phone: '85943210987', role: 'Coordenador de Suprimentos', isDecisionMaker: false, companyIdx: 8 },
  { name: 'Eliane Carvalho', email: 'eliane.carvalho@horizonte.eng.br', phone: '85932109876', role: 'Diretora Financeira', isDecisionMaker: true, companyIdx: 8 },
  // Pet & Cia (9)
  { name: 'Dr. Renata Azevedo', email: 'renata.azevedo@petecia.com.br', phone: '91987654321', role: 'Veterinária Sócia', isDecisionMaker: true, companyIdx: 9 },
  { name: 'Matheus Guimarães', email: 'matheus.guimaraes@petecia.com.br', phone: '91976543210', role: 'Gerente da Loja', isDecisionMaker: false, companyIdx: 9 },
  { name: 'Luana Peixoto', email: 'luana.peixoto@petecia.com.br', phone: '91965432109', role: 'Veterinária', isDecisionMaker: false, companyIdx: 9 },
  { name: 'Otávio Nunes', email: 'otavio.nunes@petecia.com.br', phone: '91954321098', role: 'Sócio-Administrador', isDecisionMaker: true, companyIdx: 9 },
  { name: 'Cíntia Ferraz', email: 'cintia.ferraz@petecia.com.br', phone: '91943210987', role: 'Recepcionista', isDecisionMaker: false, companyIdx: 9 },
  { name: 'Rogério Lima', email: 'rogerio.lima@petecia.com.br', phone: '91932109876', role: 'Auxiliar Veterinário', isDecisionMaker: false, companyIdx: 9 },
]

const PRODUCTS_DATA = [
  { name: 'Consultoria Estratégica', description: 'Análise e planejamento estratégico para transformação digital', price: 15000 },
  { name: 'Implantação CRM', description: 'Setup completo do CRM com migração de dados e treinamento', price: 25000 },
  { name: 'Suporte Premium Mensal', description: 'Suporte técnico prioritário com SLA de 2h', price: 2500 },
  { name: 'Treinamento de Equipe', description: 'Capacitação presencial ou online para até 20 pessoas', price: 8000 },
  { name: 'Integração de Sistemas', description: 'Integração via API com ERPs, e-commerces e ferramentas externas', price: 18000 },
  { name: 'Automação de Marketing', description: 'Configuração de fluxos automatizados de email e WhatsApp', price: 12000 },
  { name: 'Dashboard Analytics', description: 'Painel customizado de BI com métricas do negócio', price: 9500 },
  { name: 'Licença Enterprise Anual', description: 'Licença anual com todas as funcionalidades desbloqueadas', price: 45000 },
]

const LOST_REASONS = [
  'Preço acima do orçamento',
  'Escolheu a concorrência',
  'Projeto adiado / sem timing',
  'Sem budget aprovado',
  'Sem retorno do cliente',
]

const DEAL_TITLES = [
  'Implantação CRM Completo',
  'Consultoria de Processos',
  'Migração de ERP',
  'Automação de Vendas',
  'Dashboard Gerencial',
  'Suporte Técnico Anual',
  'Treinamento Equipe Comercial',
  'Integração WhatsApp + CRM',
  'Projeto de BI',
  'Licenciamento Enterprise',
  'Setup Inicial Plataforma',
  'Consultoria de Marketing Digital',
  'Automação de Atendimento',
  'Plano de Expansão CRM',
  'Integração com E-commerce',
  'Revamp do Pipeline de Vendas',
  'Otimização de Processos',
  'Pacote Premium de Suporte',
  'Desenvolvimento Customizado',
  'Auditoria de Dados',
  'Setup Multi-Filial',
  'Capacitação Gestores',
  'Projeto IoT + CRM',
  'Contrato de Manutenção',
  'POC Inteligência Artificial',
  'Implantação Fase 2',
  'Consultoria Tributária Digital',
  'Integração Logística',
  'Painel de Indicadores',
  'Chatbot para Atendimento',
  'Migração de Base de Dados',
  'Projeto de Escalabilidade',
  'Setup de Analytics Avançado',
  'Treinamento de Liderança',
  'Pacote Onboarding Premium',
  'Consultoria de UX/UI',
  'API Gateway Setup',
  'Projeto de Segurança',
  'Plano de Contingência TI',
  'Automação de Relatórios',
  'Integração com Marketplace',
  'Setup de CRM para Saúde',
  'Projeto de Gamificação',
  'Consultoria de Crescimento',
  'Pacote de Integrações API',
  'Implantação Módulo Financeiro',
  'Setup de Telefonia IP',
  'Projeto Data Lake',
  'Modernização de Infraestrutura',
  'Consultoria de Compliance',
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
  'Ligação rápida para follow-up. Cliente está comparando com duas outras soluções.',
  'Enviada proposta comercial v2 com desconto de 10% para fechamento até o fim do mês.',
  'Cliente solicitou ajustes no contrato: cláusula de SLA e multa rescisória.',
  'Apresentação para o board da empresa. Feedback muito positivo do diretor financeiro.',
  'Demo técnica realizada com sucesso. Equipe de TI aprovou a integração.',
  'Cliente pediu para adiar decisão para o próximo trimestre. Manter follow-up mensal.',
  'Negociação de preço: cliente quer parcelamento em 6x. Vamos avaliar internamente.',
  'Kickoff realizado! Projeto começa na próxima segunda-feira.',
  'Cliente elogiou o atendimento e indicou para parceiro do mesmo segmento.',
  'Reunião cancelada pelo cliente. Reagendamos para a próxima semana.',
  'Enviamos o contrato assinado digitalmente. Aguardando retorno.',
  'Primeiro pagamento confirmado. Ativando acessos do cliente.',
  'Call de alinhamento: cliente quer incluir módulo adicional no escopo.',
]

const CONVERSATION_SCRIPTS: Array<{
  contactIdx: number
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}> = [
  {
    contactIdx: 0,
    messages: [
      { role: 'user', content: 'Oi, boa tarde! Vi o anúncio de vocês no LinkedIn.' },
      { role: 'assistant', content: 'Boa tarde! Que bom que nos encontrou! Sou o assistente da Kronos. Como posso te ajudar hoje?' },
      { role: 'user', content: 'Quero saber mais sobre o CRM de vocês. Temos uma equipe de 15 vendedores.' },
      { role: 'assistant', content: 'Ótimo! Para equipes desse tamanho, nosso plano Scale seria ideal. Ele suporta até 10 membros com recursos avançados de automação. Posso agendar uma demonstração para sua equipe?' },
      { role: 'user', content: 'Sim, pode ser! Na quinta-feira à tarde funciona?' },
      { role: 'assistant', content: 'Perfeito! Vou verificar a agenda e confirmar o horário. Você prefere às 14h ou 16h?' },
      { role: 'user', content: '14h está ótimo. Obrigado!' },
      { role: 'assistant', content: 'Anotado! Quinta-feira às 14h. Vou enviar o convite por email com o link da reunião. Algo mais que posso ajudar?' },
    ],
  },
  {
    contactIdx: 6,
    messages: [
      { role: 'user', content: 'Olá! Precisamos de um sistema para gerenciar nossos pacientes e agendamentos.' },
      { role: 'assistant', content: 'Olá, Dr. Marcos! Bem-vindo! Nosso CRM tem módulos específicos para gestão de clínicas. Quantas unidades vocês possuem?' },
      { role: 'user', content: 'São 3 clínicas aqui em São Paulo. Hoje usamos planilhas e está ficando inviável.' },
      { role: 'assistant', content: 'Entendo perfeitamente! Migrar de planilhas é um passo importante. Nosso sistema permite gerenciar contatos, agendamentos e pipeline de vendas tudo integrado. Posso explicar mais sobre as funcionalidades?' },
      { role: 'user', content: 'Sim, e preciso saber sobre integração com WhatsApp. Nossos pacientes preferem esse canal.' },
      { role: 'assistant', content: 'Temos integração nativa com WhatsApp! As mensagens dos pacientes chegam direto no inbox do CRM, e nosso agente de IA pode fazer o primeiro atendimento automaticamente. Quer que eu passe os detalhes técnicos?' },
      { role: 'user', content: 'Perfeito, manda sim. E qual o valor para 3 unidades?' },
      { role: 'assistant', content: 'Vou preparar uma proposta personalizada para o cenário de vocês e enviar por email ainda hoje. Para 3 unidades com WhatsApp, o plano Scale seria o mais indicado. Posso confirmar seu email para envio?' },
      { role: 'user', content: 'Pode mandar para marcos.oliveira@saudemais.com.br. Valeu!' },
      { role: 'assistant', content: 'Perfeito, Dr. Marcos! Enviarei a proposta ainda hoje. Qualquer dúvida, estou por aqui. Boa tarde!' },
    ],
  },
  {
    contactIdx: 12,
    messages: [
      { role: 'user', content: 'Boa noite, estou pesquisando CRMs para nossa instituição de ensino.' },
      { role: 'assistant', content: 'Boa noite, Prof. Ricardo! Que bom receber seu contato. Nosso CRM atende diversas instituições de ensino. O que vocês buscam resolver principalmente?' },
      { role: 'user', content: 'Precisamos controlar o funil de matrículas e acompanhar os leads que vêm do site.' },
      { role: 'assistant', content: 'Nosso pipeline é perfeito para isso! Você pode criar estágios como "Lead", "Visitou", "Matriculado" e acompanhar cada aluno em potencial. Além disso, temos automações para follow-up automático.' },
      { role: 'user', content: 'Interessante! Vocês têm algum case de educação?' },
      { role: 'assistant', content: 'Temos sim! Vou separar um case de uma escola que triplicou as conversões de matrícula usando nosso pipeline. Posso enviar por email?' },
      { role: 'user', content: 'Pode mandar. E gostaria de agendar uma reunião também.' },
      { role: 'assistant', content: 'Claro! Vou enviar o case e agendar uma demonstração. Qual o melhor horário para você essa semana?' },
    ],
  },
  {
    contactIdx: 18,
    messages: [
      { role: 'user', content: 'Bom dia! Sou o André da LogiExpress. Precisamos urgente de um CRM.' },
      { role: 'assistant', content: 'Bom dia, André! Entendo a urgência. Como posso ajudar a acelerar esse processo?' },
      { role: 'user', content: 'Temos 200 motoristas e precisamos gerenciar os contratos com clientes. Hoje é tudo no email.' },
      { role: 'assistant', content: 'Para o volume de vocês, o plano Enterprise seria ideal. Ele oferece gestão completa de deals, contratos e acompanhamento por equipe. A implantação pode ser feita em até 2 semanas.' },
      { role: 'user', content: 'Duas semanas? Ótimo. Quanto custa o Enterprise?' },
      { role: 'assistant', content: 'O plano Enterprise é R$1.197/mês com até 12 membros inclusos, ou R$12.927,90/ano (economia de 10%). Inclui suporte prioritário e onboarding dedicado.' },
      { role: 'user', content: 'Vou levar para o board. Me manda a proposta formal.' },
      { role: 'assistant', content: 'Vou preparar a proposta agora mesmo e enviar para seu email. Preciso do CNPJ da LogiExpress para incluir na proposta. Pode me passar?' },
      { role: 'user', content: 'CNPJ: 12.345.678/0001-90. Email: andre.gomes@logiexpress.com.br' },
      { role: 'assistant', content: 'Anotado! Enviarei a proposta em até 1 hora. Qualquer dúvida, pode chamar aqui. Boa sorte na reunião com o board!' },
    ],
  },
  {
    contactIdx: 24,
    messages: [
      { role: 'user', content: 'Oi! Somos uma imobiliária e precisamos organizar nossos leads.' },
      { role: 'assistant', content: 'Olá, Rafael! O mercado imobiliário é um dos que mais se beneficia de um CRM. Quantos corretores vocês têm?' },
      { role: 'user', content: 'Somos 5 corretores e recebemos uns 50 leads por mês.' },
      { role: 'assistant', content: 'Perfeito! Com o Kronos, cada corretor pode ter seu pipeline individual e vocês podem acompanhar o funil geral. O plano Essential atenderia bem com 3 membros inclusos. Quer conhecer mais?' },
      { role: 'user', content: 'Sim! Tem integração com portais imobiliários?' },
      { role: 'assistant', content: 'Temos integração via API que permite conectar com os principais portais. Os leads entram automaticamente no pipeline. Posso agendar uma demonstração focada no fluxo imobiliário?' },
    ],
  },
  {
    contactIdx: 30,
    messages: [
      { role: 'user', content: 'Boa tarde. Precisamos de um CRM para nosso agronegócio.' },
      { role: 'assistant', content: 'Boa tarde, João Paulo! O agronegócio tem necessidades específicas. Me conta mais sobre a operação de vocês?' },
      { role: 'user', content: 'Vendemos para distribuidores em todo o Brasil. São mais de 500 clientes ativos.' },
      { role: 'assistant', content: 'Impressionante! Para esse volume, precisamos de um plano robusto. O Enterprise suporta até 50.000 contatos e tem recursos de segmentação por região. Vocês já usam algum sistema?' },
      { role: 'user', content: 'Usamos um ERP antigo mas ele não tem CRM. Precisa integrar.' },
      { role: 'assistant', content: 'Entendido! Nossa equipe tem experiência em integrações com ERPs. Podemos fazer a migração de dados e conectar os dois sistemas via API. Vou preparar um escopo técnico para vocês avaliarem.' },
      { role: 'user', content: 'Ótimo, manda por email. E inclui o custo da integração também.' },
      { role: 'assistant', content: 'Claro! Vou incluir: licença Enterprise + custo de integração + migração de dados + treinamento. Envio até amanhã. Seu email é joao.rezende@agroverde.com.br, correto?' },
      { role: 'user', content: 'Isso mesmo. Obrigado!' },
      { role: 'assistant', content: 'Por nada! Enviarei tudo amanhã pela manhã. Tenha uma boa tarde, João Paulo!' },
    ],
  },
  {
    contactIdx: 36,
    messages: [
      { role: 'user', content: 'Ei, tudo bem? Sou da FinControl, uma consultoria financeira.' },
      { role: 'assistant', content: 'Tudo bem sim! Bem-vindo, Rodrigo! Como posso ajudar a FinControl hoje?' },
      { role: 'user', content: 'Precisamos controlar nossos projetos de consultoria e o pipeline de novos clientes.' },
      { role: 'assistant', content: 'Nosso CRM é perfeito para consultorias! Vocês podem criar pipelines customizados por tipo de serviço e acompanhar cada projeto. Quantos consultores são na equipe?' },
      { role: 'user', content: 'Somos 3 sócios e 2 analistas. Precisamos de algo simples mas eficiente.' },
      { role: 'assistant', content: 'O plano Essential seria ideal: até 4 membros, 25.000 contatos e todas as funcionalidades do CRM. Simples de usar e poderoso. R$397/mês. Quer testar?' },
    ],
  },
  {
    contactIdx: 42,
    messages: [
      { role: 'user', content: 'Olá! A Digital Wave é uma agência de marketing e precisamos gerenciar nossos clientes melhor.' },
      { role: 'assistant', content: 'Olá, Felipe! Agências de marketing são um público que adoramos atender. Me conta: quantos clientes ativos vocês gerenciam?' },
      { role: 'user', content: 'Uns 30 clientes ativos com contratos mensais. Precisamos controlar renovações e upsell.' },
      { role: 'assistant', content: 'Excelente! Com o Kronos, vocês podem ter um pipeline para novos clientes e outro para renovações. As tarefas automáticas lembram a equipe dos follow-ups. Quer ver como funciona?' },
      { role: 'user', content: 'Sim! Tem trial gratuito?' },
      { role: 'assistant', content: 'Oferecemos uma demonstração completa guiada onde mostramos o sistema com dados reais do seu segmento. Assim vocês já saem sabendo exatamente como usar. Posso agendar para essa semana?' },
      { role: 'user', content: 'Pode ser quarta-feira às 10h.' },
      { role: 'assistant', content: 'Anotado! Quarta às 10h. Vou enviar o convite para felipe.araujo@digitalwave.com.br. Até lá!' },
    ],
  },
  {
    contactIdx: 48,
    messages: [
      { role: 'user', content: 'Bom dia! Somos da Construtora Horizonte. Precisamos organizar nosso comercial.' },
      { role: 'assistant', content: 'Bom dia, Paulo Roberto! Construção civil tem ciclos de venda longos, certo? Nosso pipeline ajuda muito nesses casos.' },
      { role: 'user', content: 'Exatamente. Nossos projetos levam de 6 a 18 meses para fechar. Perdemos muito o controle.' },
      { role: 'assistant', content: 'Com o Kronos, cada obra/projeto vira um deal no pipeline. Vocês acompanham desde o primeiro contato até a assinatura do contrato, com todas as atividades registradas. Já pensaram em valor esperado por estágio?' },
      { role: 'user', content: 'Sim! Nossos contratos variam de R$500 mil a R$5 milhões. Precisa de algo robusto.' },
      { role: 'assistant', content: 'Nosso sistema suporta valores altos sem problema. O plano Enterprise com implantação dedicada seria o caminho. Posso preparar uma apresentação executiva para vocês?' },
      { role: 'user', content: 'Manda ver. E preciso que tenha acesso mobile também.' },
      { role: 'assistant', content: 'A plataforma é responsiva e funciona perfeitamente no celular. Vou incluir isso na apresentação. Me confirma o melhor email para envio?' },
      { role: 'user', content: 'paulo.neves@horizonte.eng.br. Valeu!' },
      { role: 'assistant', content: 'Perfeito! Enviarei a apresentação até amanhã. Qualquer dúvida, estou aqui. Tenha um ótimo dia!' },
    ],
  },
  {
    contactIdx: 54,
    messages: [
      { role: 'user', content: 'Oi! Sou a Dra. Renata da Pet & Cia. Precisamos de um sistema para controlar nossos clientes pet.' },
      { role: 'assistant', content: 'Olá, Dra. Renata! Que legal! Nosso CRM pode ajudar muito clínicas veterinárias. Quantos clientes vocês atendem por mês?' },
      { role: 'user', content: 'Uns 200 pets/mês entre consultas e banho e tosa. Precisamos de algo para lembrar das vacinas.' },
      { role: 'assistant', content: 'Podemos configurar tarefas automáticas para lembretes de vacina e retornos! Cada tutor vira um contato e o pet pode ficar nas notas. O plano Light com 1 membro e 5.000 contatos atenderia bem.' },
      { role: 'user', content: 'Quanto custa?' },
      { role: 'assistant', content: 'O plano Light é R$147/mês ou R$1.367,90/ano. Inclui pipeline, contatos, agendamentos e integração com WhatsApp. Perfeito para começar!' },
      { role: 'user', content: 'Vou conversar com meu sócio. Pode me mandar mais informações?' },
      { role: 'assistant', content: 'Claro! Vou enviar um resumo completo com preços e funcionalidades para seu email. Se tiverem dúvidas, é só chamar aqui!' },
    ],
  },
  {
    contactIdx: 2,
    messages: [
      { role: 'user', content: 'Olá, sou o Lucas da TechNova. O Carlos pediu para eu entrar em contato sobre a implantação.' },
      { role: 'assistant', content: 'Olá, Lucas! Sim, o Carlos mencionou que você seria o ponto focal técnico. Como posso ajudar?' },
      { role: 'user', content: 'Preciso entender os requisitos técnicos de integração. Usamos AWS e Kubernetes.' },
      { role: 'assistant', content: 'Nossa plataforma é SaaS na nuvem, então não precisa de infraestrutura local. A integração é via API REST com autenticação OAuth2. Temos SDKs para Node.js e Python.' },
      { role: 'user', content: 'Ótimo. E a migração de dados do nosso sistema atual? Temos uns 10 mil contatos.' },
      { role: 'assistant', content: '10 mil contatos é tranquilo. Temos um processo de importação via CSV ou via API em batch. A equipe de implantação faz o mapeamento dos campos. Normalmente leva 2-3 dias.' },
      { role: 'user', content: 'Perfeito. Vou reportar ao Carlos e voltamos para agendar o kickoff.' },
      { role: 'assistant', content: 'Combinado! Fico no aguardo. Qualquer dúvida técnica adicional, pode me chamar aqui. Bom trabalho, Lucas!' },
    ],
  },
  {
    contactIdx: 7,
    messages: [
      { role: 'user', content: 'Boa tarde! Vi que vocês têm integração com WhatsApp. Como funciona?' },
      { role: 'assistant', content: 'Boa tarde, Patrícia! A integração funciona assim: conectamos seu número do WhatsApp Business ao nosso inbox. Todas as mensagens chegam no CRM e podem ser respondidas de lá.' },
      { role: 'user', content: 'E o bot de IA que vi no site? Ele responde automaticamente?' },
      { role: 'assistant', content: 'Sim! Nosso agente de IA atende as primeiras mensagens, qualifica o lead e pode até agendar consultas. Se precisar de atendimento humano, ele transfere para a equipe.' },
      { role: 'user', content: 'Isso é exatamente o que precisamos! Nossos pacientes mandam muita mensagem fora do horário.' },
      { role: 'assistant', content: 'O agente de IA funciona 24/7 ou você pode configurar horário de funcionamento. Fora do expediente, ele pode enviar uma mensagem personalizada e criar uma tarefa para retorno no próximo dia útil.' },
      { role: 'user', content: 'Maravilha! Quero agendar uma demo focada no WhatsApp + IA.' },
      { role: 'assistant', content: 'Vou agendar! Temos horário disponível terça às 15h ou quarta às 11h. Qual prefere?' },
      { role: 'user', content: 'Terça às 15h. Pode incluir o Renato da TI na reunião?' },
      { role: 'assistant', content: 'Claro! Vou enviar o convite para você e para o Renato. Terça às 15h está confirmado. Até lá!' },
    ],
  },
  {
    contactIdx: 14,
    messages: [
      { role: 'user', content: 'E aí, tudo certo? Vi a proposta que mandaram pro Ricardo. Tenho umas dúvidas técnicas.' },
      { role: 'assistant', content: 'Tudo certo, Thiago! Pode mandar suas dúvidas que respondo na hora.' },
      { role: 'user', content: 'A gente usa TOTVS aqui. Tem como integrar?' },
      { role: 'assistant', content: 'Temos experiência com integração TOTVS via webservices. Mapeamos os campos de alunos e financeiro. É um projeto de integração que geralmente leva 3-4 semanas.' },
      { role: 'user', content: 'Fechado. E segurança dos dados? Temos LGPD pra cumprir.' },
      { role: 'assistant', content: 'Levamos LGPD muito a sério. Dados criptografados em trânsito e em repouso, servidores no Brasil, política de retenção configurável e DPA disponível para assinatura. Posso enviar nossa documentação de compliance?' },
      { role: 'user', content: 'Manda sim. Vou aprovar internamente e voltamos pra fechar.' },
      { role: 'assistant', content: 'Enviando agora! Qualquer outra dúvida de infra ou segurança, fico à disposição. Boa sorte na aprovação!' },
    ],
  },
  {
    contactIdx: 20,
    messages: [
      { role: 'user', content: 'Pedro aqui da LogiExpress. O André me pediu pra avaliar o CRM de vocês pro time de logística.' },
      { role: 'assistant', content: 'Olá, Pedro! Que bom. O André já conversou conosco sobre as necessidades da LogiExpress. Você cuida da parte de operações, certo?' },
      { role: 'user', content: 'Isso. Preciso saber se dá pra customizar os estágios do pipeline. Nosso processo é diferente.' },
      { role: 'assistant', content: 'Totalmente customizável! Você pode criar quantos estágios quiser, renomear, reordenar e definir cores. Muitos clientes de logística usam: Cotação → Análise → Contrato → Operação → Concluído.' },
      { role: 'user', content: 'Perfeito! E relatórios? O André quer ver conversão por estágio e tempo médio de fechamento.' },
      { role: 'assistant', content: 'Temos dashboard com métricas de funil: taxa de conversão, tempo médio em cada estágio, valor total do pipeline e previsão de receita. Tudo em tempo real.' },
      { role: 'user', content: 'Show. Vou dar o ok pro André fechar.' },
      { role: 'assistant', content: 'Excelente! Estamos à disposição para o kickoff assim que fecharem. Obrigado, Pedro!' },
    ],
  },
  {
    contactIdx: 32,
    messages: [
      { role: 'user', content: 'Olá! Sou o Henrique da AgroVerde. O João me passou o contato de vocês.' },
      { role: 'assistant', content: 'Olá, Henrique! O João Paulo mencionou que vocês estão avaliando o CRM para a área comercial. Me conta mais sobre suas necessidades?' },
      { role: 'user', content: 'Preciso gerenciar os distribuidores por região. Temos representantes no Sul, Sudeste e Centro-Oeste.' },
      { role: 'assistant', content: 'Podemos configurar o CRM com campos customizados por região e atribuir cada distribuidor ao representante responsável. O filtro por assignee permite que cada representante veja apenas seus clientes.' },
      { role: 'user', content: 'E tem como importar nossa base atual? São 500+ distribuidores.' },
      { role: 'assistant', content: 'Claro! Temos importação via CSV com mapeamento de campos. Para 500 distribuidores, o processo leva poucos minutos. Posso enviar o template de importação?' },
      { role: 'user', content: 'Manda o template que já vou preparando a base. Obrigado!' },
      { role: 'assistant', content: 'Enviando agora! O template tem instruções em cada coluna. Qualquer dúvida no preenchimento, me chama. Até mais!' },
    ],
  },
  {
    contactIdx: 44,
    messages: [
      { role: 'user', content: 'Oi! Sou a Gabriela da Digital Wave. O Felipe pediu pra eu ver a parte de automação de vocês.' },
      { role: 'assistant', content: 'Olá, Gabriela! A parte de automação é bem legal. Vocês querem automatizar o quê especificamente?' },
      { role: 'user', content: 'Quero automatizar os follow-ups com nossos clientes. Tipo: se não responde em 3 dias, mandar lembrete.' },
      { role: 'assistant', content: 'Nosso sistema de tarefas pode fazer isso! Você cria regras de follow-up automático por estágio do pipeline. Se o deal ficar parado X dias, cria uma tarefa pro responsável.' },
      { role: 'user', content: 'E por WhatsApp? Dá pra mandar mensagem automática?' },
      { role: 'assistant', content: 'Com o agente de IA, sim! Ele pode enviar follow-ups personalizados pelo WhatsApp baseado no contexto da conversa. É bem natural, os clientes nem percebem que é automático.' },
      { role: 'user', content: 'Demais! Vou falar com o Felipe pra incluir isso no pacote.' },
      { role: 'assistant', content: 'Ótimo! Vou atualizar a proposta incluindo o módulo de IA + WhatsApp. Qualquer dúvida, estou aqui!' },
    ],
  },
]

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seed Demo Account — Iniciando...\n')

  // -----------------------------------------------------------------------
  // 1. Buscar usuários (Owner + Admin)
  // -----------------------------------------------------------------------
  const OWNER_EMAIL = 'paulo.german777@gmail.com'
  const ADMIN_EMAIL = 'luizolmm@gmail.com'

  const user = await db.user.findUnique({ where: { email: OWNER_EMAIL } })
  if (!user) {
    console.error(`❌ Usuário "${OWNER_EMAIL}" não encontrado no banco.`)
    process.exit(1)
  }

  const adminUser = await db.user.findUnique({ where: { email: ADMIN_EMAIL } })
  const ownerId = user.id

  // -----------------------------------------------------------------------
  // 1.1 Criar (ou reutilizar) organização demo separada
  // -----------------------------------------------------------------------
  // Buscar plano Enterprise para grant (acesso total sem Stripe)
  const enterprisePlan = await db.plan.findUnique({ where: { slug: 'enterprise' } })
  if (!enterprisePlan) {
    console.error('❌ Plano "enterprise" não encontrado. Execute: pnpm prisma db seed')
    process.exit(1)
  }

  let org = await db.organization.findUnique({ where: { slug: DEMO_ORG_SLUG } })

  if (org) {
    // Garantir que o grant está configurado
    org = await db.organization.update({
      where: { id: org.id },
      data: {
        grantType: 'INTERNAL',
        planOverrideId: enterprisePlan.id,
      },
    })
    console.log(`📌 Org demo já existe: ${org.name} (${org.id}) — reutilizando`)
  } else {
    org = await db.organization.create({
      data: {
        name: 'Empresa Demo',
        slug: DEMO_ORG_SLUG,
        grantType: 'INTERNAL',
        planOverrideId: enterprisePlan.id,
      },
    })
    console.log(`📌 Org demo criada: ${org.name} (${org.id})`)
  }

  console.log(`📌 Plano: ${enterprisePlan.name} (grant: INTERNAL — sem Stripe)`)

  // Garantir OWNER membership
  await db.member.upsert({
    where: { organizationId_email: { organizationId: org.id, email: OWNER_EMAIL } },
    create: {
      organizationId: org.id,
      userId: ownerId,
      email: OWNER_EMAIL,
      role: 'OWNER',
      status: 'ACCEPTED',
    },
    update: { userId: ownerId, role: 'OWNER', status: 'ACCEPTED' },
  })
  console.log(`📌 Owner: ${user.fullName ?? user.email} (${ownerId})`)

  // Garantir ADMIN membership
  if (!adminUser) {
    console.warn(`  ⚠️ Usuário "${ADMIN_EMAIL}" não encontrado. Pulando ADMIN.`)
  } else {
    await db.member.upsert({
      where: { organizationId_email: { organizationId: org.id, email: ADMIN_EMAIL } },
      create: {
        organizationId: org.id,
        userId: adminUser.id,
        email: ADMIN_EMAIL,
        role: 'ADMIN',
        status: 'ACCEPTED',
      },
      update: { userId: adminUser.id, role: 'ADMIN', status: 'ACCEPTED' },
    })
    console.log(`📌 Admin: ${adminUser.fullName ?? ADMIN_EMAIL} (${adminUser.id})`)
  }

  // -----------------------------------------------------------------------
  // 1.2 Garantir pipeline com stages
  // -----------------------------------------------------------------------
  const pipelineDto = await createDefaultPipeline({ orgId: org.id })

  // Buscar stages completos do banco (precisamos dos IDs reais)
  const pipelineWithStages = await db.pipeline.findUnique({
    where: { id: pipelineDto.id },
    include: { stages: { orderBy: { position: 'asc' } } },
  })

  if (!pipelineWithStages || pipelineWithStages.stages.length === 0) {
    console.error('❌ Pipeline sem stages.')
    process.exit(1)
  }

  const stages = pipelineWithStages.stages
  const pipeline = pipelineWithStages

  console.log(`📌 Pipeline: ${pipeline.name} — ${stages.length} stages\n`)

  // -----------------------------------------------------------------------
  // 2. Limpar dados demo anteriores
  // -----------------------------------------------------------------------
  console.log('🧹 Limpando dados anteriores...')

  // Ordem importa por causa das FKs
  await db.message.deleteMany({ where: { conversation: { organizationId: org.id } } })
  await db.conversation.deleteMany({ where: { organizationId: org.id } })
  await db.inbox.deleteMany({ where: { organizationId: org.id } })
  await db.agentStep.deleteMany({ where: { agent: { organizationId: org.id } } })
  await db.agentKnowledgeChunk.deleteMany({ where: { agent: { organizationId: org.id } } })
  await db.agentKnowledgeFile.deleteMany({ where: { agent: { organizationId: org.id } } })
  await db.agent.deleteMany({ where: { organizationId: org.id } })
  await db.appointment.deleteMany({ where: { organizationId: org.id } })
  await db.activity.deleteMany({ where: { deal: { organizationId: org.id } } })
  await db.task.deleteMany({ where: { organizationId: org.id } })
  await db.dealProduct.deleteMany({ where: { deal: { organizationId: org.id } } })
  await db.dealContact.deleteMany({ where: { deal: { organizationId: org.id } } })
  await db.deal.deleteMany({ where: { organizationId: org.id } })
  await db.contact.deleteMany({ where: { organizationId: org.id } })
  await db.company.deleteMany({ where: { organizationId: org.id } })
  await db.product.deleteMany({ where: { organizationId: org.id } })
  await db.dealLostReason.deleteMany({ where: { organizationId: org.id } })
  await db.walletTransaction.deleteMany({ where: { wallet: { organizationId: org.id } } })
  await db.creditWallet.deleteMany({ where: { organizationId: org.id } })
  await db.aiUsage.deleteMany({ where: { organizationId: org.id } })

  console.log('  ✅ Dados anteriores removidos\n')

  // -----------------------------------------------------------------------
  // 3. Companies
  // -----------------------------------------------------------------------
  console.log('🏢 Criando empresas...')
  const companies = await Promise.all(
    COMPANIES.map((company) =>
      db.company.create({
        data: {
          organizationId: org.id,
          name: company.name,
          domain: company.domain,
          industry: company.industry,
          size: company.size,
        },
      }),
    ),
  )
  console.log(`  ✅ ${companies.length} empresas criadas\n`)

  // -----------------------------------------------------------------------
  // 4. Contacts (60)
  // -----------------------------------------------------------------------
  console.log('👥 Criando contatos...')
  const contacts = await Promise.all(
    CONTACTS_DATA.map((contact) =>
      db.contact.create({
        data: {
          organizationId: org.id,
          companyId: companies[contact.companyIdx].id,
          assignedTo: ownerId,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          role: contact.role,
          isDecisionMaker: contact.isDecisionMaker,
        },
      }),
    ),
  )
  console.log(`  ✅ ${contacts.length} contatos criados\n`)

  // -----------------------------------------------------------------------
  // 5. Products
  // -----------------------------------------------------------------------
  console.log('📦 Criando produtos...')
  const products = await Promise.all(
    PRODUCTS_DATA.map((product) =>
      db.product.create({
        data: {
          organizationId: org.id,
          name: product.name,
          description: product.description,
          price: product.price,
          isActive: true,
        },
      }),
    ),
  )
  console.log(`  ✅ ${products.length} produtos criados\n`)

  // -----------------------------------------------------------------------
  // 6. Deal Lost Reasons
  // -----------------------------------------------------------------------
  console.log('❌ Criando motivos de perda...')
  const lostReasons = await Promise.all(
    LOST_REASONS.map((reason) =>
      db.dealLostReason.create({
        data: {
          organizationId: org.id,
          name: reason,
          isActive: true,
        },
      }),
    ),
  )
  console.log(`  ✅ ${lostReasons.length} motivos criados\n`)

  // -----------------------------------------------------------------------
  // 7. Deals (50) — distribuídos pelos stages
  // -----------------------------------------------------------------------
  console.log('💰 Criando negociações...')

  // Distribuição: Lead(10), Qualificação(10), Proposta(10), Negociação(8), Ganho(7), Perdido(5)
  const stageDistribution = [10, 10, 10, 8, 7, 5]
  const dealValues = [5000, 8000, 12000, 15000, 18000, 22000, 25000, 30000, 35000, 45000, 50000, 75000, 100000, 150000, 200000]
  const priorities: Array<'low' | 'medium' | 'high' | 'urgent'> = ['low', 'medium', 'high', 'urgent']

  interface DealRecord {
    id: string
    title: string
    pipelineStageId: string
    status: string
  }

  const deals: DealRecord[] = []
  let dealIdx = 0

  for (let stageIdx = 0; stageIdx < stages.length; stageIdx++) {
    const stage = stages[stageIdx]
    const count = stageDistribution[stageIdx] ?? 5

    for (let idx = 0; idx < count; idx++) {
      const isWonStage = stageIdx === 4 // Ganho
      const isLostStage = stageIdx === 5 // Perdido

      let status: 'OPEN' | 'IN_PROGRESS' | 'WON' | 'LOST' | 'PAUSED' = 'OPEN'
      if (isWonStage) status = 'WON'
      else if (isLostStage) status = 'LOST'
      else if (stageIdx >= 2 && idx % 5 === 0) status = 'PAUSED'
      else if (stageIdx >= 1) status = 'IN_PROGRESS'

      const companyIdx = dealIdx % companies.length
      const daysAgo = Math.floor(Math.random() * 90) + 1

      const deal = await db.deal.create({
        data: {
          organizationId: org.id,
          pipelineStageId: stage.id,
          companyId: companies[companyIdx].id,
          title: DEAL_TITLES[dealIdx % DEAL_TITLES.length],
          priority: pick(priorities),
          status,
          value: pick(dealValues),
          assignedTo: ownerId,
          expectedCloseDate: daysFromNow(Math.floor(Math.random() * 60) + 1),
          lossReasonId: isLostStage ? pick(lostReasons).id : undefined,
          pausedAt: status === 'PAUSED' ? daysFromNow(-Math.floor(Math.random() * 10)) : undefined,
          notes: idx % 3 === 0 ? 'Cliente com alto potencial de conversão. Priorizar atendimento.' : undefined,
          createdAt: daysFromNow(-daysAgo),
        },
      })

      deals.push(deal)
      dealIdx++
    }
  }

  console.log(`  ✅ ${deals.length} negociações criadas\n`)

  // -----------------------------------------------------------------------
  // 8. DealContacts — vincular contatos aos deals
  // -----------------------------------------------------------------------
  console.log('🔗 Vinculando contatos aos deals...')
  let dealContactCount = 0
  const contactRoles = ['Decisor', 'Influenciador', 'Comprador', 'Usuário Final', 'Sponsor']

  for (const deal of deals) {
    // Cada deal recebe 1-3 contatos da mesma empresa ou aleatórios
    const numContacts = Math.floor(Math.random() * 3) + 1
    const selectedContacts = pickN(contacts, numContacts)

    for (let idx = 0; idx < selectedContacts.length; idx++) {
      await db.dealContact.create({
        data: {
          dealId: deal.id,
          contactId: selectedContacts[idx].id,
          role: contactRoles[idx % contactRoles.length],
          isPrimary: idx === 0,
        },
      })
      dealContactCount++
    }
  }
  console.log(`  ✅ ${dealContactCount} vínculos deal-contato criados\n`)

  // -----------------------------------------------------------------------
  // 9. DealProducts — vincular produtos aos deals
  // -----------------------------------------------------------------------
  console.log('📎 Vinculando produtos aos deals...')
  let dealProductCount = 0

  for (const deal of deals) {
    // 60% dos deals têm produtos
    if (Math.random() > 0.6) continue

    const numProducts = Math.floor(Math.random() * 3) + 1
    const selectedProducts = pickN(products, numProducts)

    for (const product of selectedProducts) {
      const hasDiscount = Math.random() > 0.5
      await db.dealProduct.create({
        data: {
          dealId: deal.id,
          productId: product.id,
          quantity: Math.floor(Math.random() * 5) + 1,
          unitPrice: product.price,
          discountType: hasDiscount ? (Math.random() > 0.5 ? 'percentage' : 'fixed') : 'percentage',
          discountValue: hasDiscount ? (Math.random() > 0.5 ? Math.floor(Math.random() * 15) + 5 : Math.floor(Math.random() * 2000) + 500) : 0,
        },
      })
      dealProductCount++
    }
  }
  console.log(`  ✅ ${dealProductCount} vínculos deal-produto criados\n`)

  // -----------------------------------------------------------------------
  // 10. Tasks (15)
  // -----------------------------------------------------------------------
  console.log('✅ Criando tarefas...')
  const taskTypes: Array<'TASK' | 'MEETING' | 'CALL' | 'WHATSAPP' | 'VISIT' | 'EMAIL'> = ['TASK', 'MEETING', 'CALL', 'WHATSAPP', 'VISIT', 'EMAIL']

  const openDeals = deals.filter((deal) => deal.status !== 'WON' && deal.status !== 'LOST')
  let taskCount = 0

  for (let idx = 0; idx < TASK_TITLES.length; idx++) {
    const targetDeal = openDeals[idx % openDeals.length]
    const isPast = idx < 5
    const isCompleted = isPast && Math.random() > 0.3

    await db.task.create({
      data: {
        organizationId: org.id,
        dealId: targetDeal.id,
        title: TASK_TITLES[idx],
        type: taskTypes[idx % taskTypes.length],
        dueDate: isPast ? daysFromNow(-Math.floor(Math.random() * 14) - 1) : daysFromNow(Math.floor(Math.random() * 21) + 1),
        isCompleted,
        assignedTo: ownerId,
        createdBy: ownerId,
      },
    })
    taskCount++
  }
  console.log(`  ✅ ${taskCount} tarefas criadas\n`)

  // -----------------------------------------------------------------------
  // 11. Activities (40+)
  // -----------------------------------------------------------------------
  console.log('📝 Criando atividades...')
  const activityTypes: Array<'note' | 'call' | 'email' | 'meeting' | 'stage_change' | 'deal_won' | 'deal_lost'> = [
    'note', 'call', 'email', 'meeting', 'stage_change', 'note', 'call', 'email',
  ]
  let activityCount = 0

  for (const deal of deals) {
    // 2-4 atividades por deal
    const numActivities = Math.floor(Math.random() * 3) + 2

    for (let idx = 0; idx < numActivities; idx++) {
      let type = activityTypes[activityCount % activityTypes.length]
      let content: string

      // Deals ganhos/perdidos têm atividade final correspondente
      if (deal.status === 'WON' && idx === numActivities - 1) {
        type = 'deal_won'
        content = 'Negócio fechado com sucesso! Cliente assinou o contrato.'
      } else if (deal.status === 'LOST' && idx === numActivities - 1) {
        type = 'deal_lost'
        content = 'Negócio perdido. Cliente optou por outra solução.'
      } else {
        content = ACTIVITY_NOTES[activityCount % ACTIVITY_NOTES.length]
      }

      await db.activity.create({
        data: {
          dealId: deal.id,
          type,
          content,
          performedBy: ownerId,
          createdAt: daysFromNow(-Math.floor(Math.random() * 60) - 1),
        },
      })
      activityCount++
    }
  }
  console.log(`  ✅ ${activityCount} atividades criadas\n`)

  // -----------------------------------------------------------------------
  // 12. Appointments (20)
  // -----------------------------------------------------------------------
  console.log('📅 Criando agendamentos...')
  const appointmentStatuses: Array<'SCHEDULED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW'> = ['SCHEDULED', 'COMPLETED', 'CANCELED', 'NO_SHOW']
  let appointmentCount = 0

  const appointmentTitles = [
    'Demo do CRM para equipe técnica',
    'Reunião de alinhamento de escopo',
    'Apresentação executiva do projeto',
    'Call de follow-up pós proposta',
    'Kickoff do projeto de implantação',
    'Reunião de negociação de preços',
    'Visita técnica ao cliente',
    'Workshop de treinamento',
    'Revisão de contrato com jurídico',
    'Reunião de feedback mensal',
    'Apresentação de case de sucesso',
    'Alinhamento de cronograma',
    'Demo de novas funcionalidades',
    'Reunião de renovação de contrato',
    'Call técnica sobre integração',
    'Reunião com stakeholders',
    'Apresentação de ROI',
    'Visita comercial presencial',
    'Webinar sobre automações',
    'Reunião final de aprovação',
  ]

  for (let idx = 0; idx < 20; idx++) {
    const isFuture = idx < 12
    const daysOffset = isFuture ? Math.floor(Math.random() * 30) + 1 : -(Math.floor(Math.random() * 30) + 1)
    const hour = Math.floor(Math.random() * 8) + 9 // 9h-17h
    const startDate = dateTimeFromNow(daysOffset, hour)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // +1h

    const status = isFuture ? 'SCHEDULED' : appointmentStatuses[Math.floor(Math.random() * appointmentStatuses.length)]
    const targetDeal = deals[idx % deals.length]

    await db.appointment.create({
      data: {
        organizationId: org.id,
        title: appointmentTitles[idx],
        description: `Reunião referente ao deal: ${targetDeal.title}`,
        startDate,
        endDate,
        status,
        assignedTo: ownerId,
        dealId: targetDeal.id,
      },
    })
    appointmentCount++
  }
  console.log(`  ✅ ${appointmentCount} agendamentos criados\n`)

  // -----------------------------------------------------------------------
  // 13. Agent + Steps + Inbox
  // -----------------------------------------------------------------------
  console.log('🤖 Criando agente de IA...')

  const agent = await db.agent.create({
    data: {
      organizationId: org.id,
      name: 'Assistente Kronos (Demo)',
      systemPrompt: `Você é o assistente de atendimento da empresa. Seu papel é:

1. Recepcionar o cliente de forma cordial e profissional.
2. Entender a necessidade do cliente fazendo perguntas objetivas.
3. Apresentar soluções ou encaminhar para o setor correto.
4. Nunca inventar informações que você não tem certeza.
5. Se não souber responder algo, diga que vai verificar com a equipe.

Regras importantes:
- Seja conciso e direto nas respostas.
- Use linguagem amigável mas profissional.
- Nunca revele que você é uma IA — apresente-se como assistente da empresa.
- Responda sempre em Português do Brasil.`,
      isActive: true,
      modelId: 'anthropic/claude-sonnet-4',
      debounceSeconds: 3,
      pipelineIds: [pipeline.id],
    },
  })

  // Agent Steps
  await db.agentStep.createMany({
    data: [
      {
        agentId: agent.id,
        name: 'Recepção',
        objective: 'Dar boas-vindas ao cliente, se apresentar e perguntar como pode ajudá-lo. Coletar o nome do cliente se ainda não souber.',
        allowedActions: ['update_contact'],
        activationRequirement: 'Início da conversa ou quando o cliente entra em contato pela primeira vez.',
        order: 0,
      },
      {
        agentId: agent.id,
        name: 'Qualificação',
        objective: 'Entender a necessidade do cliente, fazer perguntas exploratórias para qualificar o interesse. Identificar o produto ou serviço desejado e o nível de urgência.',
        allowedActions: ['update_contact', 'move_deal'],
        activationRequirement: 'Quando o cliente já se identificou e expressou uma necessidade ou interesse em algum produto/serviço.',
        order: 1,
      },
      {
        agentId: agent.id,
        name: 'Encerramento',
        objective: 'Confirmar que todas as dúvidas foram respondidas, resumir os próximos passos e se despedir de forma cordial.',
        allowedActions: ['create_task', 'hand_off_to_human'],
        activationRequirement: 'Quando o cliente indica que não tem mais dúvidas, ou quando é necessário escalar para atendimento humano.',
        order: 2,
      },
    ],
  })

  console.log(`  ✅ Agente "${agent.name}" + 3 steps criados`)

  // Inbox
  const inbox = await db.inbox.create({
    data: {
      organizationId: org.id,
      name: 'WhatsApp Demo',
      channel: 'WHATSAPP',
      isActive: true,
      agentId: agent.id,
    },
  })
  console.log(`  ✅ Inbox "${inbox.name}" criada\n`)

  // -----------------------------------------------------------------------
  // 14. Conversations + Messages (16 conversas)
  // -----------------------------------------------------------------------
  console.log('💬 Criando conversas...')
  let conversationCount = 0
  let messageCount = 0

  for (const script of CONVERSATION_SCRIPTS) {
    const contact = contacts[script.contactIdx]
    if (!contact) continue

    // Buscar um deal vinculado a este contato (se existir)
    const dealContact = await db.dealContact.findFirst({
      where: { contactId: contact.id },
      select: { dealId: true },
    })

    const conversation = await db.conversation.create({
      data: {
        inboxId: inbox.id,
        organizationId: org.id,
        contactId: contact.id,
        dealId: dealContact?.dealId ?? null,
        channel: 'WHATSAPP',
        remoteJid: `55${contact.phone}@s.whatsapp.net`,
        currentStepOrder: Math.min(Math.floor(script.messages.length / 4), 2),
        unreadCount: Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0,
        createdAt: daysFromNow(-Math.floor(Math.random() * 30) - 1),
      },
    })

    // Criar mensagens com timestamps progressivos
    const conversationStartDays = Math.floor(Math.random() * 20) + 5
    for (let msgIdx = 0; msgIdx < script.messages.length; msgIdx++) {
      const msg = script.messages[msgIdx]
      const minutesOffset = msgIdx * (Math.floor(Math.random() * 5) + 1) // 1-5 min entre msgs

      await db.message.create({
        data: {
          conversationId: conversation.id,
          role: msg.role,
          content: msg.content,
          createdAt: new Date(
            daysFromNow(-conversationStartDays).getTime() + minutesOffset * 60 * 1000,
          ),
        },
      })
      messageCount++
    }

    conversationCount++
  }
  console.log(`  ✅ ${conversationCount} conversas com ${messageCount} mensagens criadas\n`)

  // -----------------------------------------------------------------------
  // 15. CreditWallet + Transactions + AiUsage
  // -----------------------------------------------------------------------
  console.log('💳 Criando carteira de créditos...')

  const wallet = await db.creditWallet.create({
    data: {
      organizationId: org.id,
      planBalance: 320,
      topUpBalance: 50,
      autoRechargeEnabled: true,
      autoRechargeTrigger: 10,
      autoRechargeAmount: 100,
    },
  })

  // Transações históricas
  const transactions = [
    { type: 'MONTHLY_RESET' as const, amount: 500, balanceAfterPlan: 500, balanceAfterTopUp: 0, description: 'Reset mensal — 500 créditos do plano', daysAgo: 25 },
    { type: 'USAGE_DEBIT' as const, amount: -15, balanceAfterPlan: 485, balanceAfterTopUp: 0, description: 'Atendimento WhatsApp — TechNova Soluções', daysAgo: 23 },
    { type: 'USAGE_DEBIT' as const, amount: -22, balanceAfterPlan: 463, balanceAfterTopUp: 0, description: 'Atendimento WhatsApp — Saúde+ Clínicas', daysAgo: 20 },
    { type: 'USAGE_DEBIT' as const, amount: -18, balanceAfterPlan: 445, balanceAfterTopUp: 0, description: 'Atendimento WhatsApp — EduPrime Ensino', daysAgo: 17 },
    { type: 'CREDIT_PURCHASE' as const, amount: 100, balanceAfterPlan: 445, balanceAfterTopUp: 100, description: 'Compra avulsa — 100 créditos', daysAgo: 15 },
    { type: 'USAGE_DEBIT' as const, amount: -35, balanceAfterPlan: 410, balanceAfterTopUp: 100, description: 'Atendimento WhatsApp — LogiExpress (conversa longa)', daysAgo: 12 },
    { type: 'USAGE_DEBIT' as const, amount: -40, balanceAfterPlan: 370, balanceAfterTopUp: 100, description: 'Atendimentos múltiplos — 4 conversas', daysAgo: 7 },
    { type: 'USAGE_DEBIT' as const, amount: -50, balanceAfterPlan: 320, balanceAfterTopUp: 50, description: 'Atendimentos da semana — 6 conversas', daysAgo: 2 },
  ]

  for (const transaction of transactions) {
    await db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: transaction.type,
        amount: transaction.amount,
        balanceAfterPlan: transaction.balanceAfterPlan,
        balanceAfterTopUp: transaction.balanceAfterTopUp,
        description: transaction.description,
        createdAt: daysFromNow(-transaction.daysAgo),
      },
    })
  }

  // AiUsage do mês
  const now = new Date()
  await db.aiUsage.create({
    data: {
      organizationId: org.id,
      periodYear: now.getFullYear(),
      periodMonth: now.getMonth() + 1,
      totalMessagesUsed: 142,
      totalCreditsSpent: 180,
    },
  })

  console.log(`  ✅ Carteira criada: planBalance=320, topUpBalance=50`)
  console.log(`  ✅ ${transactions.length} transações registradas`)
  console.log('  ✅ AiUsage do mês inicializado\n')

  // -----------------------------------------------------------------------
  // RESUMO
  // -----------------------------------------------------------------------
  console.log('=' .repeat(60))
  console.log('🎉 Seed Demo Account concluído!')
  console.log('=' .repeat(60))
  console.log(`
  📊 Resumo:
  ├── 🏢 ${companies.length} empresas
  ├── 👥 ${contacts.length} contatos
  ├── 📦 ${products.length} produtos
  ├── ❌ ${lostReasons.length} motivos de perda
  ├── 💰 ${deals.length} negociações
  ├── 🔗 ${dealContactCount} vínculos deal-contato
  ├── 📎 ${dealProductCount} vínculos deal-produto
  ├── ✅ ${taskCount} tarefas
  ├── 📝 ${activityCount} atividades
  ├── 📅 ${appointmentCount} agendamentos
  ├── 🤖 1 agente IA + 3 steps
  ├── 📬 1 inbox WhatsApp
  ├── 💬 ${conversationCount} conversas (${messageCount} mensagens)
  └── 💳 1 carteira (${transactions.length} transações)
  `)
}

main()
  .catch((error) => {
    console.error('❌ Erro no seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
