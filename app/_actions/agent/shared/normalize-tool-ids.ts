/**
 * Garante que todo item do array tenha um `id` antes de persistir no banco.
 * O UI sempre gera o `id` ao adicionar, mas dados legados (sem `id`) chegam
 * sem ele — normalizar aqui evita que o runtime precise lidar com ausência.
 */
export const normalizeToolIds = <T extends { id?: string }>(
  items: T[],
): (T & { id: string })[] =>
  items.map((item) =>
    item.id ? (item as T & { id: string }) : { ...item, id: crypto.randomUUID() },
  )
