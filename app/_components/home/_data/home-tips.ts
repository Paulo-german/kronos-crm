import {
  Search,
  Kanban,
  Bot,
  Users,
  MessageCircle,
  BarChart2,
  Zap,
  Tag,
} from 'lucide-react'

export interface HomeTip {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  href?: string
}

export const HOME_TIPS: HomeTip[] = [
  {
    id: 'global-search',
    icon: Search,
    title: 'Busca global',
    description: 'Pressione Cmd+K (ou Ctrl+K) para buscar contatos, negociações e conversas de qualquer tela.',
  },
  {
    id: 'kanban-drag',
    icon: Kanban,
    title: 'Pipeline interativo',
    description: 'Arraste e solte negociações entre estágios diretamente no Kanban para atualizar o status.',
    href: '/crm/deals',
  },
  {
    id: 'ai-agents',
    icon: Bot,
    title: 'Agentes de IA',
    description: 'Configure Agentes de IA para responder automaticamente no inbox e qualificar leads.',
    href: '/ai-agent',
  },
  {
    id: 'bulk-contacts',
    icon: Users,
    title: 'Ações em lote',
    description: 'Selecione múltiplos contatos na lista e aplique ações como edição e exclusão de uma vez.',
    href: '/contacts',
  },
  {
    id: 'inbox-filters',
    icon: MessageCircle,
    title: 'Filtros no inbox',
    description: 'Use as abas e filtros do inbox para separar conversas por agente, status ou canal.',
    href: '/inbox',
  },
  {
    id: 'tags',
    icon: Tag,
    title: 'Tags e segmentação',
    description: 'Adicione tags aos seus contatos para segmentar e filtrar com precisão na sua base.',
    href: '/contacts',
  },
  {
    id: 'automation',
    icon: Zap,
    title: 'Automações inteligentes',
    description: 'Combine agentes de IA com estágios do pipeline para criar fluxos de vendas automatizados.',
  },
  {
    id: 'reports',
    icon: BarChart2,
    title: 'Acompanhe métricas',
    description: 'Acesse o dashboard para visualizar o desempenho do seu time e pipeline em tempo real.',
  },
]
