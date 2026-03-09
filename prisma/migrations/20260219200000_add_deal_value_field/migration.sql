-- AlterTable
ALTER TABLE "deals" ADD COLUMN "value" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "deals_organization_id_status_created_at_idx" ON "deals"("organization_id", "status", "created_at" DESC);
