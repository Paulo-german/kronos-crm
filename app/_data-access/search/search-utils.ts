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
