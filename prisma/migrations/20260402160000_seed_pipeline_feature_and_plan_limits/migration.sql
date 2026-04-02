-- Cria a feature crm.max_pipelines (idempotente via ON CONFLICT)
INSERT INTO "features" ("id", "key", "name", "type", "value_type", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'crm.max_pipelines', 'Funis de Vendas', 'STATIC', 'NUMBER', NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

-- Insere os limites por plano (Light=1, Essential/Scale/Enterprise=999)
-- Usa subqueries para resolver IDs dinamicamente
INSERT INTO "plan_limits" ("id", "plan_id", "feature_id", "value_number", "created_at", "updated_at")
SELECT gen_random_uuid(), p."id", f."id", 1, NOW(), NOW()
FROM "plans" p, "features" f
WHERE p."slug" = 'light' AND f."key" = 'crm.max_pipelines'
ON CONFLICT ("plan_id", "feature_id") DO NOTHING;

INSERT INTO "plan_limits" ("id", "plan_id", "feature_id", "value_number", "created_at", "updated_at")
SELECT gen_random_uuid(), p."id", f."id", 999, NOW(), NOW()
FROM "plans" p, "features" f
WHERE p."slug" = 'essential' AND f."key" = 'crm.max_pipelines'
ON CONFLICT ("plan_id", "feature_id") DO NOTHING;

INSERT INTO "plan_limits" ("id", "plan_id", "feature_id", "value_number", "created_at", "updated_at")
SELECT gen_random_uuid(), p."id", f."id", 999, NOW(), NOW()
FROM "plans" p, "features" f
WHERE p."slug" = 'scale' AND f."key" = 'crm.max_pipelines'
ON CONFLICT ("plan_id", "feature_id") DO NOTHING;

INSERT INTO "plan_limits" ("id", "plan_id", "feature_id", "value_number", "created_at", "updated_at")
SELECT gen_random_uuid(), p."id", f."id", 999, NOW(), NOW()
FROM "plans" p, "features" f
WHERE p."slug" = 'enterprise' AND f."key" = 'crm.max_pipelines'
ON CONFLICT ("plan_id", "feature_id") DO NOTHING;
