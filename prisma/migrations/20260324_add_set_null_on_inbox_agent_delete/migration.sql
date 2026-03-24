-- AlterTable: Set NULL on Inbox.agentId when Agent is deleted
ALTER TABLE "inboxes" DROP CONSTRAINT IF EXISTS "inboxes_agent_id_fkey";

ALTER TABLE "inboxes"
  ADD CONSTRAINT "inboxes_agent_id_fkey"
  FOREIGN KEY ("agent_id") REFERENCES "agents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
