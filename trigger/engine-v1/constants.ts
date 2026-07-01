// Tetos de saída das 2 chamadas do generate. Generosos de início (pra não cortar
// resposta nem atrapalhar o modelo nos testes); reduzir depois de medir.

// Call 1 (executor de tools) — não produz texto útil (descartado); só as tool calls.
// Mantido folgado por ora; candidato a reduzir após os testes (ver revisão do P6).
export const TOOL_CALL_MAX_OUTPUT_TOKENS = 2048

// Call 2 (responder) — o texto ao cliente. Também usado na estimativa do débito
// otimista (é o output dominante do turno).
export const RESPONDER_MAX_OUTPUT_TOKENS = 5072
