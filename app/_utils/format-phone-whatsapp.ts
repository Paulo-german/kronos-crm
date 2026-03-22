/**
 * Formata número de telefone para link wa.me
 * Remove caracteres não numéricos e adiciona DDI 55 se necessário (Brasil)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  // Adiciona código do país se não tiver (assumindo Brasil +55)
  if (cleaned.length === 11 || cleaned.length === 10) {
    return `55${cleaned}`
  }
  return cleaned
}
