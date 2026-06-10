/** Extrai índices de variáveis {{N}} de um texto */
export function extractVariableIndices(text: string): number[] {
  const matches = text.matchAll(/\{\{(\d+)\}\}/g)
  const indices = new Set<number>()
  for (const match of matches) {
    indices.add(parseInt(match[1], 10))
  }
  return Array.from(indices).sort((indexA, indexB) => indexA - indexB)
}

/** Substitui variáveis {{N}} pelos valores ou mantém o placeholder */
export function renderWithVariables(text: string, values: string[]): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_match, indexStr: string) => {
    const index = parseInt(indexStr, 10) - 1
    return values[index]?.trim() ? values[index] : `{{${indexStr}}}`
  })
}
