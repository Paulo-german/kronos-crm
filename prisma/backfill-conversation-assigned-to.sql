-- Backfill: herda assigned_to do contato vinculado a cada conversa
-- Idempotente: atualiza apenas conversas que ainda nao possuem assigned_to
-- e cujo contato ja tem um responsavel definido.
--
-- Executar apos aplicar a migration 20260325_add_conversation_assigned_to:
--   pnpm prisma db execute --file prisma/backfill-conversation-assigned-to.sql
UPDATE conversations c
SET assigned_to = ct.assigned_to
FROM contacts ct
WHERE c.contact_id = ct.id
  AND c.assigned_to IS NULL
  AND ct.assigned_to IS NOT NULL;
