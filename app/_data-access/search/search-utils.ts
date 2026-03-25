/**
 * Normaliza documento (CPF) removendo pontos, traços e barras.
 * Ex: "123.456.789-00" -> "12345678900"
 */
export function normalizeDocument(value: string): string {
  return value.replace(/[.\-/]/g, '')
}

/**
 * Divide a query em tokens (palavras) para busca AND entre todas as palavras.
 * Ex: "silva joao" -> ["silva", "joao"]
 * Filtra tokens vazios para segurança.
 */
export function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0)
}

/**
 * Verifica se a string parece um documento (CPF).
 * Detecta formatos: "12345678900" ou "123.456.789-00" ou sequência de dígitos >= 3.
 */
export function looksLikeDocument(query: string): boolean {
  const cleaned = normalizeDocument(query)
  return /^\d{11}$/.test(cleaned) || /^\d{3,}$/.test(query.trim())
}
