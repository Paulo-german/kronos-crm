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
  {
    id: 'agent-detail',
    title: 'Configurando seu Agente de IA',
    description:
      'Explore as 5 abas de configuração do agente: identidade, processo, conhecimento, conexões e follow-ups. Aprenda a testar o agente antes de ativar.',
    icon: 'Bot',
    category: 'getting_started',
    relatedRoute: '/ai-agent',
    estimatedMinutes: 5,
    slides: [
      {
        title: 'A página do agente',
        description:
          'Cada agente tem sua própria página com 5 abas de configuração. Aqui você define como o agente pensa, age e se conecta aos seus canais de atendimento.',
        content: { type: 'component', componentId: 'agent-detail-overview' },
      },
      {
        title: 'Aba Geral',
        description:
          'Configure a identidade do agente: nome, papel (SDR, Closer, Suporte…), tom de voz e o modelo de IA. Ative o horário de atendimento para o agente só responder no seu horário comercial.',
        content: { type: 'component', componentId: 'agent-detail-general' },
      },
      {
        title: 'Aba Processo',
        description:
          'O processo define como o agente age em cada etapa da conversa. Adicione steps em sequência e configure ações automáticas em cada um: mover etapa, criar tarefa, fazer hand-off para humano.',
        content: { type: 'component', componentId: 'agent-detail-process' },
      },
      {
        title: 'Configurando um step',
        description:
          'Cada step tem um nome, as instruções que ensinam o agente como agir naquela etapa, e ações automáticas — como mover o negócio de etapa no funil ou criar uma tarefa para o time quando o step for atingido.',
        content: { type: 'component', componentId: 'agent-detail-process-config' },
      },
      {
        title: 'Aba Conhecimento',
        description:
          'Suba arquivos PDF, TXT ou DOCX com informações sobre sua empresa, produtos e processos. O agente usa esse material para responder com precisão — sem inventar nada.',
        content: { type: 'component', componentId: 'agent-detail-knowledge' },
      },
      {
        title: 'Aba Conexão',
        description:
          'Vincule inboxes ao agente para que ele comece a atender. Cada inbox conectada passa a receber as respostas automáticas do agente assim que ele estiver ativo.',
        content: { type: 'component', componentId: 'agent-detail-connection' },
      },
      {
        title: 'Aba Follow-ups',
        description:
          'Configure regras automáticas de recontato: se o lead não responder em X horas, o agente envia uma nova mensagem. Defina também o que acontece depois de todos os follow-ups esgotarem.',
        content: { type: 'component', componentId: 'agent-detail-followups' },
      },
      {
        title: 'Testar o agente',
        description:
          'Antes de ativar, use o chat de teste para conversar com o agente e validar o comportamento. O botão fica fixo na lateral direita da página — clique a qualquer momento para abrir o painel.',
        content: { type: 'component', componentId: 'agent-detail-test' },
      },
    ],
  },
  {
    id: 'agents-list',
    title: 'Agentes IA: Seu Time Automático',
    description:
      'Entenda o que são os agentes de IA, como eles funcionam e como cadastrar o seu primeiro agente.',
    icon: 'Bot',
    category: 'getting_started',
    relatedRoute: '/ai-agent',
    estimatedMinutes: 3,
    slides: [
      {
        title: 'O que é um Agente IA?',
        description:
          'Um agente de IA é um assistente que trabalha por você 24h por dia: lê as mensagens que chegam nos seus canais e responde automaticamente, como se fosse um vendedor sempre disponível.',
        content: { type: 'component', componentId: 'agents-what-is' },
      },
      {
        title: 'Como o agente age',
        description:
          'O agente não só responde — ele age. Ao analisar cada mensagem, pode qualificar o lead, mover o negócio de etapa no funil e criar tarefas para o time, tudo sem intervenção manual.',
        content: { type: 'component', componentId: 'agents-how-it-works' },
      },
      {
        title: 'Entendendo o painel de agentes',
        description:
          'Cada agente aparece como um card com seu status (ativo ou inativo), o modelo de IA utilizado e estatísticas de steps configurados, inboxes conectados e arquivos de conhecimento.',
        content: { type: 'component', componentId: 'agents-card' },
      },
      {
        title: 'Cadastrando um agente',
        description:
          'Para criar um agente, informe o nome, o papel (SDR, Closer, Suporte…), os dados da sua empresa, o tom de voz ideal e a arquitetura. Em seguida, configure o processo e as conexões na página de detalhes.',
        content: { type: 'component', componentId: 'agents-create' },
      },
    ],
  },
  {
    id: 'deal-details',
    title: 'Tudo sobre o Detalhe do Negócio',
    description:
      'Explore a página completa de um negócio: resumo, produtos, serviços, promoções, tarefas, agendamentos e como fechar uma venda.',
    icon: 'Briefcase',
    category: 'getting_started',
    relatedRoute: '/crm/deals',
    estimatedMinutes: 4,
    slides: [
      {
        title: 'A página do negócio',
        description:
          'Cada negócio tem sua própria página com tudo centralizado: status, prioridade, etapa do funil e acesso rápido às ações de fechar ou perder a venda.',
        content: { type: 'component', componentId: 'pipeline-deal-detail' },
      },
      {
        title: 'Aba Resumo',
        description:
          'O Resumo reúne as informações essenciais do negócio: valor, etapa, data de fechamento, contato vinculado, notas e toda a timeline de atividades registradas.',
        content: { type: 'component', componentId: 'deal-detail-summary' },
      },
      {
        title: 'Produtos, serviços e promoções',
        description:
          'Na aba Produtos você monta o escopo comercial do negócio. Adicione produtos do seu catálogo, serviços avulsos e promoções — o total é calculado automaticamente.',
        content: { type: 'component', componentId: 'deal-detail-products' },
      },
      {
        title: 'Tarefas do negócio',
        description:
          'Crie tarefas diretamente no negócio — ligações, reuniões, visitas ou mensagens. Ao concluir, registre o resultado para manter o histórico completo na timeline.',
        content: { type: 'component', componentId: 'deal-detail-tasks' },
      },
      {
        title: 'Agendamentos vinculados',
        description:
          'Vincule agendamentos ao negócio para ter o histórico de reuniões, demos e visitas em um só lugar. Crie novos agendamentos ou associe um já existente.',
        content: { type: 'component', componentId: 'deal-detail-appointments' },
      },
      {
        title: 'Fechando o negócio',
        description:
          'Quando chegar a hora, marque como venda — informe o motivo da perda se não foi desta vez, ou transfira o negócio para outro vendedor. Tudo com histórico registrado.',
        content: { type: 'component', componentId: 'pipeline-close-deal' },
      },
    ],
  },
]

// Single source of truth para os IDs — usado pelo Zod schema da action
export const TUTORIAL_IDS = TUTORIAL_REGISTRY.map(
  (tutorial) => tutorial.id,
) as [string, ...string[]]
