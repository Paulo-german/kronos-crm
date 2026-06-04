'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/_components/ui/card'
import { Progress } from '@/_components/ui/progress'
import { Checkbox } from '@/_components/ui/checkbox'
import { cn } from '@/_lib/utils'
import { HOME_DATA, LOCALSTORAGE_KEY } from '../_data/home-data'
import type { ModuleSlug } from '@/_data-access/module/types'

interface OnboardingChecklistProps {
  orgSlug: string
  activeModules: ModuleSlug[]
}

const OnboardingChecklist = ({ orgSlug, activeModules }: OnboardingChecklistProps) => {
  // Inicializar com Set vazio para evitar divergência de hidratação SSR/CSR
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  // Único useEffect: sincronização com localStorage (sistema externo de browser)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALSTORAGE_KEY)
      if (stored) setCompleted(new Set(JSON.parse(stored) as string[]))
    } catch {
      // localStorage indisponível — manter Set vazio
    }
  }, [])

  const visibleItems = HOME_DATA.checklist.filter(
    (item) => !item.requiredModule || activeModules.includes(item.requiredModule),
  )

  const progressValue = visibleItems.length > 0
    ? Math.round((completed.size / visibleItems.length) * 100)
    : 0

  const toggleItem = (itemId: string) => {
    const next = new Set(completed)
    if (next.has(itemId)) {
      next.delete(itemId)
    } else {
      next.add(itemId)
    }
    setCompleted(next)
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify([...next]))
    } catch {
      // localStorage indisponível — ignorar persistência
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Primeiros passos</CardTitle>
          <span className="text-xs text-muted-foreground">
            {completed.size}/{visibleItems.length} concluídos
          </span>
        </div>
        <Progress value={progressValue} className="mt-2 h-1.5" />
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleItems.map((item) => {
          const isCompleted = completed.has(item.id)
          const href = item.href ? `/org/${orgSlug}${item.href}` : undefined

          return (
            <div key={item.id} className="flex items-start gap-3">
              <Checkbox
                id={`checklist-${item.id}`}
                checked={isCompleted}
                onCheckedChange={() => toggleItem(item.id)}
                className="mt-0.5 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <label
                  htmlFor={`checklist-${item.id}`}
                  className={cn(
                    'block cursor-pointer text-sm font-medium leading-tight',
                    isCompleted && 'line-through opacity-60',
                  )}
                >
                  {href && !isCompleted ? (
                    <Link href={href} className="hover:underline">
                      {item.title}
                    </Link>
                  ) : (
                    item.title
                  )}
                </label>
                <p className={cn('text-xs text-muted-foreground', isCompleted && 'opacity-60')}>
                  {item.description}
                </p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default OnboardingChecklist
