-- CreateTable
CREATE TABLE "capture_events" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "channel" "capture_channel" NOT NULL,
    "source_id" TEXT NOT NULL,
    "source_url" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "campaign_id" TEXT,
    "referred_by_contact_id" TEXT,
    "captured_automatically" BOOLEAN NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capture_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "capture_events_contact_id_created_at_idx" ON "capture_events"("contact_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "capture_events_organization_id_channel_created_at_idx" ON "capture_events"("organization_id", "channel", "created_at" DESC);

-- CreateIndex
CREATE INDEX "capture_events_organization_id_campaign_id_idx" ON "capture_events"("organization_id", "campaign_id");

-- CreateIndex
CREATE INDEX "capture_events_organization_id_source_id_idx" ON "capture_events"("organization_id", "source_id");

-- CreateIndex
CREATE INDEX "capture_events_organization_id_created_at_idx" ON "capture_events"("organization_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "capture_events" ADD CONSTRAINT "capture_events_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capture_events" ADD CONSTRAINT "capture_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capture_events" ADD CONSTRAINT "capture_events_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "capture_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capture_events" ADD CONSTRAINT "capture_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capture_events" ADD CONSTRAINT "capture_events_referred_by_contact_id_fkey" FOREIGN KEY ("referred_by_contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: create 1 default CaptureSource per organization
INSERT INTO capture_sources (id, organization_id, channel, name, is_active, is_ad_hoc, created_at, updated_at)
SELECT
  gen_random_uuid(),
  o.id,
  'UNKNOWN',
  'Backfill',
  false,
  false,
  now(),
  now()
FROM organizations o;

-- Backfill: create 1 synthetic CaptureEvent per existing Contact
INSERT INTO capture_events (id, contact_id, organization_id, channel, source_id, captured_automatically, metadata, created_at)
SELECT
  gen_random_uuid(),
  c.id,
  c.organization_id,
  'UNKNOWN',
  (SELECT s.id FROM capture_sources s WHERE s.organization_id = c.organization_id AND s.name = 'Backfill' LIMIT 1),
  false,
  '{"backfilled": true}'::jsonb,
  c.created_at
FROM contacts c;
