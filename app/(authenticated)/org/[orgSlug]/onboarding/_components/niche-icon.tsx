import {
  Briefcase,
  GraduationCap,
  Code,
  Building2,
  Heart,
  ShoppingCart,
  BookOpen,
  Settings,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase,
  GraduationCap,
  Code,
  Building2,
  Heart,
  ShoppingCart,
  BookOpen,
  Settings,
}

interface NicheIconProps {
  name: string
  className?: string
}

export function NicheIcon({ name, className }: NicheIconProps) {
  const Icon = ICON_MAP[name] ?? Settings
  return <Icon className={className} />
}
