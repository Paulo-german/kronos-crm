import type { ToolSet } from 'ai'
import { createHandOffToHumanTool } from '../tools/hand-off-to-human'
import { createSearchKnowledgeTool } from '../tools/search-knowledge'
import { createSearchProductsTool } from '../tools/search-products'
import type { ToolContext } from '../tools/types'
import type { Capabilities } from './prompt/context'

// Ferramentas do engine na 1.0: só LEITURA (busca) + transferência. As mutações
// (move_deal etc.) NÃO são tools — o código as executa no avanço (Forma 1). Montamos
// direto pelos factories neutros, sem o buildToolSet do single (que orquestra step
// actions, naming em runtime, global tools e group config que o engine não usa).
export function buildEngineTools(
  ctx: ToolContext,
  capabilities: Capabilities,
): ToolSet {
  return {
    // Sempre disponível (#1): transferir/avisar humano em qualquer etapa. Config de
    // notificação vem das actions do step depois — por ora, o default da tool.
    hand_off_to_human: createHandOffToHumanTool(ctx),
    ...(capabilities.hasKnowledgeBase
      ? { search_knowledge: createSearchKnowledgeTool(ctx) }
      : {}),
    ...(capabilities.hasActiveProducts
      ? { search_products: createSearchProductsTool(ctx) }
      : {}),
  }
}
