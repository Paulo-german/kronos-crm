import type { ModelMessage } from 'ai'
import { db } from '@/_lib/prisma'

// Janela de mensagens cruas que o modelo enxerga. Mensagens de WhatsApp são curtas
// (~10-30 tokens), então uma janela generosa é barata E fiel — melhor que "3 msgs +
// resumo lossy" do single. Sem resumo na 1.0: a janela crua É a memória; a memória
// estruturada (ledger) assume na Fase 1a. Ajustável se custo/qualidade pedir.
const MESSAGE_WINDOW_SIZE = 20

// Monta o histórico no formato do modelo: SÓ mensagens user/assistant. O system
// (com/sem persona) é injetado por cada chamada do generate — não vai no array, e
// o resumo também não (decisão: sem resumo lossy na 1.0).
export async function buildMessages(
  conversationId: string,
): Promise<ModelMessage[]> {
  // Diferente do single (que arquiva as antigas e lê em ordem): o engine não
  // arquiva, então pegamos as N MAIS RECENTES (desc + take) e reordenamos pra
  // cronológica — senão o modelo leria as N mais ANTIGAS da conversa.
  const recent = await db.message.findMany({
    where: { conversationId, isArchived: false },
    orderBy: { createdAt: 'desc' },
    take: MESSAGE_WINDOW_SIZE,
    select: { role: true, content: true, metadata: true },
  })
  recent.reverse()

  const messages: ModelMessage[] = []
  for (const message of recent) {
    if (message.role !== 'user' && message.role !== 'assistant') continue
    messages.push({ role: message.role, content: resolveContent(message) })
  }
  return messages
}

// Mídia do atendente: o texto cru é "[Imagem]"/"[Documento: …]"; o conteúdo real
// mora em metadata.mediaTranscription. (A mídia do CLIENTE já chega transcrita no
// content — tratada no build-dispatcher-ctx, antes da task.) Injeta a transcrição
// pra o agente não ficar cego. Versão enxuta — distinguir imagem/doc fica pra depois.
function resolveContent(message: {
  role: string
  content: string
  metadata: unknown
}): string {
  if (message.role !== 'assistant' || !message.metadata) return message.content
  const meta = message.metadata as Record<string, unknown>
  const transcription = meta.mediaTranscription
  if (typeof transcription !== 'string' || transcription.length === 0) {
    return message.content
  }
  return `[Mídia enviada pelo atendente — conteúdo: ${transcription}]`
}
