-- Insere feature crm.max_squads (idempotente)
INSERT INTO "features" ("id", "key", "name", "type", "value_type", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'crm.max_squads', 'Squads', 'STATIC', 'NUMBER', NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "updated_at" = NOW();

-- Insere limites por plano: Light=0, Essential=2, Scale=5, Enterprise=999
INSERT INTO "plan_limits" ("id", "plan_id", "feature_id", "value_number", "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  p."id",
  f."id",
  CASE p."slug"
    WHEN 'light'      THEN 0
    WHEN 'essential'  THEN 2
    WHEN 'scale'      THEN 5
    WHEN 'enterprise' THEN 999
  END,
  NOW(),
  NOW()
FROM "plans" p
CROSS JOIN "features" f
WHERE p."slug" IN ('light', 'essential', 'scale', 'enterprise')
  AND f."key" = 'crm.max_squads'
ON CONFLICT ("plan_id", "feature_id") DO UPDATE SET "value_number" = EXCLUDED."value_number", "updated_at" = NOW();
