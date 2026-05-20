'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CircleIcon,
  FileText,
  PackageIcon,
  CheckSquare,
  CalendarIcon,
  CheckCircle2,
} from 'lucide-react'

const FEATURES = [
  {
    icon: FileText,
    label: 'Resumo',
    desc: 'Info do deal, contatos, notas e timeline',
    color: 'text-kronos-blue',
    bg: 'bg-kronos-blue/10',
    activeBorder: 'border-kronos-blue/40',
    activeBg: 'bg-kronos-blue/5',
  },
  {
    icon: PackageIcon,
    label: 'Produtos',
    desc: 'Produtos, serviços e promoções',
    color: 'text-kronos-purple',
    bg: 'bg-kronos-purple/10',
    activeBorder: 'border-kronos-purple/40',
    activeBg: 'bg-kronos-purple/5',
  },
  {
    icon: CheckSquare,
    label: 'Tarefas',
    desc: 'Ligações, reuniões, WhatsApp e visitas',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    activeBorder: 'border-amber-500/40',
    activeBg: 'bg-amber-500/5',
  },
  {
    icon: CalendarIcon,
    label: 'Agendamentos',
    desc: 'Agendamentos vinculados ao negócio',
    color: 'text-kronos-green',
    bg: 'bg-kronos-green/10',
    activeBorder: 'border-kronos-green/40',
    activeBg: 'bg-kronos-green/5',
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export const PipelineDealDetailSlide = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    const timeout = setTimeout(() => setActiveIndex(0), 1200)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (activeIndex === null) return
    const timeout = setTimeout(
      () => setActiveIndex((prev) => (((prev ?? 0) + 1) % 4)),
      1000
    )
    return () => clearTimeout(timeout)
  }, [activeIndex])

  return (
    <motion.div
      className="flex w-full max-w-[320px] flex-col gap-3"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Mini header do deal */}
      <motion.div
        variants={itemVariants}
        className="rounded-xl border border-border bg-card px-3.5 py-3"
      >
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-kronos-purple/20 bg-kronos-purple/10 px-2 py-0.5 text-[9px] font-semibold text-kronos-purple">
            <CircleIcon className="h-1.5 w-1.5 fill-current" />
            EM ANDAMENTO
          </span>
          <span className="inline-flex rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-semibold text-amber-500">
            ALTA
          </span>
        </div>
        <p className="text-sm font-bold text-foreground">Proposta Acme Corp</p>
        <p className="text-[10px] text-muted-foreground">R$ 45.000 · Qualificado</p>
      </motion.div>

      {/* Grid de funcionalidades */}
      <div className="grid grid-cols-2 gap-2">
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.label}
            variants={itemVariants}
            animate={{ scale: activeIndex === i ? 1.02 : 1 }}
            transition={{ duration: 0.2 }}
            className={`rounded-lg border p-2.5 transition-colors duration-300 ${
              activeIndex === i
                ? `${feature.activeBorder} ${feature.activeBg}`
                : 'border-border bg-card'
            }`}
          >
            <div className={`mb-1.5 inline-flex items-center justify-center rounded-md p-1.5 ${feature.bg}`}>
              <feature.icon className={`h-3.5 w-3.5 ${feature.color}`} />
            </div>
            <p className="mb-0.5 text-[10px] font-semibold text-foreground">{feature.label}</p>
            <p className="text-[8px] leading-relaxed text-muted-foreground">{feature.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Fechar negócio */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-2 rounded-lg border border-kronos-green/30 bg-kronos-green/5 px-3 py-2"
      >
        <CheckCircle2 className="h-4 w-4 shrink-0 text-kronos-green" />
        <div>
          <p className="text-[10px] font-semibold text-foreground">Fechar negócio</p>
          <p className="text-[8px] text-muted-foreground">Marque como venda ou informe o motivo da perda</p>
        </div>
      </motion.div>
    </motion.div>
  )
}
