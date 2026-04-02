'use client'

import {
  Card,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface CardSettingsProps {
  children: React.ReactNode
  orgSlug: string
  href: string
  title: string
}

const CardSettings = ({
  children,
  orgSlug,
  href,
  title,
}: CardSettingsProps) => {
  return (
    <Link key={href} href={`/org/${orgSlug}/${href}`}>
      <Card className="rounded-lg bg-muted/30 transition-colors hover:bg-muted/50">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                {children}
              </span>
              <CardTitle className="text-sm">{title}</CardTitle>
            </div>
            <ChevronRight size={20} className="text-muted-foreground" />
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}
export default CardSettings
