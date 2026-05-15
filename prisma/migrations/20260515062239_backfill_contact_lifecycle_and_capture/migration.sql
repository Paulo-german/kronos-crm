-- Step 9: backfill_contact_lifecycle_and_capture
-- Runs inline — all UPDATEs use WHERE <field> IS NULL for idempotency.

-- ─────────────────────────────────────────────────────────────
-- 1. customer_status = ACTIVE for contacts with at least 1 WON deal
-- ─────────────────────────────────────────────────────────────
UPDATE contacts
SET customer_status = 'ACTIVE'
WHERE customer_status = 'NEVER_BOUGHT'
  AND EXISTS (
    SELECT 1
    FROM deal_contacts dc
    JOIN deals d ON d.id = dc.deal_id
    WHERE dc.contact_id = contacts.id AND d.status = 'WON'
  );

-- ─────────────────────────────────────────────────────────────
-- 2. Enrich capture data from actual conversations
--    WhatsApp and Instagram take precedence over the UNKNOWN backfill from step 5
-- ─────────────────────────────────────────────────────────────

-- 2a. Create CaptureSource for WHATSAPP per org (only for orgs with WhatsApp conversations)
INSERT INTO capture_sources (id, organization_id, channel, name, is_active, is_ad_hoc, created_at, updated_at)
SELECT
  gen_random_uuid(),
  org_id,
  'WHATSAPP',
  'Backfill WhatsApp',
  false,
  false,
  now(),
  now()
FROM (SELECT DISTINCT organization_id AS org_id FROM conversations WHERE channel = 'WHATSAPP') orgs
WHERE NOT EXISTS (
  SELECT 1 FROM capture_sources cs
  WHERE cs.organization_id = orgs.org_id AND cs.channel = 'WHATSAPP'
);

-- 2b. Create CaptureSource for INSTAGRAM per org (only for orgs with Instagram conversations)
INSERT INTO capture_sources (id, organization_id, channel, name, is_active, is_ad_hoc, created_at, updated_at)
SELECT
  gen_random_uuid(),
  org_id,
  'INSTAGRAM',
  'Backfill Instagram',
  false,
  false,
  now(),
  now()
FROM (SELECT DISTINCT organization_id AS org_id FROM conversations WHERE channel = 'INSTAGRAM_DM') orgs
WHERE NOT EXISTS (
  SELECT 1 FROM capture_sources cs
  WHERE cs.organization_id = orgs.org_id AND cs.channel = 'INSTAGRAM'
);

-- 2c. Update synthetic CaptureEvents (from step 5) for contacts with WhatsApp conversations
--     Updates channel, source_id and created_at to reflect the actual first WhatsApp touch
UPDATE capture_events ce
SET
  channel    = 'WHATSAPP',
  source_id  = (
    SELECT cs.id FROM capture_sources cs
    WHERE cs.organization_id = ce.organization_id AND cs.channel = 'WHATSAPP'
    LIMIT 1
  ),
  created_at = (
    SELECT MIN(conv.created_at) FROM conversations conv
    WHERE conv.contact_id = ce.contact_id AND conv.channel = 'WHATSAPP'
  )
WHERE (ce.metadata::jsonb)->>'backfilled' = 'true'
  AND EXISTS (
    SELECT 1 FROM conversations conv
    WHERE conv.contact_id = ce.contact_id AND conv.channel = 'WHATSAPP'
  );

-- 2d. Update synthetic CaptureEvents for contacts with Instagram conversations (no WhatsApp)
UPDATE capture_events ce
SET
  channel    = 'INSTAGRAM',
  source_id  = (
    SELECT cs.id FROM capture_sources cs
    WHERE cs.organization_id = ce.organization_id AND cs.channel = 'INSTAGRAM'
    LIMIT 1
  ),
  created_at = (
    SELECT MIN(conv.created_at) FROM conversations conv
    WHERE conv.contact_id = ce.contact_id AND conv.channel = 'INSTAGRAM_DM'
  )
WHERE (ce.metadata::jsonb)->>'backfilled' = 'true'
  AND EXISTS (
    SELECT 1 FROM conversations conv
    WHERE conv.contact_id = ce.contact_id AND conv.channel = 'INSTAGRAM_DM'
  )
  AND NOT EXISTS (
    SELECT 1 FROM conversations conv
    WHERE conv.contact_id = ce.contact_id AND conv.channel = 'WHATSAPP'
  );

-- 2e. Update Contact first/last capture fields
--     Priority: WhatsApp > Instagram > UNKNOWN
--     Uses conversation.created_at as capture date (more accurate than contact.created_at)
UPDATE contacts c
SET
  first_capture_channel = CASE
    WHEN EXISTS (
      SELECT 1 FROM conversations conv
      WHERE conv.contact_id = c.id AND conv.channel = 'WHATSAPP'
    ) THEN 'WHATSAPP'::capture_channel
    WHEN EXISTS (
      SELECT 1 FROM conversations conv
      WHERE conv.contact_id = c.id AND conv.channel = 'INSTAGRAM_DM'
    ) THEN 'INSTAGRAM'::capture_channel
    ELSE 'UNKNOWN'::capture_channel
  END,
  first_capture_at      = COALESCE(
    (SELECT MIN(conv.created_at) FROM conversations conv WHERE conv.contact_id = c.id),
    c.created_at
  ),
  last_capture_channel  = (
    SELECT CASE conv.channel
      WHEN 'WHATSAPP'      THEN 'WHATSAPP'::capture_channel
      WHEN 'INSTAGRAM_DM'  THEN 'INSTAGRAM'::capture_channel
      ELSE 'UNKNOWN'::capture_channel
    END
    FROM conversations conv
    WHERE conv.contact_id = c.id
    ORDER BY conv.created_at DESC
    LIMIT 1
  ),
  last_capture_at       = COALESCE(
    (SELECT MAX(conv.created_at) FROM conversations conv WHERE conv.contact_id = c.id),
    c.created_at
  )
WHERE c.first_capture_channel IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 3a. CUSTOMER: contacts with at least 1 WON deal
-- ─────────────────────────────────────────────────────────────
UPDATE contacts
SET
  lifecycle_stage    = 'CUSTOMER',
  customer_status    = 'ACTIVE',
  became_customer_at = (
    SELECT MIN(d.created_at)
    FROM deal_contacts dc
    JOIN deals d ON d.id = dc.deal_id
    WHERE dc.contact_id = contacts.id AND d.status = 'WON'
  )
WHERE became_customer_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM deal_contacts dc
    JOIN deals d ON d.id = dc.deal_id
    WHERE dc.contact_id = contacts.id AND d.status = 'WON'
  );

-- History: OPPORTUNITY → CUSTOMER (DEAL_WON)
INSERT INTO contact_lifecycle_history (
  id, contact_id, organization_id, from_stage, to_stage,
  cause_type, cause_ref_id, changed_by_user_id, created_at
)
SELECT
  gen_random_uuid(),
  c.id,
  c.organization_id,
  'OPPORTUNITY',
  'CUSTOMER',
  'DEAL_WON',
  (
    SELECT d.id FROM deal_contacts dc
    JOIN deals d ON d.id = dc.deal_id
    WHERE dc.contact_id = c.id AND d.status = 'WON'
    ORDER BY d.created_at ASC LIMIT 1
  ),
  NULL,
  c.became_customer_at
FROM contacts c
WHERE c.lifecycle_stage = 'CUSTOMER'
  AND NOT EXISTS (
    SELECT 1 FROM contact_lifecycle_history h
    WHERE h.contact_id = c.id AND h.to_stage = 'CUSTOMER'
  );

-- ─────────────────────────────────────────────────────────────
-- 3b. OPPORTUNITY: contacts with any deal but no WON deal
-- ─────────────────────────────────────────────────────────────
UPDATE contacts
SET
  lifecycle_stage       = 'OPPORTUNITY',
  became_opportunity_at = (
    SELECT MIN(d.created_at)
    FROM deal_contacts dc
    JOIN deals d ON d.id = dc.deal_id
    WHERE dc.contact_id = contacts.id
  )
WHERE became_opportunity_at IS NULL
  AND lifecycle_stage = 'LEAD'
  AND EXISTS (
    SELECT 1 FROM deal_contacts dc
    WHERE dc.contact_id = contacts.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM deal_contacts dc
    JOIN deals d ON d.id = dc.deal_id
    WHERE dc.contact_id = contacts.id AND d.status = 'WON'
  );

-- History: QUALIFIED → OPPORTUNITY (DEAL_CREATED)
INSERT INTO contact_lifecycle_history (
  id, contact_id, organization_id, from_stage, to_stage,
  cause_type, cause_ref_id, changed_by_user_id, created_at
)
SELECT
  gen_random_uuid(),
  c.id,
  c.organization_id,
  'QUALIFIED',
  'OPPORTUNITY',
  'DEAL_CREATED',
  (
    SELECT d.id FROM deal_contacts dc
    JOIN deals d ON d.id = dc.deal_id
    WHERE dc.contact_id = c.id
    ORDER BY d.created_at ASC LIMIT 1
  ),
  NULL,
  c.became_opportunity_at
FROM contacts c
WHERE c.lifecycle_stage = 'OPPORTUNITY'
  AND NOT EXISTS (
    SELECT 1 FROM contact_lifecycle_history h
    WHERE h.contact_id = c.id AND h.to_stage = 'OPPORTUNITY'
  );

-- ─────────────────────────────────────────────────────────────
-- 3c. QUALIFIED: contacts with any deal OR conversation with current_step_order >= 3
--     lifecycle_stage = QUALIFIED only for those still in LEAD
-- ─────────────────────────────────────────────────────────────
UPDATE contacts
SET
  lifecycle_stage = 'QUALIFIED',
  qualified_at    = LEAST(
    (
      SELECT MIN(d.created_at)
      FROM deal_contacts dc
      JOIN deals d ON d.id = dc.deal_id
      WHERE dc.contact_id = contacts.id
    ),
    (
      SELECT MIN(conv.updated_at)
      FROM conversations conv
      WHERE conv.contact_id = contacts.id
        AND conv.current_step_order >= 3
    )
  )
WHERE qualified_at IS NULL
  AND lifecycle_stage = 'LEAD'
  AND (
    EXISTS (
      SELECT 1 FROM deal_contacts dc
      WHERE dc.contact_id = contacts.id
    )
    OR EXISTS (
      SELECT 1 FROM conversations conv
      WHERE conv.contact_id = contacts.id
        AND conv.current_step_order >= 3
    )
  );

-- History: LEAD → QUALIFIED (BACKFILL) for ALL contacts with deals or qualified conversations
-- Includes those who already advanced to OPPORTUNITY or CUSTOMER — ensures funnel coherence in reports
INSERT INTO contact_lifecycle_history (
  id, contact_id, organization_id, from_stage, to_stage,
  cause_type, cause_ref_id, changed_by_user_id, created_at
)
SELECT
  gen_random_uuid(),
  c.id,
  c.organization_id,
  'LEAD',
  'QUALIFIED',
  'BACKFILL',
  NULL,
  NULL,
  CASE
    WHEN c.lifecycle_stage = 'QUALIFIED' THEN c.qualified_at
    ELSE (
      SELECT MIN(d.created_at)
      FROM deal_contacts dc
      JOIN deals d ON d.id = dc.deal_id
      WHERE dc.contact_id = c.id
    )
  END
FROM contacts c
WHERE (
  EXISTS (
    SELECT 1 FROM deal_contacts dc
    WHERE dc.contact_id = c.id
  )
  OR EXISTS (
    SELECT 1 FROM conversations conv
    WHERE conv.contact_id = c.id
      AND conv.current_step_order >= 3
  )
)
AND NOT EXISTS (
  SELECT 1 FROM contact_lifecycle_history h
  WHERE h.contact_id = c.id AND h.to_stage = 'QUALIFIED'
);
