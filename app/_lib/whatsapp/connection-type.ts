import { ConnectionType } from '@prisma/client'

/**
 * Helpers de discriminação de runtime WhatsApp via Evolution.
 *
 * `EVOLUTION` (legacy) e `EVOLUTION_JS` são tratados como sinônimos para não
 * quebrar registros existentes — o backfill pode ser feito em migration futura.
 */
export function isEvolutionJs(connectionType: ConnectionType): boolean {
  return connectionType === 'EVOLUTION' || connectionType === 'EVOLUTION_JS'
}

export function isEvolutionGo(connectionType: ConnectionType): boolean {
  return connectionType === 'EVOLUTION_GO'
}
