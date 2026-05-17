-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "last_interaction_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "contacts_organization_id_last_interaction_at_idx" ON "contacts"("organization_id", "last_interaction_at" DESC);
