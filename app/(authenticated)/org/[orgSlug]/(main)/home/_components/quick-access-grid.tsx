'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Card, CardContent } from '@/_components/ui/card'
import { HOME_DATA } from '../_data/home-data'
import type { ModuleSlug } from '@/_data-access/module/types'

interface QuickAccessGridProps {
  orgSlug: string
  activeModules: ModuleSlug[]
}

const MotionCard = motion.create(Card)

const QuickAccessGrid = ({ orgSlug, activeModules }: QuickAccessGridProps) => {
  const shouldReduce = useReducedMotion()

  const visibleItems = HOME_DATA.quickAccess.filter(
    (item) => item.requiredModule === 'always' || activeModules.includes(item.requiredModule as ModuleSlug),
  )

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" style={{ perspective: 1000 }}>
      {visibleItems.map((item) => {
        const Icon = item.icon
        const href = `/org/${orgSlug}${item.href}`

        return (
          <Link key={item.id} href={href} className="group">
            <MotionCard
              className="h-full cursor-pointer border relative overflow-hidden hover:border-primary/50 transition-colors"
              style={{ transformStyle: 'preserve-3d' }}
              whileHover={
                shouldReduce
                  ? {}
                  : {
                      rotateX: -4,
                      rotateY: 4,
                      scale: 1.03,
                      transition: { type: 'spring', stiffness: 260, damping: 20 },
                    }
              }
            >
              <span className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.2),transparent_70%)]" />
              <CardContent className="flex flex-col gap-3 p-5">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"
                  style={{ transform: shouldReduce ? undefined : 'translateZ(20px)' }}
                >
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-sm leading-tight">{item.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{item.description}</p>
                </div>
              </CardContent>
            </MotionCard>
          </Link>
        )
      })}
    </div>
  )
}

export default QuickAccessGrid
