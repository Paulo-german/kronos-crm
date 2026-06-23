import type { WebhookLogDto } from '@/_actions/webhook-source/schema'

// Heurística pura (sem React, sem I/O) que decide se vale sugerir ao usuário a
// detecção automática de campos. Ajuda proativa: quando os logs mostram que o
// webhook está com dificuldade, a UI oferece o caminho de correção sozinha.
const SAMPLE_SIZE = 20
const MIN_SAMPLE = 5
const ERROR_RATE_THRESHOLD = 0.3
const IGNORED_COUNT_THRESHOLD = 3
const EMPTY_MAPPING_RATE_THRESHOLD = 0.5

// Sentinela presente no errorMessage de um IGNORED gerado pelo filtro de gatilho
// (ver process-inbound-webhook.ts → evaluateTriggerFilter). Esse ignore é
// DELIBERADO e correto — não é sinal de problema, então não conta para sugerir
// autodetecção. Acoplamento por string: manter alinhado com o backend.
const TRIGGER_FILTER_IGNORE_MARKER = 'gatilho configurado'

export interface AutodetectSuggestion {
  suggest: boolean
  reason: string | null
}

// IGNORED "não reconhecido" = ignorado por algo que o usuário pode corrigir
// (evento sem efeito mapeado), e NÃO o descarte intencional do filtro de gatilho.
function isUnrecognizedIgnore(log: WebhookLogDto): boolean {
  if (log.status !== 'IGNORED') return false
  return !log.errorMessage?.includes(TRIGGER_FILTER_IGNORE_MARKER)
}

// "Mapeamento vazio" = o resolvedData não produziu nenhum valor útil (objeto
// ausente, sem chaves, ou só com valores vazios). Sinaliza fieldMapping errado.
function hasEmptyMapping(resolvedData: unknown): boolean {
  if (
    resolvedData === null ||
    typeof resolvedData !== 'object' ||
    Array.isArray(resolvedData)
  ) {
    return true
  }
  const values = Object.values(resolvedData as Record<string, unknown>)
  if (values.length === 0) return true
  return values.every(
    (value) => value === null || value === undefined || value === '',
  )
}

export function shouldSuggestAutodetect(
  logs: WebhookLogDto[],
): AutodetectSuggestion {
  // Amostra pequena demais não é sinal confiável — não sugere nada.
  if (logs.length < MIN_SAMPLE) return { suggest: false, reason: null }

  const sample = logs.slice(0, SAMPLE_SIZE)
  const total = sample.length

  const errorCount = sample.filter((log) => log.status === 'ERROR').length
  const ignoredCount = sample.filter(isUnrecognizedIgnore).length
  const emptyMappingCount = sample.filter((log) =>
    hasEmptyMapping(log.resolvedData),
  ).length

  // Ordem por severidade: erro de processamento → evento ignorado → mapa vazio.
  if (errorCount / total >= ERROR_RATE_THRESHOLD) {
    return {
      suggest: true,
      reason:
        'Vários envios recentes falharam. Pode ser que os campos não estejam sendo reconhecidos — detectar os campos automaticamente costuma resolver.',
    }
  }

  if (ignoredCount >= IGNORED_COUNT_THRESHOLD) {
    return {
      suggest: true,
      reason:
        'Vários envios foram ignorados. Verifique se o gatilho selecionado corresponde ao evento que o provedor está realmente enviando.',
    }
  }

  if (emptyMappingCount / total >= EMPTY_MAPPING_RATE_THRESHOLD) {
    return {
      suggest: true,
      reason:
        'A maioria dos envios chegou sem dados aproveitados. Use a detecção automática de campos para corrigir o mapeamento.',
    }
  }

  return { suggest: false, reason: null }
}
