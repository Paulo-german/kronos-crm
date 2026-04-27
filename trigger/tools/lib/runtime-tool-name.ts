/**
 * Mantém o nome canônico quando há apenas 1 instância do type — preserva
 * conversas em andamento e assinaturas de tool já registradas no LLM.
 * Com N > 1 instâncias, expõe `${type}_${indexInGroup}` (zero-based) para
 * que o LLM possa distinguir entre elas pela semântica do trigger.
 */
export function getRuntimeToolName(
  type: string,
  indexInGroup: number,
  groupSize: number,
): string {
  return groupSize === 1 ? type : `${type}_${indexInGroup}`
}
