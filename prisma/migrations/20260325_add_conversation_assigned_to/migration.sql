-- AlterTable: Add assigned_to to conversations
ALTER TABLE "conversations" ADD COLUMN "assigned_to" TEXT;

-- AddForeignKey: conversations.assigned_to -> users.id (SET NULL on delete)
ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_assigned_to_fkey"
  FOREIGN KEY ("assigned_to") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: composite for RBAC filter (MEMBER sees only own conversations)
CREATE INDEX "conversations_organization_id_assigned_to_idx"
  ON "conversations"("organization_id", "assigned_to");
