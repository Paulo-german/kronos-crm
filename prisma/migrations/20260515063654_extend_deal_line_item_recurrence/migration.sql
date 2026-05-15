-- AlterTable
ALTER TABLE "deal_line_items" ADD COLUMN     "billing_cycle" "billing_cycle",
ADD COLUMN     "contract_duration" INTEGER,
ADD COLUMN     "contract_end_date" TIMESTAMP(3),
ADD COLUMN     "recurrence_type" "recurrence_type" NOT NULL DEFAULT 'ONE_TIME';

-- AddCheckConstraints
ALTER TABLE "deal_line_items"
  ADD CONSTRAINT "deal_line_items_contract_duration_required"
    CHECK ("recurrence_type" != 'RECURRING_CONTRACT' OR "contract_duration" IS NOT NULL),
  ADD CONSTRAINT "deal_line_items_billing_cycle_required"
    CHECK ("recurrence_type" = 'ONE_TIME' OR "billing_cycle" IS NOT NULL);
