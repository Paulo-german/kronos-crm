import type { ModuleSlug } from '@/_data-access/module/types'

export interface NavItem {
  label: string
  iconName: string
  href: string
  moduleSlug: ModuleSlug
}

export interface ModuleNavGroup {
  moduleSlug: ModuleSlug
  moduleTitle: string
  items: NavItem[]
}

const MODULE_NAV_CONFIG: Record<ModuleSlug, ModuleNavGroup> = {
  crm: {
    moduleSlug: 'crm',
    moduleTitle: 'CRM',
    items: [
      { label: 'Tarefas', iconName: 'CheckSquare', href: '/crm/tasks', moduleSlug: 'crm' },
      { label: 'Pipeline', iconName: 'Kanban', href: '/crm/pipeline', moduleSlug: 'crm' },
    ],
  },
  inbox: {
    moduleSlug: 'inbox',
    moduleTitle: 'Inbox',
    items: [
      { label: 'Inbox', iconName: 'Inbox', href: '/inbox', moduleSlug: 'inbox' },
    ],
  },
  'ai-agent': {
    moduleSlug: 'ai-agent',
    moduleTitle: 'AI Agent',
    items: [
      { label: 'AI Agent', iconName: 'Bot', href: '/ai-agent', moduleSlug: 'ai-agent' },
    ],
  },
}

/**
 * Retorna grupos de navegação baseado nos módulos ativos da organização.
 * Dashboard fica hardcoded no sidebar (sempre visível).
 */
export function getActiveNavGroups(moduleSlugs: string[]): ModuleNavGroup[] {
  const groups: ModuleNavGroup[] = []

  for (const slug of moduleSlugs) {
    const group = MODULE_NAV_CONFIG[slug as ModuleSlug]
    if (group) {
      groups.push(group)
    }
  }

  return groups
}
