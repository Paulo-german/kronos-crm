import type { FieldMappingKey } from '@/_actions/webhook-source/schema'

export interface DetectedField {
  path: string
  sampleValue: string
}

const MAX_PATHS = 100
const MAX_DEPTH = 6

export function flattenPayload(payload: unknown): DetectedField[] {
  const results: DetectedField[] = []
  collect(payload, '', 0, results)
  // Filtra path vazio — ocorre se payload raiz for primitivo (string/number/boolean)
  return results.filter((field) => field.path !== '')
}

function collect(
  value: unknown,
  prefix: string,
  depth: number,
  results: DetectedField[],
): void {
  if (results.length >= MAX_PATHS || depth > MAX_DEPTH) return

  if (value === null || value === undefined) return

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const raw = String(value)
    results.push({
      path: prefix,
      sampleValue: raw.length > 80 ? `${raw.slice(0, 80)}…` : raw,
    })
    return
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length && results.length < MAX_PATHS; i++) {
      const childPrefix = prefix ? `${prefix}.${i}` : String(i)
      collect(value[i], childPrefix, depth + 1, results)
    }
    return
  }

  if (typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (results.length >= MAX_PATHS) break
      const childPrefix = prefix ? `${prefix}.${key}` : key
      collect((value as Record<string, unknown>)[key], childPrefix, depth + 1, results)
    }
  }
}

export function suggestCrmField(path: string): FieldMappingKey | null {
  const lower = path.toLowerCase()
  if (lower.includes('email')) return 'email'
  if (lower.includes('phone') || lower.includes('telefone') || lower.includes('celular') || lower.includes('fone')) return 'phone'
  if (lower.includes('cpf')) return 'cpf'
  if (lower.includes('company') || lower.includes('empresa') || lower.includes('cnpj')) return 'companyName'
  // 'name'/'nome' depois de 'company'/'empresa' para evitar falso positivo em 'companyName'
  if (lower.includes('name') || lower.includes('nome')) return 'name'
  return null
}
