import Image from 'next/image'
import { Webhook } from 'lucide-react'
import { cn } from '@/_lib/utils'
import {
  PLATFORM_LOGOS,
  PLATFORM_LABELS,
  type WebhookPlatform,
} from '../_lib/platform-templates'

interface PlatformLogoProps {
  platform: WebhookPlatform
  size?: number
  className?: string
}

// Logo da plataforma do webhook. Plataformas sem asset (GENERIC/OTHER) caem
// no ícone genérico de webhook. unoptimized: são favicons ~64px, otimizar não
// agrega e evita exigir dangerouslyAllowSVG no next.config para o SVG da Monetizze.
export function PlatformLogo({
  platform,
  size = 16,
  className,
}: PlatformLogoProps) {
  const logo = PLATFORM_LOGOS[platform]

  if (!logo) {
    return (
      <Webhook
        className={cn('shrink-0 text-muted-foreground', className)}
        style={{ width: size, height: size }}
        aria-hidden
      />
    )
  }

  return (
    <Image
      src={logo}
      alt={PLATFORM_LABELS[platform]}
      width={size}
      height={size}
      unoptimized
      className={cn('shrink-0 rounded-[3px] object-contain', className)}
    />
  )
}
