'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SlidersHorizontalIcon,
  ListOrderedIcon,
  BookOpenIcon,
  PlugIcon,
  RepeatIcon,
  ChevronLeftIcon,
  CircleIcon,
  CheckCircle2Icon,
} from 'lucide-react'

const TABS = [
  {
    icon: SlidersHorizontalIcon,
    label: 'Geral',
    color: 'text-kronos-blue',
    bg: 'bg-kronos-blue/10',
    border: 'border-kronos-blue/30',
    cardBg: 'bg-kronos-blue/5',
    bullets: [
      'Identidade: nome, papel e empresa',
      'Modelo de IA e tom de voz',
      'Horário de atendimento',
    ],
  },
  {
    icon: ListOrderedIcon,
    label: 'Processo',
    color: 'text-kronos-purple',
    bg: 'bg-kronos-purple/10',
    border: 'border-kronos-purple/30',
    cardBg: 'bg-kronos-purple/5',
    bullets: [
      'Steps em sequência com drag-and-drop',
      'Ações por step: mover etapa, criar tarefa',
      'Hand-off automático para humano',
    ],
  },
  {
    icon: BookOpenIcon,
    label: 'Conhecimento',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    cardBg: 'bg-amber-500/5',
    bullets: [
      'Upload de PDF, TXT e DOCX',
      'Processamento automático dos arquivos',
      'Agente responde com base no conteúdo',
    ],
  },
  {
    icon: PlugIcon,
    label: 'Conexão',
    color: 'text-kronos-green',
    bg: 'bg-kronos-green/10',
    border: 'border-kronos-green/30',
    cardBg: 'bg-kronos-green/5',
    bullets: [
      'Vincule inboxes WhatsApp e Instagram',
      'Cada inbox passa a ser atendida pelo agente',
      'Visualize o status da conexão em tempo real',
    ],
  },
  {
    icon: RepeatIcon,
    label: 'Follow-ups',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    cardBg: 'bg-primary/5',
    bullets: [
      'Regras automáticas por tempo sem resposta',
      'Configure a ação: mensagem ou notificação',
      'Defina o que acontece ao esgotar todos',
    ],
  },
]

export const AgentDetailOverviewSlide = () => {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(
      () => setActiveIndex((prev) => (prev + 1) % TABS.length),
      2200,
    )
    return () => clearTimeout(timeout)
  }, [activeIndex])

  const active = TABS[activeIndex]

  return (
    <div className="flex w-full max-w-[300px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <ChevronLeftIcon className="h-3 w-3 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">Voltar</span>
        </div>
        <span className="text-[10px] font-bold text-foreground">Agente SDR</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-kronos-green/10 px-2 py-0.5 text-[8px] font-semibold text-kronos-green">
          <CircleIcon className="h-1.5 w-1.5 fill-current" />
          Ativo
        </span>
      </div>

      <div className="flex items-center gap-0.5 border-b border-border px-2 py-1.5">
        {TABS.map((tab, i) => {
          const Icon = tab.icon
          const isActive = i === activeIndex
          return (
            <motion.div
              key={tab.label}
              animate={
                isActive
                  ? { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
                  : { backgroundColor: 'transparent', color: 'hsl(var(--muted-foreground))' }
              }
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1.5"
            >
              <Icon className="h-2.5 w-2.5 shrink-0" />
              <span className="text-[6.5px] font-medium leading-none">{tab.label}</span>
            </motion.div>
          )
        })}
      </div>

      <div className="p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.03, y: -8 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`rounded-xl border p-3 ${active.border} ${active.cardBg}`}
          >
            <div className="mb-2.5 flex items-center gap-2.5">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active.bg}`}>
                <active.icon className={`h-4.5 w-4.5 ${active.color}`} />
              </div>
              <p className={`text-sm font-bold ${active.color}`}>{active.label}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              {active.bullets.map((bullet) => (
                <div key={bullet} className="flex items-start gap-1.5">
                  <CheckCircle2Icon className={`mt-px h-3 w-3 shrink-0 ${active.color}`} />
                  <span className="text-[9px] leading-relaxed text-foreground/80">{bullet}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
