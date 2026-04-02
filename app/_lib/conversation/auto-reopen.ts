// Campos para reabertura automatica de conversas resolvidas.
// Ao usar `...AUTO_REOPEN_FIELDS` em qualquer db.conversation.update,
// a conversa volta para OPEN caso esteja RESOLVED — sem necessidade de condicional
// (operacao idempotente: se ja esta OPEN, nao muda nada).
export const AUTO_REOPEN_FIELDS = {
  status: 'OPEN' as const,
  resolvedAt: null,
  resolvedBy: null,
}
