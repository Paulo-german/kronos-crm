-- CreateEnum
CREATE TYPE "sales_distribution_model" AS ENUM ('ROUND_ROBIN', 'LOYALTY', 'MANUAL', 'UTILIZATION', 'PERFORMANCE_WEIGHTED');

-- AlterTable
ALTER TABLE "inboxes" ADD COLUMN     "capture_source_id" TEXT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "facilitator_deal_created_to_oppty" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "facilitator_deal_won_to_customer" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sales_distribution_model" "sales_distribution_model" NOT NULL DEFAULT 'ROUND_ROBIN';

-- CreateIndex
CREATE INDEX "inboxes_capture_source_id_idx" ON "inboxes"("capture_source_id");

-- AddForeignKey
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_capture_source_id_fkey" FOREIGN KEY ("capture_source_id") REFERENCES "capture_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
