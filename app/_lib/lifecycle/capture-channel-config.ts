import {
  Calendar,
  Code2,
  Facebook,
  FileText,
  Globe,
  Handshake,
  HelpCircle,
  Instagram,
  Mail,
  MessageCircle,
  Phone,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { CaptureChannel } from '@prisma/client'

export interface CaptureChannelVisualConfig {
  label: string
  icon: LucideIcon
}

export const CAPTURE_CHANNEL_CONFIG: Record<CaptureChannel, CaptureChannelVisualConfig> = {
  [CaptureChannel.WHATSAPP]: { label: 'WhatsApp', icon: MessageCircle },
  [CaptureChannel.INSTAGRAM]: { label: 'Instagram', icon: Instagram },
  [CaptureChannel.WEBSITE_CHAT]: { label: 'Chat do Site', icon: Globe },
  [CaptureChannel.EMBED_FORM]: { label: 'Formulário', icon: FileText },
  [CaptureChannel.FACEBOOK_LEAD]: { label: 'Facebook Lead', icon: Facebook },
  [CaptureChannel.API]: { label: 'API', icon: Code2 },
  [CaptureChannel.PHONE_CALL]: { label: 'Ligação', icon: Phone },
  [CaptureChannel.IN_PERSON]: { label: 'Presencial', icon: Handshake },
  [CaptureChannel.EVENT]: { label: 'Evento', icon: Calendar },
  [CaptureChannel.EMAIL]: { label: 'E-mail', icon: Mail },
  [CaptureChannel.REFERRAL]: { label: 'Indicação', icon: Users },
  [CaptureChannel.IMPORT]: { label: 'Importação', icon: Upload },
  [CaptureChannel.UNKNOWN]: { label: 'Origem desconhecida', icon: HelpCircle },
}
