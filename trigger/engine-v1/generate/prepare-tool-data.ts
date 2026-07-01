import type { ExecutedTool } from './run-tool-call'

interface ProductInfo {
  name: string
  price: number
  description: string | null
  mediaUrl: string | null
}

export interface PreparedData {
  // Bloco de fatos + grounding pro redator (Call 2). null quando não houve busca —
  // aí o redator responde só com o system prompt (persona/situação/KB implícita).
  groundingBlock: string | null
  // hand_off_to_human rodou em modo 'transfer' (pausou a IA) → o redator deve se
  // despedir. O modo 'notify' NÃO conta: ali o agente continua atendendo normalmente.
  handedOff: boolean
}

// Digere o resultado da Call 1 num formato limpo pro redator: em vez do JSON cru das
// buscas (com similarity/id/ruído), um bloco textual com os fatos + a diretiva de
// "use só isto". Blinda contra alucinação (o redator não tem as tools).
export function prepareToolData(executedTools: ExecutedTool[]): PreparedData {
  // Só o modo 'transfer' pausa a IA e pede despedida; 'notify' segue o atendimento.
  const handedOff = executedTools.some(
    (tool) =>
      tool.toolName === 'hand_off_to_human' &&
      readString(tool.output, 'mode') === 'transfer',
  )

  const searched = executedTools.some(
    (tool) =>
      tool.toolName === 'search_knowledge' ||
      tool.toolName === 'search_products',
  )
  if (!searched) return { groundingBlock: null, handedOff }

  const knowledge = collectKnowledge(executedTools)
  const products = collectProducts(executedTools)

  return { groundingBlock: buildGroundingBlock(knowledge, products), handedOff }
}

function buildGroundingBlock(
  knowledge: string[],
  products: ProductInfo[],
): string {
  const lines: string[] = [
    '## Dados desta busca',
    'Baseie sua resposta APENAS nos fatos abaixo. Não invente nem complete com suposições. Se algo que o cliente pediu não estiver aqui, diga que vai verificar com a equipe.',
  ]

  if (knowledge.length > 0) {
    lines.push('', 'Base de conhecimento:')
    lines.push(...knowledge.map((chunk) => `- ${chunk}`))
  }

  if (products.length > 0) {
    lines.push('', 'Produtos encontrados:')
    for (const product of products) {
      const description = product.description ? ` ${product.description}` : ''
      const media = product.mediaUrl ? ` (imagem: ${product.mediaUrl})` : ''
      lines.push(
        `- ${product.name} — ${formatBRL(product.price)}.${description}${media}`,
      )
    }
    // Padrão v2 de mídia: a URL vai inline no texto e o send detecta/envia a imagem.
    if (products.some((product) => product.mediaUrl)) {
      lines.push(
        '',
        'Se ajudar a mostrar um produto, inclua a URL da imagem dele na sua mensagem.',
      )
    }
  }

  if (knowledge.length === 0 && products.length === 0) {
    lines.push(
      '',
      'A busca não retornou resultados. Não invente: diga que vai verificar com a equipe.',
    )
  }

  return lines.join('\n')
}

function collectKnowledge(tools: ExecutedTool[]): string[] {
  const chunks: string[] = []
  for (const tool of tools) {
    if (tool.toolName !== 'search_knowledge') continue
    for (const item of readArray(tool.output, 'results')) {
      const content = readString(item, 'content')
      if (content) chunks.push(content)
    }
  }
  return chunks
}

function collectProducts(tools: ExecutedTool[]): ProductInfo[] {
  const products: ProductInfo[] = []
  for (const tool of tools) {
    if (tool.toolName !== 'search_products') continue
    for (const item of readArray(tool.output, 'products')) {
      const name = readString(item, 'name')
      if (!name) continue
      products.push({
        name,
        price: readNumber(item, 'price'),
        description: readString(item, 'description'),
        mediaUrl: readString(item, 'mediaUrl'),
      })
    }
  }
  return products
}

// Acesso seguro a campos de um output `unknown` (o shape das tools é conhecido, mas o
// tipo do result é opaco no runtime).
function readArray(output: unknown, key: string): unknown[] {
  if (typeof output !== 'object' || output === null) return []
  const value = (output as Record<string, unknown>)[key]
  return Array.isArray(value) ? value : []
}

function readString(item: unknown, key: string): string | null {
  if (typeof item !== 'object' || item === null) return null
  const value = (item as Record<string, unknown>)[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readNumber(item: unknown, key: string): number {
  if (typeof item !== 'object' || item === null) return 0
  const value = (item as Record<string, unknown>)[key]
  return typeof value === 'number' ? value : 0
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
