export function resolveFieldMapping(
  mapping: Record<string, string>,
  payload: unknown,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, path] of Object.entries(mapping)) {
    result[key] = resolvePath(payload, path)
  }
  return result
}

function resolvePath(source: unknown, path: string): unknown {
  if (source === null || source === undefined) return undefined
  const segments = path.split('.')
  let current: unknown = source
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    const isArrayIndex = /^\d+$/.test(segment)
    if (isArrayIndex && Array.isArray(current)) {
      current = current[Number(segment)]
      continue
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}
