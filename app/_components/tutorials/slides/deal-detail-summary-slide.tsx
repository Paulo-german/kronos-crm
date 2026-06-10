'use client'

import { motion } from 'framer-motion'
import { Phone, MessageSquare, Video } from 'lucide-react'

const ACTIVITIES = [
  {
    icon: Phone,
    label: 'Ligação realizada',
    sub: 'Atendeu — quer proposta',
    time: 'Hoje, 14:30',
    color: 'text-kronos-blue bg-kronos-blue/10',
  },
  {
    icon: MessageSquare,
    label: 'WhatsApp enviado',
    sub: 'Proposta encaminhada',
    time: 'Ontem, 10:15',
    color: 'text-kronos-green bg-kronos-green/10',
  },
  {
    icon: Video,
    label: 'Demo realizada',
    sub: 'Cliente aprovado produto',
    time: '12/05, 09:00',
    color: 'text-kronos-purple bg-kronos-purple/10',
  },
]

const colVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, delay: i * 0.14 },
  }),
}

const rowVariants = {
  hidden: { opacity: 0, x: -6 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.22, delay: 0.3 + i * 0.1 },
  }),
}

export const DealDetailSummarySlide = () => {
  return (
    <div className="flex w-full gap-3">
      {/* Coluna esquerda — 40% */}
      <div className="flex w-[42%] flex-col gap-2">
        {/* Info */}
        <motion.div
          custom={0}
          variants={colVariants}
          initial="hidden"
          animate="show"
          className="rounded-lg border border-border bg-card p-2.5"
        >
          <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
            Informações
          </p>
          {[
            { label: 'Valor', value: 'R$ 45.000' },
            { label: 'Etapa', value: 'Qualificado' },
            { label: 'Fechamento', value: '30/06/2026' },
          ].map((field) => (
            <div
              key={field.label}
              className="flex items-center justify-between border-t border-border/50 py-1.5"
            >
              <span className="text-[8px] text-muted-foreground">
                {field.label}
              </span>
              <span className="text-[8px] font-medium text-foreground">
                {field.value}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Contato */}
        <motion.div
          custom={1}
          variants={colVariants}
          initial="hidden"
          animate="show"
          className="flex items-center gap-2 rounded-lg border border-border bg-card p-2"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-kronos-purple">
            FA
          </div>
          <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold text-foreground">
              Felipe Andrade
            </p>
            <p className="truncate text-[8px] text-muted-foreground">
              Contato vinculado
            </p>
          </div>
        </motion.div>

        {/* Notas */}
        <motion.div
          custom={2}
          variants={colVariants}
          initial="hidden"
          animate="show"
          className="rounded-lg border border-border bg-card p-2.5"
        >
          <p className="mb-1 text-[8px] font-semibold text-muted-foreground">
            Notas internas
          </p>
          <p className="text-[8px] leading-relaxed text-foreground/70">
            Cliente quer automatizar vendas. Demo agendada para 25/05...
          </p>
        </motion.div>
      </div>

      {/* Coluna direita — timeline */}
      <motion.div
        custom={3}
        variants={colVariants}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col"
      >
        <div className="rounded-lg border border-border bg-card p-2.5">
          <p className="mb-2 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
            Timeline de atividades
          </p>
          {/* Wrapper relative para a linha */}
          <div className="relative">
            {/* Linha animada */}
            <motion.div
              className="absolute bottom-2 left-[9px] top-5 w-px bg-border/70"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              style={{ transformOrigin: 'top' }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.5 }}
            />
            {/* Entries */}
            {ACTIVITIES.map((activity, i) => (
              <motion.div
                key={activity.label}
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="show"
                className="flex items-start gap-2 py-2 first:pt-0"
              >
                <div
                  className={`relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${activity.color}`}
                >
                  <activity.icon className="h-2.5 w-2.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-medium text-foreground">
                    {activity.label}
                  </p>
                  <p className="text-[8px] text-muted-foreground">
                    {activity.sub}
                  </p>
                  <p className="text-[8px] text-muted-foreground/60">
                    {activity.time}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
