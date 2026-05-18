'use client'

import { motion } from 'framer-motion'
import { BarChart2, User, Users } from 'lucide-react'

const OVERVIEW_ITEMS = [
  {
    icon: Users,
    title: 'Lista de Contatos',
    description: 'Filtros, abas e badges por estágio',
  },
  {
    icon: User,
    title: 'Ficha do Contato',
    description: 'Histórico, saúde e origem de captura',
  },
  {
    icon: BarChart2,
    title: 'Dashboard',
    description: 'Funil de evolução e movimentações',
  },
] as const

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
}

export const LifecycleOverviewSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[320px] flex-col gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {OVERVIEW_ITEMS.map((item) => {
        const Icon = item.icon

        return (
          <motion.div
            key={item.title}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
            variants={itemVariants}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">
                {item.title}
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground">
                {item.description}
              </p>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
