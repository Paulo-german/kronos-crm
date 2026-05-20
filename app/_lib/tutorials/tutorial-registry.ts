import type { TutorialDefinition } from './tutorial-types'

// Conteúdo hardcoded — MVP não precisa de CRUD admin
export const TUTORIAL_REGISTRY: TutorialDefinition[] = [
  // Tutorial do dashboard desativado — sem assets visuais ainda
  // {
  //   id: 'dashboard',
  //   title: 'Entendendo o Dashboard',
  //   ...
  // },
  {
    id: 'pipeline',
    title: 'Gerenciando seu Funil de Vendas',
    description:
      'Aprenda a criar negócios, mover entre etapas, filtrar e fechar vendas no seu funil.',
    icon: 'Kanban',
    category: 'getting_started',
    relatedRoute: '/crm/deals',
    estimatedMinutes: 5,
    slides: [
      {
        title: 'Visão geral do funil',
        description:
          'Cada coluna representa uma etapa do seu funil e mostra quantos negócios existem e o valor acumulado.',
        content: { type: 'component', componentId: 'pipeline-overview' },
      },
      {
        title: 'Múltiplos funis',
        description:
          'Você pode ter funis diferentes para cada processo comercial — vendas inbound, outbound, retenção. Use o seletor no topo para alternar entre eles ou criar um novo.',
        content: { type: 'component', componentId: 'pipeline-multi-funnel' },
      },
      {
        title: 'Como criar um negócio',
        description:
          'Use o botão "Novo Negócio" no topo ou o "+" dentro de qualquer coluna. Preencha o título, selecione a etapa e vincule um contato — ou crie um novo direto no formulário.',
        content: { type: 'component', componentId: 'pipeline-create-deal' },
      },
      {
        title: 'Avançando etapas',
        description:
          'Arraste o cartão de uma coluna para outra para mudar a etapa. A movimentação é registrada automaticamente no histórico do negócio. Você também pode alterar a etapa pelo seletor dentro do detalhe.',
        content: { type: 'component', componentId: 'pipeline-drag-drop' },
      },
      {
        title: 'Anatomia do cartão',
        description:
          'Cada cartão reúne tudo sobre um negócio: status, valor, prioridade, contato e tempo de inatividade. A prioridade pode ser alterada direto no kanban — basta clicar nela.',
        content: { type: 'component', componentId: 'deal-card-anatomy' },
      },
      {
        title: 'Encontrando negócios rapidamente',
        description:
          'Filtre por situação, prioridade, faixa de valor, data ou responsável. Ordene por mais recentes, maior valor ou prioridade. Alterne entre a visão de colunas e a visão em lista.',
        content: { type: 'component', componentId: 'pipeline-filters' },
      },
      {
        title: 'Vista em lista',
        description:
          'Prefere ver tudo em linhas? Alterne para a vista em lista para escanear muitos negócios de uma vez — com checkbox para seleção em massa, filtros, responsável e data de fechamento visíveis de relance.',
        content: { type: 'component', componentId: 'pipeline-list-view' },
      },
    ],
  },
  {
    id: 'lifecycle-intro',
    title: 'Ciclo de Vida dos Contatos',
    badge: 'Novidade',
    description:
      'Conheça a nova estrutura de ciclo, saúde dos relacionamentos e origem de captura.',
    icon: 'Workflow',
    category: 'getting_started',
    relatedRoute: '/crm/contacts',
    estimatedMinutes: 6,
    slides: [
      {
        title: 'Ciclo de vida dos contatos',
        description:
          'Pense no ciclo de vida: seu contato começa como Lead, vai se aquecendo e pode chegar a Cliente. O Kronos acompanha esse ciclo — e você vê tudo em tempo real.',
        content: { type: 'component', componentId: 'lifecycle-stages' },
      },
      {
        title: 'Como cada estágio é atingido',
        description:
          'Lead entra pelo inbox ou qualquer canal de captura. Qualificado vem do agente de IA ou de você. Oportunidade e Cliente avançam automaticamente pelos negócios — mas você pode ajustar a qualquer momento.',
        content: { type: 'component', componentId: 'lifecycle-auto-advance' },
      },
      {
        title: 'Configure quando o agente avança',
        description:
          'No processo do agente, cada etapa tem uma opção "Avançar ciclo". Basta escolher o estágio de destino — quando a conversa chegar naquela etapa, o contato avança automaticamente.',
        content: { type: 'component', componentId: 'lifecycle-agent-config' },
      },
      {
        title: 'O agente de IA cuida do ciclo',
        description:
          'O agente lê cada mensagem em tempo real. Quando detecta interesse, avança para Qualificado. Quando o contato quer fechar, cria o negócio e avança para Oportunidade — tudo sem você precisar fazer nada.',
        content: { type: 'component', componentId: 'lifecycle-agent' },
      },
      {
        title: 'Saúde do relacionamento',
        description:
          'O pontinho colorido é um alarme silencioso: verde significa contato frequente, amarelo pede atenção, vermelho avisa que aquela pessoa pode estar esquecendo de você. Aja antes de perder.',
        content: { type: 'component', componentId: 'lifecycle-health' },
      },
      {
        title: 'Filtre sua base por estágio',
        description:
          'Na lista de contatos, clique em qualquer aba para ver só quem está naquele estágio do ciclo. Ótimo para focar em quem está perto de fechar ou descobrir quantos Leads ainda precisam de atenção.',
        content: { type: 'component', componentId: 'lifecycle-filter-tabs' },
      },
      {
        title: 'De onde vieram seus contatos',
        description:
          'Saber por onde cada cliente chegou é ouro para o seu marketing. Ao criar um contato, basta marcar o canal — o Kronos mostrará quais fontes trazem mais resultados.',
        content: { type: 'component', componentId: 'lifecycle-capture' },
      },
      {
        title: 'Tudo registrado, nada esquecido',
        description:
          'Cada avanço de estágio fica gravado com data, motivo e quem fez a mudança. Ideal para passar um contato para outro vendedor sem perder nenhum contexto.',
        content: { type: 'component', componentId: 'lifecycle-timeline' },
      },
      {
        title: 'Onde encontrar tudo isso',
        description:
          'O ciclo aparece em três lugares do Kronos. Você não precisa procurar — ele está sempre visível onde mais importa.',
        content: { type: 'component', componentId: 'lifecycle-overview' },
      },
    ],
  },
  {
    id: 'task-outcome-intro',
    title: 'Registre o Resultado das suas Atividades',
    badge: 'Novidade',
    description:
      'Registre o que aconteceu em cada ligação, reunião e mensagem — e veja o histórico completo na timeline do negócio.',
    icon: 'ClipboardCheck',
    category: 'getting_started',
    relatedRoute: '/crm/deals',
    estimatedMinutes: 3,
    slides: [
      {
        title: 'Registre o que aconteceu em cada atividade',
        description:
          'Ao marcar uma tarefa como concluída, o Kronos pergunta como foi. Um registro rápido que constrói o histórico completo do negócio.',
        content: { type: 'component', componentId: 'task-outcome-intro' },
      },
      {
        title: 'Resultado certo para cada tipo de atividade',
        description:
          'Ligação, reunião, WhatsApp, visita ou e-mail — cada tipo tem opções contextuais. Nada genérico, nada desnecessário.',
        content: { type: 'component', componentId: 'task-outcome-types' },
      },
      {
        title: 'Funciona com um clique',
        description:
          'Marque a tarefa como concluída. O dialog abre automaticamente — selecione o resultado e salve. Ou clique em "Concluir sem registrar" para pular.',
        content: { type: 'component', componentId: 'task-outcome-flow' },
      },
      {
        title: 'Histórico automático no negócio',
        description:
          'Cada resultado vira um registro na timeline do negócio. Sem esforço extra — tudo documentado, nada esquecido.',
        content: { type: 'component', componentId: 'task-outcome-timeline' },
      },
    ],
  },
]

// Single source of truth para os IDs — usado pelo Zod schema da action
export const TUTORIAL_IDS = TUTORIAL_REGISTRY.map(
  (tutorial) => tutorial.id,
) as [string, ...string[]]
