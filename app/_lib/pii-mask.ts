import { isElevated } from '@/_lib/rbac'
import type { MemberRole } from '@prisma/client'

/**
 * Determina se PII deve ser mascarado para este usuario/org.
 * Retorna true quando: a org ativou o toggle E o usuario e MEMBER.
 */
export function shouldMaskPii(userRole: MemberRole, hidePiiFromMembers: boolean): boolean {
  if (!hidePiiFromMembers) return false
  return !isElevated(userRole)
}

/** Mascara email: "john@example.com" → "j***@e***.com" */
export function maskEmail(email: string | null): string | null {
  if (!email) return null
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const [domainName, ...tld] = domain.split('.')
  const maskedLocal = (local[0] ?? '') + '***'
  const maskedDomain = (domainName[0] ?? '') + '***'
  return `${maskedLocal}@${maskedDomain}.${tld.join('.')}`
}

/** Mascara telefone: "11999991234" → "(**) *****-1234" */
export function maskPhone(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '***'
  const lastFour = digits.slice(-4)
  return `(**) *****-${lastFour}`
}

/** Mascara CPF: "12345678900" → "***.***-00" */
export function maskCpf(cpf: string | null): string | null {
  if (!cpf) return null
  const digits = cpf.replace(/\D/g, '')
  if (digits.length < 2) return '***'
  const lastTwo = digits.slice(-2)
  return `***.***-${lastTwo}`
}

/** Mascara remoteJid: "5511999991234@s.whatsapp.net" → "(**) *****-1234" */
export function maskRemoteJid(jid: string | null): string | null {
  if (!jid) return null
  const digits = jid.split('@')[0]?.replace(/\D/g, '') ?? ''
  if (digits.length < 4) return '***'
  const lastFour = digits.slice(-4)
  return `(**) *****-${lastFour}`
}
