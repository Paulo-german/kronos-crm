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
          'Cada coluna representa uma etapa do seu funil e mostra quantos negócios existem, o valor acumulado e o percentual do total. Se você tem mais de um funil, use o seletor no topo para alternar entre eles.',
        content: {
          type: 'image',
          src: '/images/tutorials/pipeline/01-kanban.png',
        },
      },
      {
        title: 'Como criar um negócio',
        description:
          'Use o botão "Novo Negócio" no topo ou o "+" dentro de qualquer coluna. Preencha o título, selecione a etapa e vincule um contato — ou crie um novo direto no formulário.',
        content: {
          type: 'image',
          src: '/images/tutorials/pipeline/02-create-deal.png',
        },
      },
      {
        title: 'Avançando etapas',
        description:
          'Arraste o cartão de uma coluna para outra para mudar a etapa. A movimentação é registrada automaticamente no histórico do negócio. Você também pode alterar a etapa pelo seletor dentro do detalhe.',
        content: {
          type: 'video',
          src: '/videos/tutorials/drag-drop.mp4',
        },
      },
      {
        title: 'Anatomia do cartão',
        description:
          'Cada cartão reúne tudo sobre um negócio: status, valor, prioridade, contato e tempo de inatividade. A prioridade pode ser alterada direto no kanban — basta clicar nela. Veja ao lado um exemplo e abaixo o que cada indicador significa.',
        content: {
          type: 'component',
          componentId: 'deal-card-anatomy',
        },
      },
      {
        title: 'Detalhe do negócio',
        description:
          'Clique em qualquer cartão para abrir sua ficha completa. Você encontra 4 abas: Resumo, Produtos, Tarefas e Agendamentos. Título, etapa e data de fechamento podem ser editados direto na página, sem abrir formulário.',
        content: {
          type: 'image',
          src: '/images/tutorials/pipeline/05-deal-detail.png',
        },
      },
      {
        title: 'Encontrando negócios rapidamente',
        description:
          'Filtre por situação, prioridade, faixa de valor, data ou responsável. Ordene por mais recentes, maior valor ou prioridade. Use a barra de ferramentas para alternar entre a visão de colunas e a visão em lista.',
        content: {
          type: 'image',
          src: '/images/tutorials/pipeline/06-filters.png',
        },
      },
      {
        title: 'Fechando e transferindo negócios',
        description:
          'No detalhe do negócio, clique em "Marcar Venda" para registrar o ganho ou "Marcar Perda" para informar o motivo. Negócios fechados podem ser reabertos a qualquer momento. Precisa passar para outro vendedor? Use "Transferir" para mover o negócio e, opcionalmente, seus contatos.',
        content: {
          type: 'image',
          src: '/images/tutorials/pipeline/07-close-deal.png',
        },
      },
    ],
  },
]

// Single source of truth para os IDs — usado pelo Zod schema da action
export const TUTORIAL_IDS = TUTORIAL_REGISTRY.map(
  (tutorial) => tutorial.id,
) as [string, ...string[]]
