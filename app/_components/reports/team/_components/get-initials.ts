export function getInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    // `[...part][0]` pega o primeiro code point (não a primeira unidade UTF-16),
    // evitando quebrar nomes iniciados por emoji/caractere fora do BMP.
    .map((part) => [...part][0] ?? '')
    .join('')
    .toUpperCase()
  return initials || '?'
}
