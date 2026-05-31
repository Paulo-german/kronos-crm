import { z } from 'zod'

export type CaptureBorderStyle = 'rounded' | 'square'

export interface CaptureAppearance {
  primaryColor: string
  backgroundColor: string
  title: string
  description: string
  logoUrl: string
  borderStyle: CaptureBorderStyle
}

export const DEFAULT_CAPTURE_APPEARANCE: CaptureAppearance = {
  primaryColor: '#0f172a',
  backgroundColor: '#ffffff',
  title: '',
  description: '',
  logoUrl: '',
  borderStyle: 'rounded',
}

const HEX = /^#([0-9a-fA-F]{6})$/

export const captureAppearanceSchema = z.object({
  primaryColor: z.string().regex(HEX, 'Cor inválida'),
  backgroundColor: z.string().regex(HEX, 'Cor inválida'),
  title: z.string().max(80),
  description: z.string().max(200),
  logoUrl: z.string().url().max(500).or(z.literal('')),
  borderStyle: z.enum(['rounded', 'square']),
})
