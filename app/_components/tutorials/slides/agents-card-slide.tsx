'use client'

import { useState, useEffect } from 'react'
import { motion, animate } from 'framer-motion'
import {
  BotIcon,
  ZapIcon,
  SmartphoneIcon,
  FileTextIcon,
  MoreHorizontalIcon,
} from 'lucide-react'

export const AgentsCardSlide = () => {
  const [isActive, setIsActive] = useState(false)
  const [steps, setSteps] = useState(0)
  const [inboxes, setInboxes] = useState(0)
  const [docs, setDocs] = useState(0)

  useEffect(() => {
    const toggleTimer = setTimeout(() => setIsActive(true), 800)
    return () => clearTimeout(toggleTimer)
  }, [])

  useEffect(() => {
    if (!isActive) return

    const countTimer = setTimeout(() => {
      const stepsAnimation = animate(0, 4, {
        duration: 0.6,
        ease: 'easeOut',
        onUpdate: (value) => setSteps(Math.round(value)),
      })
      const inboxesAnimation = animate(0, 2, {
        duration: 0.6,
        ease: 'easeOut',
        onUpdate: (value) => setInboxes(Math.round(value)),
      })
      const docsAnimation = animate(0, 3, {
        duration: 0.6,
        ease: 'easeOut',
        onUpdate: (value) => setDocs(Math.round(value)),
      })

      return () => {
        stepsAnimation.stop()
        inboxesAnimation.stop()
        docsAnimation.stop()
      }
    }, 1200)

    return () => clearTimeout(countTimer)
  }, [isActive])

  return (
    <motion.div
      className="w-full max-w-[280px]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`relative h-5 w-9 rounded-full transition-colors duration-500 ${
                  isActive ? 'bg-kronos-green' : 'bg-muted-foreground/30'
                }`}
              >
                <motion.div
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow"
                  animate={{ x: isActive ? 18 : 2 }}
                  transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
                />
              </div>
              <motion.span
                key={isActive ? 'ativo' : 'inativo'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className={`text-xs font-medium transition-colors duration-300 ${
                  isActive ? 'text-kronos-green' : 'text-muted-foreground'
                }`}
              >
                {isActive ? 'Ativo' : 'Inativo'}
              </motion.span>
            </div>

            <div className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground">
              <MoreHorizontalIcon className="h-4 w-4" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-kronos-purple shadow-sm">
              <BotIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold leading-tight text-foreground">
                Agente SDR
              </p>
              <span className="inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                Gemini 2.5 Pro
              </span>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <ZapIcon className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">{steps}</span> etapas
              </span>
            </div>
            <div className="flex items-center gap-1">
              <SmartphoneIcon className="h-3.5 w-3.5 text-kronos-blue" />
              <span className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">{inboxes}</span> inboxes
              </span>
            </div>
            <div className="flex items-center gap-1">
              <FileTextIcon className="h-3.5 w-3.5 text-kronos-purple" />
              <span className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">{docs}</span> docs
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
