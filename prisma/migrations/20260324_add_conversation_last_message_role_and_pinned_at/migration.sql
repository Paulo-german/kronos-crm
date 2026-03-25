-- AlterTable: Add lastMessageRole and pinnedAt to conversations
ALTER TABLE "conversations" ADD COLUMN "last_message_role" TEXT;
ALTER TABLE "conversations" ADD COLUMN "pinned_at" TIMESTAMP(3);

-- CreateIndex: composite index for "unanswered" filter
CREATE INDEX "conversations_organization_id_last_message_role_updated_at_idx"
  ON "conversations" ("organization_id", "last_message_role", "updated_at" DESC);
