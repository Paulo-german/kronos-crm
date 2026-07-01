import type { ExtractedField } from '../extractor/extract-attributes'
import type { AgentSessionState } from './schema'

// Mescla os campos extraídos no mapa corrente do ledger (mutação in-place).
//
// Regra do `observedAtTurn`: o extrator re-lê a janela inteira a cada turno, então o
// mesmo fato ("Honda Civic", dito no turno 2) reaparece nos turnos seguintes. Reconfirmar
// um fato IDÊNTICO (value+nature+polarity) NÃO deve envelhecer o turno — `observedAtTurn`
// tem que apontar pra quando o fato foi ESTABELECIDO, não pra última re-leitura.
//
// Por que os 3 campos e não só `value`: a natureza é sinal do gate (1b). Ir de "deferred"
// ("te mando depois") pra "refused" ("não vou informar") com value ainda vazio é informação
// NOVA — o turno deve avançar. Só a reconfirmação idêntica é redundante.
export function mergeExtractedFields(
  state: AgentSessionState,
  fields: ExtractedField[],
  turn: number,
): void {
  for (const field of fields) {
    const previous = state.attributes[field.key]
    const unchanged =
      previous != null &&
      previous.value === field.value &&
      previous.nature === field.nature &&
      previous.polarity === field.polarity

    // Reconfirmação idêntica: preserva a observação original intacta (turno e source).
    if (unchanged) continue

    state.attributes[field.key] = {
      value: field.value,
      nature: field.nature,
      polarity: field.polarity,
      askedAtTurns: previous?.askedAtTurns ?? [],
      observedAtTurn: turn,
      source: 'extracted',
    }
  }
}
