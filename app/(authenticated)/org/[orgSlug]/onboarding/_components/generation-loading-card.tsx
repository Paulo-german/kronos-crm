'use client'

import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/_components/ui/card'
import { Skeleton } from '@/_components/ui/skeleton'

interface GenerationLoadingCardProps {
  title: string
  description: string
}

export function GenerationLoadingCard({
  title,
  description,
}: GenerationLoadingCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
    </Card>
  )
}
