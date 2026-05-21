-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "squad_id" TEXT;

-- AlterTable
ALTER TABLE "webhook_sources" ADD COLUMN     "squad_id" TEXT;

-- CreateIndex
CREATE INDEX "deals_organization_id_squad_id_idx" ON "deals"("organization_id", "squad_id");

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_sources" ADD CONSTRAINT "webhook_sources_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
