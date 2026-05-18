-- Backfill: insert NULL -> LEAD history for all existing contacts that don't have one
-- Uses contact.created_at as the approximation for "became a lead"
-- causeType = BACKFILL distinguishes these from real CONTACT_CREATED entries
INSERT INTO contact_lifecycle_history (
  id, contact_id, organization_id, from_stage, to_stage,
  cause_type, cause_ref_id, changed_by_user_id, created_at
)
SELECT
  gen_random_uuid(),
  c.id,
  c.organization_id,
  NULL,
  'LEAD',
  'BACKFILL',
  NULL,
  NULL,
  c.created_at
FROM contacts c
WHERE NOT EXISTS (
  SELECT 1 FROM contact_lifecycle_history h
  WHERE h.contact_id = c.id AND h.to_stage = 'LEAD'
);
