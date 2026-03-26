import { db } from '@/_lib/prisma'

/**
 * Gera um slug a partir de um nome:
 * - Converte para lowercase
 * - Remove acentos (NFD normalize)
 * - Remove caracteres especiais
 * - Substitui espaços por hífens
 * - Colapsa hífens duplicados
 * - Limita a 50 caracteres
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Espaços viram hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .substring(0, 50) // Limita tamanho
}

/**
 * Garante unicidade do slug verificando o banco.
 * Se `baseSlug` já existe, tenta `baseSlug-1`, `baseSlug-2`, etc.
 *
 * Nota: a verificação ocorre fora de qualquer transação ativa.
 * A unique constraint em `organizations.slug` protege contra race conditions —
 * em caso de colisão simultânea, a segunda transação falhará e o usuário poderá tentar novamente.
 */
export async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await db.organization.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${counter}`
    counter++
  }
}
