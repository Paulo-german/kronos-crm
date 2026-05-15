-- Step 14: backfill_company_contacts
-- Migrates Contact.companyId → CompanyContact M:N table.
-- contact.company_id still exists — will be dropped in step 15 (Fase 1-B, separate PR).
-- WHERE clause on contact_id+company_id prevents duplicate inserts (idempotent).

INSERT INTO company_contacts (id, company_id, contact_id, organization_id, is_primary, start_date, end_date, created_at, updated_at)
SELECT
  gen_random_uuid(),
  c.company_id,
  c.id,
  c.organization_id,
  true,
  c.created_at,
  NULL,
  now(),
  now()
FROM contacts c
WHERE c.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM company_contacts cc
    WHERE cc.contact_id = c.id AND cc.company_id = c.company_id
  );
