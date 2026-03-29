import 'server-only'
import type { AutomationCondition, DealForEvaluation } from './types'

// ─────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────

/**
 * Extrai o valor do deal para o campo especificado na condition.
 * Retorna null quando o campo não existe ou o valor é nulo —
 * condições sobre campos nulos nunca são satisfeitas (falha segura).
 */
function resolveDealField(
  deal: DealForEvaluation,
  field: AutomationCondition['field'],
): string | number | null {
  switch (field) {
    case 'stageId':
      return deal.stageId
    case 'assignedTo':
      return deal.assignedTo
    case 'priority':
      return deal.priority
    case 'status':
      return deal.status
    case 'value':
      return deal.value
    case 'pipelineId':
      return deal.pipelineId
  }
}

/**
 * Avalia um único operador entre o valor do deal e o valor da condição.
 * Operadores numéricos (gt, lt, gte, lte) requerem que ambos os lados sejam números.
 * Operadores de conjunto (in, not_in) requerem que conditionValue seja string[].
 */
function evaluateOperator(
  dealValue: string | number,
  operator: AutomationCondition['operator'],
  conditionValue: string | number | string[],
): boolean {
  switch (operator) {
    case 'equals':
      return dealValue === conditionValue

    case 'not_equals':
      return dealValue !== conditionValue

    case 'gt':
      return typeof dealValue === 'number' && typeof conditionValue === 'number'
        ? dealValue > conditionValue
        : false

    case 'lt':
      return typeof dealValue === 'number' && typeof conditionValue === 'number'
        ? dealValue < conditionValue
        : false

    case 'gte':
      return typeof dealValue === 'number' && typeof conditionValue === 'number'
        ? dealValue >= conditionValue
        : false

    case 'lte':
      return typeof dealValue === 'number' && typeof conditionValue === 'number'
        ? dealValue <= conditionValue
        : false

    case 'in':
      return Array.isArray(conditionValue)
        ? conditionValue.includes(String(dealValue))
        : false

    case 'not_in':
      return Array.isArray(conditionValue)
        ? !conditionValue.includes(String(dealValue))
        : false
  }
}

// ─────────────────────────────────────────────────────────────
// Avaliador principal
// ─────────────────────────────────────────────────────────────

/**
 * Avalia se um deal satisfaz todas as condições de uma automação (lógica AND).
 * Retorna true quando o array de conditions está vazio (sem restrição).
 * Usa early-return na primeira condição não satisfeita para evitar checks desnecessários.
 */
export function evaluateConditions(
  deal: DealForEvaluation,
  conditions: AutomationCondition[],
): boolean {
  if (conditions.length === 0) return true

  for (const condition of conditions) {
    const dealValue = resolveDealField(deal, condition.field)

    // Campos nulos nunca satisfazem condições (falha segura)
    if (dealValue === null) return false

    const satisfied = evaluateOperator(dealValue, condition.operator, condition.value)
    if (!satisfied) return false
  }

  return true
}
