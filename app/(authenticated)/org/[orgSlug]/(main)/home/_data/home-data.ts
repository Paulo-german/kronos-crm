import { Inbox, Kanban, Bot, Users, BookOpen, Chrome } from 'lucide-react'
import type { ModuleSlug } from '@/_data-access/module/types'

export interface QuickAccessItem {
  id: string
  label: string
  description: string
  href: string // path relativo, prefixar com /org/{slug}
  icon: React.ComponentType<{ className?: string }>
  // Módulo requerido para o card aparecer.
  // 'always' → sempre visível (Contatos, que é global na sidebar).
  requiredModule: ModuleSlug | 'always'
}

export interface ChecklistItem {
  id: string // chave estável usada no localStorage
  title: string
  description: string
  href?: string // path relativo opcional para deep-link da feature
  // Item só faz sentido se a org tem o módulo. Itens sem requiredModule são sempre exibidos.
  requiredModule?: ModuleSlug
}

export interface EcosystemTool {
  id: string
  label: string
  description: string
  href: string // URL externa absoluta
  icon: React.ComponentType<{ className?: string }>
  badge?: 'novo' | 'em-breve'
}

export interface HomeStaticData {
  introVideoUrl: string // URL de embed (YouTube/Vimeo) — hardcoded
  quickAccess: QuickAccessItem[]
  checklist: ChecklistItem[]
  ecosystem: EcosystemTool[]
}

export const LOCALSTORAGE_KEY = 'kronos:home-onboarding:v1'

export const HOME_DATA: HomeStaticData = {
  introVideoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',

  quickAccess: [
    {
      id: 'inbox',
      label: 'Conversas',
      description: 'Gerencie todas as conversas com seus contatos',
      href: '/inbox',
      icon: Inbox,
      requiredModule: 'inbox',
    },
    {
      id: 'deals',
      label: 'Negociações',
      description: 'Acompanhe suas oportunidades no pipeline',
      href: '/crm/deals',
      icon: Kanban,
      requiredModule: 'crm',
    },
    {
      id: 'agents',
      label: 'Agentes',
      description: 'Configure e gerencie seus Agentes de IA',
      href: '/ai-agent',
      icon: Bot,
      requiredModule: 'ai-agent',
    },
    {
      id: 'contacts',
      label: 'Contatos',
      description: 'Visualize e organize sua base de contatos',
      href: '/contacts',
      icon: Users,
      requiredModule: 'always',
    },
  ],

  checklist: [
    {
      id: 'add-contact',
      title: 'Adicionar primeiro contato',
      description: 'Comece cadastrando um contato na sua base.',
      href: '/contacts',
    },
    {
      id: 'create-deal',
      title: 'Criar uma negociação',
      description: 'Registre sua primeira oportunidade no pipeline.',
      href: '/crm/deals',
      requiredModule: 'crm',
    },
    {
      id: 'send-inbox-message',
      title: 'Enviar mensagem no Inbox',
      description: 'Inicie ou responda uma conversa com um contato.',
      href: '/inbox',
      requiredModule: 'inbox',
    },
    {
      id: 'setup-agent',
      title: 'Configurar um Agente de IA',
      description: 'Crie um agente para automatizar suas conversas.',
      href: '/ai-agent',
      requiredModule: 'ai-agent',
    },
    {
      id: 'invite-member',
      title: 'Convidar um membro para a equipe',
      description: 'Adicione colaboradores à sua organização.',
      href: '/settings/team',
    },
    {
      id: 'connect-whatsapp',
      title: 'Configurar integração de WhatsApp',
      description: 'Conecte um número para enviar e receber mensagens.',
      href: '/settings/integrations/whatsapp',
      requiredModule: 'inbox',
    },
  ],

  ecosystem: [
    {
      id: 'kronos-academy',
      label: 'Kronos Academy',
      description: 'Aprenda a usar o Kronos HUB com tutoriais e cursos práticos.',
      href: 'https://academy.kronoshub.com.br',
      icon: BookOpen,
      badge: 'em-breve',
    },
    {
      id: 'chrome-extension',
      label: 'Extensão Chrome',
      description: 'Acesse o CRM diretamente do seu navegador sem sair das páginas.',
      href: 'https://chrome.google.com/webstore',
      icon: Chrome,
      badge: 'em-breve',
    },
  ],
}
