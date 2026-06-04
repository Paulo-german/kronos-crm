/**
 * Deriva o primeiro nome a partir do nome completo ou email do usuário.
 * Fallback: parte local do email. Fallback final: 'por aí'.
 */
export const deriveFirstName = (fullName: string | null, email: string): string => {
  if (fullName?.trim()) return fullName.trim().split(' ')[0]

  const localPart = email.split('@')[0]
  return localPart || 'por aí'
}
