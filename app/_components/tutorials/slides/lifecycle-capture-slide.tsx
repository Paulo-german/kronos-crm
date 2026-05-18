'use client'

import { motion } from 'framer-motion'
import { CaptureChannel } from '@prisma/client'
import { CAPTURE_CHANNEL_CONFIG } from '@/_lib/lifecycle/capture-channel-config'

const FEATURED_CHANNELS: CaptureChannel[] = [
  CaptureChannel.WHATSAPP,
  CaptureChannel.EMBED_FORM,
  CaptureChannel.REFERRAL,
  CaptureChannel.EMAIL,
  CaptureChannel.INSTAGRAM,
  CaptureChannel.PHONE_CALL,
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
}

export const LifecycleCaptureSlide = () => {
  return (
    <motion.div
      className="grid w-full max-w-[320px] grid-cols-2 gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {FEATURED_CHANNELS.map((channel) => {
        const config = CAPTURE_CHANNEL_CONFIG[channel]
        const Icon = config.icon

        return (
          <motion.div
            key={channel}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground"
            variants={itemVariants}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-xs font-medium">{config.label}</span>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
