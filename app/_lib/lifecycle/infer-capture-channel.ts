import { CaptureChannel, InboxChannel } from '@prisma/client'

const CHANNEL_MAP: Record<InboxChannel, CaptureChannel> = {
  WHATSAPP: CaptureChannel.WHATSAPP,
  WEB_CHAT: CaptureChannel.WEBSITE_CHAT,
  INSTAGRAM_DM: CaptureChannel.INSTAGRAM,
}

export function inferCaptureChannelFromInboxChannel(inboxChannel: InboxChannel): CaptureChannel {
  return CHANNEL_MAP[inboxChannel] ?? CaptureChannel.UNKNOWN
}
