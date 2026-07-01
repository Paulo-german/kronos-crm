// Constantes do generate (2 chamadas). Próprias do engine — sem importar do
// pipeline-single-v2 (clean room).

export const LLM_TEMPERATURE = 0.5

// Teto de passos da Call 1 (executor de tools). São 3 ferramentas (2 buscas +
// handoff), cada uma no máx. 1x por turno → 4 dá folga pro passo final.
export const TOOL_CALL_STEP_LIMIT = 4

// Diretiva injetada só no system da Call 1: o modelo usa as ferramentas e NÃO
// escreve texto (a resposta é redigida na Call 2). Descreve as tools por CATEGORIA
// (não por nome) — funciona com qualquer combinação de ferramentas disponíveis.
export const CALL1_DIRECTIVE =
  '\n\n## Modo de execução deste turno\n' +
  'Use as ferramentas disponíveis conforme a necessidade e NÃO escreva resposta ao cliente — a mensagem final é redigida em outra etapa.\n\n' +
  '- Ferramentas de busca: use quando precisar de dados para fundamentar a resposta (dúvidas sobre a empresa, produtos, preços, políticas).\n' +
  '- Transferência para humano: use se o cliente pedir atendimento humano, reclamar, ou o caso fugir do seu alcance.\n\n' +
  'Se nada se aplica, não chame nada. Não escreva texto — apenas as chamadas que couberem.'
