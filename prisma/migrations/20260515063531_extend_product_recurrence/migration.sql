-- CreateEnum
CREATE TYPE "recurrence_type" AS ENUM ('ONE_TIME', 'RECURRING_OPEN', 'RECURRING_CONTRACT');

-- CreateEnum
CREATE TYPE "billing_cycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "billing_cycle" "billing_cycle",
ADD COLUMN     "contract_duration" INTEGER,
ADD COLUMN     "recurrence_type" "recurrence_type" NOT NULL DEFAULT 'ONE_TIME';

-- AddCheckConstraints
ALTER TABLE "products"
  ADD CONSTRAINT "products_contract_duration_required"
    CHECK ("recurrence_type" != 'RECURRING_CONTRACT' OR "contract_duration" IS NOT NULL),
  ADD CONSTRAINT "products_billing_cycle_required"
    CHECK ("recurrence_type" = 'ONE_TIME' OR "billing_cycle" IS NOT NULL);
