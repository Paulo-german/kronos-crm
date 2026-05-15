-- CreateEnum
CREATE TYPE "lifecycle_stage" AS ENUM ('LEAD', 'QUALIFIED', 'OPPORTUNITY', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "customer_status" AS ENUM ('NEVER_BOUGHT', 'ACTIVE', 'DORMANT', 'CHURNED');

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "became_customer_at" TIMESTAMP(3),
ADD COLUMN     "became_opportunity_at" TIMESTAMP(3),
ADD COLUMN     "customer_status" "customer_status" NOT NULL DEFAULT 'NEVER_BOUGHT',
ADD COLUMN     "first_capture_at" TIMESTAMP(3),
ADD COLUMN     "first_capture_channel" "capture_channel",
ADD COLUMN     "health_score" DOUBLE PRECISION,
ADD COLUMN     "last_capture_at" TIMESTAMP(3),
ADD COLUMN     "last_capture_channel" "capture_channel",
ADD COLUMN     "lifecycle_stage" "lifecycle_stage" NOT NULL DEFAULT 'LEAD',
ADD COLUMN     "qualified_at" TIMESTAMP(3),
ADD COLUMN     "scored_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "contacts_organization_id_lifecycle_stage_updated_at_idx" ON "contacts"("organization_id", "lifecycle_stage", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "contacts_organization_id_customer_status_idx" ON "contacts"("organization_id", "customer_status");

-- CreateIndex
CREATE INDEX "contacts_organization_id_health_score_idx" ON "contacts"("organization_id", "health_score" DESC);

-- CreateIndex
CREATE INDEX "contacts_organization_id_last_capture_at_idx" ON "contacts"("organization_id", "last_capture_at" DESC);
