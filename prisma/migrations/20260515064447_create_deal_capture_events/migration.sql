-- CreateEnum
CREATE TYPE "deal_attribution" AS ENUM ('PRIMARY', 'INFLUENCING');

-- CreateTable
CREATE TABLE "deal_capture_events" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "capture_event_id" TEXT NOT NULL,
    "attribution" "deal_attribution" NOT NULL,
    "weight" DOUBLE PRECISION,
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_capture_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deal_capture_events_deal_id_attribution_idx" ON "deal_capture_events"("deal_id", "attribution");

-- CreateIndex
CREATE INDEX "deal_capture_events_capture_event_id_idx" ON "deal_capture_events"("capture_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "deal_capture_events_deal_id_capture_event_id_key" ON "deal_capture_events"("deal_id", "capture_event_id");

-- AddForeignKey
ALTER TABLE "deal_capture_events" ADD CONSTRAINT "deal_capture_events_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_capture_events" ADD CONSTRAINT "deal_capture_events_capture_event_id_fkey" FOREIGN KEY ("capture_event_id") REFERENCES "capture_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique index: enforce one PRIMARY attribution per deal (Prisma does not support WHERE on @@unique).
CREATE UNIQUE INDEX "deal_capture_events_one_primary_per_deal"
  ON "deal_capture_events" ("deal_id")
  WHERE attribution = 'PRIMARY';
