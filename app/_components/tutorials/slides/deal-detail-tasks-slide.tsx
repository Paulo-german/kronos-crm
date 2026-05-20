'use client'

import { motion } from 'framer-motion'
import { Phone, Video, MessageSquare, Square } from 'lucide-react'

const TASKS = [
  {
    id: '1',
    title: 'Ligação de follow-up',
    icon: Phone,
    completed: true,
    outcome: 'Atendeu — quer proposta',
    outcomestyle: 'bg-kronos-green/10 text-kronos-green',
  },
  {
    id: '2',
    title: 'Demo do produto',
    icon: Video,
    completed: false,
    dueDate: 'Amanhã, 14:00',
  },
  {
    id: '3',
    title: 'Enviar proposta pelo WhatsApp',
    icon: MessageSquare,
    completed: false,
    dueDate: 'Hoje, 18:00',
    dueDateStyle: 'text-amber-500',
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export const DealDetailTasksSlide = () => {
  return (
    <motion.div
      className="w-full max-w-[320px] overflow-hidden rounded-xl border border-border bg-card"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div
        variants={rowVariants}
        className="flex items-center justify-between border-b border-border px-3.5 py-2.5"
      >
        <p className="text-sm font-semibold text-foreground">Tarefas</p>
        <button className="rounded-md bg-primary px-2.5 py-1 text-[9px] font-semibold text-primary-foreground">
          + Nova tarefa
        </button>
      </motion.div>

      {/* Tasks */}
      <div className="divide-y divide-border/60">
        {TASKS.map((task) => (
          <motion.div
            key={task.id}
            variants={rowVariants}
            className="flex items-start gap-2.5 px-3.5 py-2.5"
          >
            {task.completed ? (
              <div className="relative mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-kronos-green/50 bg-kronos-green/10">
                <motion.svg viewBox="0 0 10 8" className="h-2 w-2 overflow-visible">
                  <motion.path
                    d="M1 4 L3.5 6.5 L9 1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-kronos-green"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.6, ease: 'easeOut' }}
                  />
                </motion.svg>
              </div>
            ) : (
              <Square className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-1.5">
                <task.icon className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                <p
                  className={`text-[10px] font-medium ${
                    task.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                  }`}
                >
                  {task.title}
                </p>
              </div>
              {task.outcome && (
                <span className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-medium ${task.outcomestyle}`}>
                  {task.outcome}
                </span>
              )}
              {task.dueDate && (
                <p className={`text-[8px] ${task.dueDateStyle ?? 'text-muted-foreground'}`}>
                  {task.dueDate}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
