'use client'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { ChevronRight, UserIcon } from 'lucide-react'
import Link from 'next/link'

interface CardSettingsProps {
  children: React.ReactNode
  orgSlug: string
  href: string
  title: string
  description: string
}

const CardSettings = ({
  children,
  orgSlug,
  href,
  title,
  description,
}: CardSettingsProps) => {
  return (
    <Link key={href} href={`/org/${orgSlug}/${href}`}>
      <Card className="rounded-md transition-colors hover:bg-muted/50">
        <CardHeader>
          <div className="flex flex-row items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              {children}
            </div>
            <div className="flex-1 space-y-1">
              <CardTitle className="text-">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <ChevronRight size={20} className="text-muted-foreground" />
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}
export default CardSettings
