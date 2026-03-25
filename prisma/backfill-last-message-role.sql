-- Backfill: popula last_message_role nas conversas existentes
-- com base na última mensagem não arquivada de cada conversa.
--
-- Execução: pnpm prisma db execute --file prisma/backfill-last-message-role.sql
-- Seguro para rodar múltiplas vezes (idempotente via SET).
UPDATE conversations c
SET last_message_role = sub.role
FROM (
  SELECT DISTINCT ON (m.conversation_id)
    m.conversation_id,
    m.role
  FROM messages m
  WHERE m.is_archived = false
  ORDER BY m.conversation_id, m.created_at DESC
) sub
WHERE c.id = sub.conversation_id;
