-- Backfill: criar CaptureSource para cada inbox existente sem capture_source_id e já linkar
-- (column, FK, index já criados na migration anterior; este passo é idempotente)

CREATE TEMP TABLE _inbox_cs_backfill AS
  SELECT
    i.id                                                     AS inbox_id,
    gen_random_uuid()::text                                  AS cs_id,
    i.organization_id                                        AS org_id,
    CASE i.channel
      WHEN 'WHATSAPP'      THEN 'WHATSAPP'::capture_channel
      WHEN 'WEB_CHAT'      THEN 'WEBSITE_CHAT'::capture_channel
      WHEN 'INSTAGRAM_DM'  THEN 'INSTAGRAM'::capture_channel
      ELSE                      'UNKNOWN'::capture_channel
    END                                                      AS cs_channel,
    i.name                                                   AS cs_name
  FROM "inboxes" i
  WHERE i.capture_source_id IS NULL;

INSERT INTO "capture_sources" (id, organization_id, channel, name, is_active, is_ad_hoc, created_at, updated_at)
SELECT cs_id, org_id, cs_channel, cs_name, true, false, now(), now()
FROM _inbox_cs_backfill;

UPDATE "inboxes" i
SET capture_source_id = b.cs_id
FROM _inbox_cs_backfill b
WHERE i.id = b.inbox_id;

DROP TABLE _inbox_cs_backfill;
