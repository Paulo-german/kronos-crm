import {
  Compass,
  GitBranch,
  Users,
  Package,
  XCircle,
  Inbox,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

const SECTION_ICONS: Record<string, LucideIcon> = {
  Compass,
  GitBranch,
  Users,
  Package,
  XCircle,
  Inbox,
  Sparkles,
}

/**
 * Resolve o ícone de uma seção de report a partir do seu `iconName`.
 * Fonte única usada por `ReportsNavTabs` e `ReportsSidebar` para evitar
 * mapas de ícone divergentes.
 */
export function getReportSectionIcon(iconName: string): LucideIcon {
  return SECTION_ICONS[iconName] ?? Compass
}
