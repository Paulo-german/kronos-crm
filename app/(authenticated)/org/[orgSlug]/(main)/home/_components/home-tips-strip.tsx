'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Card, CardContent } from '@/_components/ui/card'
import { HOME_TIPS } from '../_data/home-tips'

const INTERVAL_MS = 5000

const HomeTipsStrip = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressKey = useRef(0)
  const shouldReduce = useReducedMotion()

  const startInterval = () => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HOME_TIPS.length)
    }, INTERVAL_MS)
  }

  useEffect(() => {
    if (!isPaused) startInterval()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPaused])

  const handleMouseEnter = () => {
    setIsPaused(true)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const handleMouseLeave = () => {
    setIsPaused(false)
  }

  const handleDotClick = (index: number) => {
    setCurrentIndex(index)
    progressKey.current += 1
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsPaused(false)
  }

  const tip = HOME_TIPS[currentIndex]
  const Icon = tip.icon

  const inner = (
    <CardContent className="flex items-center gap-4 py-0 px-5 h-full w-full">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary leading-none">
            Dica
          </span>
          <p className="text-sm font-semibold leading-tight truncate">{tip.title}</p>
        </div>
        <p className="text-xs text-muted-foreground leading-snug line-clamp-1">{tip.description}</p>
      </div>
    </CardContent>
  )

  return (
    <Card
      className="relative overflow-hidden cursor-default h-[68px]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={tip.id}
          initial={{ opacity: 0, y: shouldReduce ? 0 : 7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: shouldReduce ? 0 : -7 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="absolute inset-0 flex items-center"
        >
          {tip.href ? (
            <Link href={tip.href} className="flex-1 h-full flex items-center hover:bg-muted/20 transition-colors">
              {inner}
            </Link>
          ) : (
            <div className="flex-1 h-full flex items-center">{inner}</div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dots de navegação */}
      <div className="absolute bottom-2 right-4 flex items-center gap-1">
        {HOME_TIPS.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`h-1 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'w-3 bg-primary'
                : 'w-1 bg-muted-foreground/25 hover:bg-muted-foreground/45'
            }`}
            aria-label={`Ir para dica ${index + 1}`}
          />
        ))}
      </div>

      {/* Barra de progresso no fundo */}
      {!shouldReduce && !isPaused && (
        <motion.div
          key={`progress-${currentIndex}-${progressKey.current}`}
          className="absolute bottom-0 left-0 h-[2px] bg-primary"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: INTERVAL_MS / 1000, ease: 'linear' }}
        />
      )}
    </Card>
  )
}

export default HomeTipsStrip
