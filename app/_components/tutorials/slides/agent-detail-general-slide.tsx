'use client'

import { motion } from 'framer-motion'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
}

const sectionVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
}

const MODELS = [
  {
    initial: 'G',
    name: 'Gemini 2.5 Pro',
    badge: 'Recomendado',
    avatarBg: 'bg-kronos-blue/10',
    avatarText: 'text-kronos-blue',
    selected: true,
  },
  {
    initial: 'O',
    name: 'GPT 5.4 Mini',
    badge: null,
    avatarBg: 'bg-kronos-green/10',
    avatarText: 'text-kronos-green',
    selected: false,
  },
  {
    initial: 'A',
    name: 'Claude Sonnet 4',
    badge: null,
    avatarBg: 'bg-amber-500/10',
    avatarText: 'text-amber-500',
    selected: false,
  },
]

export const AgentDetailGeneralSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[280px] flex-col gap-3"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={sectionVariants} className="flex flex-col gap-1.5">
        <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
          Identidade
        </span>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-2.5 py-2">
            <span className="text-[9px] text-muted-foreground">Nome do agente</span>
            <span className="max-w-[110px] truncate rounded-md border border-border bg-muted/30 px-2 py-1 text-[9px] font-medium text-foreground">
              Agente SDR Kronos
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border px-2.5 py-2">
            <span className="text-[9px] text-muted-foreground">Papel</span>
            <span className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[9px] font-medium text-foreground">
              SDR ▾
            </span>
          </div>
          <div className="flex items-center justify-between px-2.5 py-2">
            <span className="text-[9px] text-muted-foreground">Tom de voz</span>
            <span className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[9px] font-medium text-foreground">
              Profissional ▾
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div variants={sectionVariants} className="flex flex-col gap-1.5">
        <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
          Modelo de IA
        </span>
        <div className="flex flex-col gap-1">
          {MODELS.map((model) => (
            <div
              key={model.name}
              className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${
                model.selected
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-card opacity-60'
              }`}
            >
              <div className="flex items-center gap-1.5 flex-1">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${model.avatarBg} ${model.avatarText}`}
                >
                  {model.initial}
                </span>
                <span className="text-[9px] font-medium text-foreground">{model.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {model.badge && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[7px] font-semibold text-primary">
                    {model.badge}
                  </span>
                )}
                <div
                  className={`h-3 w-3 rounded-full border-2 ${
                    model.selected ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={sectionVariants} className="flex flex-col gap-1.5">
        <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
          Horário de atendimento
        </span>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-2.5 py-2">
            <span className="text-[9px] text-muted-foreground">Ativar horário</span>
            <div className="relative h-4 w-7 rounded-full bg-kronos-green">
              <motion.div
                className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm"
                animate={{ x: 14 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between px-2.5 py-2">
            <span className="text-[9px] text-muted-foreground">Seg–Sex</span>
            <span className="text-[9px] font-medium text-foreground">09:00 – 18:00</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
