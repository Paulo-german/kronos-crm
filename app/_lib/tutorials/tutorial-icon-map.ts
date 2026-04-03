import type { ComponentType } from 'react'
import {
  LayoutDashboard,
  Kanban,
  GraduationCap,
  BookOpen,
  Star,
  Zap,
  Target,
  TrendingUp,
  BarChart2,
  Users,
} from 'lucide-react'

// Mapa centralizado de ícones suportados nos tutoriais
export const TUTORIAL_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Kanban,
  GraduationCap,
  BookOpen,
  Star,
  Zap,
  Target,
  TrendingUp,
  BarChart2,
  Users,
}
