import { logger } from '@trigger.dev/sdk/v3'
import { updateActiveTrace } from '@langfuse/tracing'
import { checkBalance, debitCredits } from '@/_lib/billing/credit-utils'

interface DebitTranscriptionArgs {
  organizationId: string
  /** Descrição exibida na WalletTransaction */
  description: string
  /** Metadados auditáveis gravados na WalletTransaction */
  metadata: Record<string, string | number | boolean | null | undefined>
  /** Função que executa a transcrição/vision e retorna text + custo calculado + totalTokens opcional */
  execute: () => Promise<{ text: string; cost: number }>
}

interface DebitTranscriptionResult {
  text: string | null
  skipped: boolean
  reason?: 'no_credits'
  cost: number
  debited: boolean
}

/**
 * Wrapper de checkBalance → executa transcrição → debitCredits.
 *
 * Centraliza a regra de skip (sem créditos → placeholder null) e o débito pós-chamada,
 * eliminando duplicação entre inbound (build-dispatcher-ctx) e outbound (transcribe-outbound-media).
 * Race-condition aceita: se saldo zerou entre check e debit, transcrição "passa grátis" uma vez
 * (debited === false → log warning). Padrão já estabelecido no outbound.
 */
export async function runWithCreditDebit(
  args: DebitTranscriptionArgs,
): Promise<DebitTranscriptionResult> {
  const balance = await checkBalance(args.organizationId)

  if (balance.available < 1) {
    updateActiveTrace({
      tags: ['media-transcription-skipped-no-credits'],
      metadata: {
        skippedReason: 'no_credits',
        organizationId: args.organizationId,
      },
    })

    logger.info('Skipping media transcription: no credits', {
      organizationId: args.organizationId,
      description: args.description,
    })

    return { text: null, skipped: true, reason: 'no_credits', cost: 0, debited: false }
  }

  const { text, cost } = await args.execute()

  const debited = await debitCredits(
    args.organizationId,
    cost,
    args.description,
    args.metadata,
    false, // transcrição não conta como nova mensagem de usuário
  )

  if (!debited) {
    logger.warn('Failed to debit credits for media transcription (balance changed between check and debit)', {
      organizationId: args.organizationId,
      cost,
      description: args.description,
    })
  }

  return { text, skipped: false, cost, debited }
}
