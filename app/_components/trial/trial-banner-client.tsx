'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/_components/ui/button'
import type { MemberRole } from '@prisma/client'
import type { TrialStatus } from '@/_data-access/billing/get-trial-status'

interface TrialBannerClientProps {
  phase: TrialStatus['phase']
  daysRemaining: number
  trialEndsAt: string | null
  isExpired: boolean
  neverHadTrial: boolean
  orgSlug: string
  userRole: MemberRole
}

interface Countdown {
  days: number
  hours: number
  minutes: number
}

function calcCountdown(endsAt: string): Countdown {
  const diffMs = new Date(endsAt).getTime() - Date.now()
  if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0 }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  return { days, hours, minutes }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export const TrialBannerClient = ({
  phase,
  daysRemaining,
  trialEndsAt,
  isExpired,
  neverHadTrial,
  orgSlug,
  userRole,
}: TrialBannerClientProps) => {
  const [countdown, setCountdown] = useState<Countdown | null>(null)

  const updateCountdown = useCallback(() => {
    if (trialEndsAt && !isExpired) {
      setCountdown(calcCountdown(trialEndsAt))
    }
  }, [trialEndsAt, isExpired])

  useEffect(() => {
    updateCountdown()
    if (!trialEndsAt || isExpired) return

    const interval = setInterval(updateCountdown, 60_000)
    return () => clearInterval(interval)
  }, [trialEndsAt, isExpired, updateCountdown])

  if (phase === 'none') return null

  const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN'

  // Quando nunca teve trial: não há countdown, apenas mensagem direta
  const showCountdown = !neverHadTrial

  const countdownText = countdown ? (
    <span className="inline-flex gap-1.5 text-white">
      <span className="rounded bg-white/20 px-1.5 py-0.5">
        {pad(countdown.days)}d
      </span>
      <span className="rounded bg-white/20 px-1.5 py-0.5">
        {pad(countdown.hours)}h
      </span>
      <span className="rounded bg-white/20 px-1.5 py-0.5">
        {pad(countdown.minutes)}m
      </span>
    </span>
  ) : (
    `${pad(daysRemaining)}d 00h 00m`
  )

  const leftText = neverHadTrial
    ? 'Assine um plano para começar a usar o Kronos'
    : isExpired
      ? 'Seu período de teste encerrou.'
      : 'Seu período de teste encerra em'

  return (
    <div className="bg-banner-premium flex flex-col items-center gap-2 border-b border-primary/50 px-4 py-2.5 text-white md:flex-row md:gap-3">
      {/* Countdown / mensagem de status */}
      <span className="flex items-center gap-2 text-sm">
        {leftText}
        {showCountdown && !isExpired && (
          <span className="font-mono text-sm font-semibold tabular-nums">
            {countdownText}
          </span>
        )}
      </span>

      {/* CTA text - hidden no mobile para economizar espaço */}
      <span className="hidden flex-1 text-center text-sm font-bold md:ml-[-10vw] md:block">
        Assine um plano e acelere suas vendas! 🎉
      </span>

      {/* Botão */}
      <div className="flex items-center gap-2">
        {isAdmin ? (
          <Button
            size="sm"
            variant="secondary"
            className="bg-background text-foreground"
            asChild
          >
            <Link href={`/org/${orgSlug}/plans`}>
              {isExpired ? 'Assinar agora' : 'Ver planos'}
            </Link>
          </Button>
        ) : (
          <span className="text-xs text-white/70">
            Fale com o administrador
          </span>
        )}
      </div>
    </div>
  )
}
