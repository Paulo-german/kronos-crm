import { AGENT_FIELD_CATALOG } from '../extractor/field-catalog'
import type { PendingField } from './decide-gate'
import type { EngineStep } from '../prompt/context'

const labelOf = (key: string): string => AGENT_FIELD_CATALOG[key]?.label ?? key

// Orientação PONTUAL por postura, só pros casos que fogem do "traga à tona" padrão. É isto
// que faz o agente parar de tratar "deixa pra depois" (await) como "não quero" (reinforce):
// cada natureza pede um tom diferente. `probe` não gera linha — já é coberto pela condução ativa.
function postureNote(field: PendingField): string | null {
  if (field.posture === 'await') {
    return `Atenção — "${labelOf(field.key)}": o cliente pediu pra deixar pra depois. Respeite, não force agora; retome numa brecha natural mais à frente.`
  }
  if (field.posture === 'reinforce') {
    return `Atenção — "${labelOf(field.key)}": o cliente resistiu a informar. Não repita a pergunta seca; explique com leveza por que isso ajuda ele e pergunte de outro jeito.`
  }
  return null
}

// A instrução de FOCO do turno: onde o agente está e o que puxar AGORA. É como o gate
// "fala" com o redator — o funil (mapa) mostra a visão geral; este bloco diz o que fazer.
//
// Tom ATIVO, não robótico (decisão do PLAN): descritivo ("ainda falta descobrir X"), não
// imperativo; responder o cliente vem SEMPRE antes de conduzir. O gate informa O QUE falta
// (e, pela natureza da resposta, COM QUE POSTURA); o COMO cobrar (um por vez ou em bloco) é
// do DONO — via goal/guidanceNote/few-shot da etapa. Conduz sempre — reconduz na brecha.
export function buildQualificationBlock(
  step: EngineStep,
  pendingRequired: PendingField[],
): string {
  const lines: string[] = [`## Foco agora — etapa "${step.name}"`, step.goal]

  if (pendingRequired.length > 0) {
    const pendingLabels = pendingRequired.map((field) => labelOf(field.key))
    const notes = pendingRequired
      .map(postureNote)
      .filter((note): note is string => note !== null)
    lines.push('', `Ainda falta descobrir: ${pendingLabels.join(', ')}.`)
    if (notes.length > 0) lines.push(...notes)
    lines.push(
      'Como conduzir:',
      '- Responda o que o cliente acabou de dizer antes de puxar o que falta — isso vem sempre antes.',
      '- Conduza de forma ativa, sem largar o que falta — no seu estilo (siga sua abordagem e os exemplos abaixo). Se ele estiver focado noutra dúvida, ajude primeiro e retome em seguida.',
    )
  }

  // Few-shot da etapa ATUAL migra pra cá (o gate sabe a etapa certa; o mapa não injeta mais).
  if (step.messageExamples.length > 0) {
    lines.push(
      '',
      'Exemplos de tom nesta etapa (referência de abordagem — adapte, não copie literalmente):',
      ...step.messageExamples.map((example) => `- "${example}"`),
    )
  }

  return lines.join('\n')
}
