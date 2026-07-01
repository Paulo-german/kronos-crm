-- DropIndex
DROP INDEX "conversations_organization_id_last_message_role_updated_at_idx";

-- DropIndex
DROP INDEX "conversations_organization_id_status_updated_at_idx";

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "conversations_organization_id_last_message_role_last_activi_idx" ON "conversations"("organization_id", "last_message_role", "last_activity_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "conversations_organization_id_status_last_activity_at_id_idx" ON "conversations"("organization_id", "status", "last_activity_at" DESC, "id" DESC);

-- Backfill: última mensagem não arquivada de cada conversa: senão, cai pra updated_at/created_at
UPDATE "conversations" c
   SET "last_activity_at" = COALESCE(
     (SELECT MAX(m."created_at") FROM "messages" m WHERE m."conversation_id" = c."id" AND m."is_archived" = false),
     c."updated_at",
     c."created_at"
   );

-- Mantém last_activity_at em sincronia com a atividade real da conversa (mensagem enviada/recebida),
-- desacoplado de updated_at (que muda em qualquer update: marcar como lida, pausar IA, atribuir, etc.)
-- Cobre TODOS os pontos de criação de mensagem da aplicação (webhooks, actions, motor de agente,
-- cron de follow-up) sem precisar tocar em cada um — impossível esquecer em código futuro.
CREATE OR REPLACE FUNCTION touch_conversation_last_activity() RETURNS TRIGGER AS $$
BEGIN
  IF NEW."is_archived" = false THEN
    UPDATE "conversations"
       SET "last_activity_at" = NEW."created_at"
     WHERE "id" = NEW."conversation_id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_messages_touch_conversation_activity ON "messages";

CREATE TRIGGER trg_messages_touch_conversation_activity
AFTER INSERT ON "messages"
FOR EACH ROW
EXECUTE FUNCTION touch_conversation_last_activity();
