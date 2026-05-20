import type { WebhookPlatform } from '@prisma/client'

interface VerifyHmacInput {
  platform: WebhookPlatform
  rawBody: string
  secretKey: string
  headers: Headers
}

// Stub Fase 2 — verificação real por plataforma (Shopify/Hotmart/etc) será adicionada depois.
// Mantém o contrato pra rota não quebrar quando `secretKey` for setado prematuramente:
// até a Fase 2 entrar, retornar `false` força rejeição explícita ao invés de bypass silencioso.
export function verifyHmacSignature(input: VerifyHmacInput): boolean {
  // Placeholder: assina-se o uso pra evitar warning até a Fase 2 substituir esta função.
  void input
  return false
}
