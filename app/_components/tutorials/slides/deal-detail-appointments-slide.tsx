'use client'

import { motion } from 'framer-motion'
import { CalendarIcon, ClockIcon, UserIcon } from 'lucide-react'

const APPOINTMENTS = [
  {
    id: '1',
    title: 'Demo do Software',
    date: '25/05/2026',
    time: '14:00',
    duration: '1h',
    contact: 'Felipe Andrade',
    statusLabel: 'Agendado',
    statusStyle: 'text-kronos-blue bg-kronos-blue/10',
  },
  {
    id: '2',
    title: 'Reunião de Alinhamento',
    date: '15/05/2026',
    time: '10:00',
    duration: '30min',
    contact: 'Felipe Andrade',
    statusLabel: 'Concluído',
    statusStyle: 'text-kronos-green bg-kronos-green/10',
  },
  {
    id: '3',
    title: 'Apresentação Final',
    date: '02/06/2026',
    time: '09:30',
    duration: '1h30',
    contact: 'Felipe Andrade',
    statusLabel: 'Pendente',
    statusStyle: 'text-muted-foreground bg-muted',
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

export const DealDetailAppointmentsSlide = () => {
  return (
    <motion.div
      className="w-full max-w-[360px] overflow-hidden rounded-xl border border-border bg-card"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div
        variants={rowVariants}
        className="flex items-center justify-between border-b border-border px-3.5 py-2.5"
      >
        <p className="text-sm font-semibold text-foreground">Agendamentos</p>
        <button className="rounded-md bg-primary px-2.5 py-1 text-[9px] font-semibold text-primary-foreground">
          + Agendar
        </button>
      </motion.div>

      {/* Appointments */}
      <div className="divide-y divide-border/60">
        {APPOINTMENTS.map((apt) => (
          <motion.div key={apt.id} variants={rowVariants} className="px-3.5 py-2.5">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[10px] font-semibold text-foreground">{apt.title}</p>
              <span className={`rounded px-1.5 py-0.5 text-[7px] font-semibold ${apt.statusStyle}`}>
                {apt.statusLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[8px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-2.5 w-2.5" />
                {apt.date}
              </span>
              <span className="flex items-center gap-1">
                <ClockIcon className="h-2.5 w-2.5" />
                {apt.time} · {apt.duration}
              </span>
              <span className="flex items-center gap-1">
                <UserIcon className="h-2.5 w-2.5" />
                {apt.contact}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
