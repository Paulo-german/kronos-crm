'use client'

import { motion } from 'framer-motion'
import { Card } from '@/_components/ui/card'
import { NicheIcon } from './niche-icon'
import { cn } from '@/_lib/utils'

interface NicheCardProps {
  nicheKey: string
  label: string
  description: string
  icon: string
  isSelected: boolean
  onSelect: (key: string) => void
  index: number
}

export function NicheCard({
  nicheKey,
  label,
  description,
  icon,
  isSelected,
  onSelect,
  index,
}: NicheCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card
        role="radio"
        aria-checked={isSelected}
        tabIndex={0}
        onClick={() => onSelect(nicheKey)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect(nicheKey)
          }
        }}
        className={cn(
          'flex cursor-pointer flex-col gap-3 p-5 transition-colors hover:bg-accent/50',
          isSelected && 'border-primary ring-1 ring-primary',
        )}
      >
        <NicheIcon
          name={icon}
          className={cn(
            'size-7 text-muted-foreground',
            isSelected && 'text-primary',
          )}
        />
        <div className="space-y-1">
          <p className="font-semibold leading-tight">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </Card>
    </motion.div>
  )
}
