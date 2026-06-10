import type {
  ExportGlobalTool,
  GlobalTool,
} from '../shared/global-tool-schema'

interface RemapResult {
  remapped: GlobalTool[]
  warnings: string[]
}

/**
 * Função pura: reescreve os stepIds das global tools de export (que carregam
 * ORDERS serializados) para os UUIDs novos dos steps recém-criados, via o mapa
 * order → novo id. Entradas órfãs são descartadas. Tools com scope 'steps' que
 * ficam sem nenhum stepId válido são rebaixadas para 'global' (senão nunca
 * disparariam) + warning.
 */
export const remapGlobalToolStepIds = (
  tools: ExportGlobalTool[],
  orderToNewId: Map<number, string>,
): RemapResult => {
  const warnings: string[] = []

  const remapped: GlobalTool[] = tools.map((tool) => {
    if (tool.scope !== 'steps') {
      return { ...tool, stepIds: [] }
    }

    const resolvedIds = tool.stepIds
      .map((entry) => orderToNewId.get(Number(entry)))
      .filter((id): id is string => id !== undefined)

    if (resolvedIds.length === 0) {
      warnings.push(
        `Ferramenta "${tool.trigger}" perdeu suas etapas de referência e foi convertida para escopo global.`,
      )
      return { ...tool, scope: 'global', stepIds: [] }
    }

    return { ...tool, stepIds: resolvedIds }
  })

  return { remapped, warnings }
}
