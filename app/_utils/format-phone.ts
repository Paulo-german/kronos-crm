export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return ''

  // Remove tudo que não é dígito
  const cleanPhone = phone.replace(/\D/g, '')

  // Verifica se começa com DDI 55 (Brasil)
  const isBR = cleanPhone.startsWith('55')
  const phoneBody = isBR ? cleanPhone.slice(2) : cleanPhone

  // Se o corpo tiver 11 dígitos (Celular com DDD) ou 10 dígitos (Fixo com DDD)
  if (phoneBody.length === 11) {
    // (XX) 9XXXX-XXXX
    return `+55 (${phoneBody.slice(0, 2)}) ${phoneBody.slice(2, 7)}-${phoneBody.slice(7)}`
  }

  if (phoneBody.length === 10) {
    // (XX) XXXX-XXXX
    return `+55 (${phoneBody.slice(0, 2)}) ${phoneBody.slice(2, 6)}-${phoneBody.slice(6)}`
  }

  // Se não se encaixar nos patrões acima, retorna formatado genérico ou original
  // Tenta formatar genericamente se tiver DDI
  if (cleanPhone.length > 11) {
    return `+${cleanPhone}`
  }

  return phone
}
