-- Registro do módulo Kronos Projects + quotas (Fase 1).
-- DML idempotente — roda no deploy via `prisma migrate deploy`. Sem isso,
-- `hasModuleAccess('projects')` = false (produto inacessível) e `requireQuota`
-- estoura limite=0 ao criar workspace/task.
--
-- Política de disponibilidade: a partir do plano **Scale** (Scale/Enterprise).
-- Light e Essential ficam fora do `plan_modules` (gate de acesso) e com
-- `plan_limit = 0` (dupla proteção, espelha o padrão de `crm.max_segments`).
-- IDs do projeto são TEXT (uuid() do Prisma) — por isso `gen_random_uuid()::text`.

-- 1. Módulo
INSERT INTO "modules" ("id", "slug", "name", "is_active", "created_at", "updated_at")
VALUES (gen_random_uuid()::text, 'projects', 'Projects', true, now(), now())
ON CONFLICT ("slug") DO NOTHING;

-- 2. Liberar o módulo apenas em Scale e Enterprise
INSERT INTO "plan_modules" ("id", "plan_id", "module_id", "created_at")
SELECT gen_random_uuid()::text, p."id", m."id", now()
  FROM "plans" p
  CROSS JOIN "modules" m
 WHERE m."slug" = 'projects'
   AND p."slug" IN ('scale', 'enterprise')
ON CONFLICT ("plan_id", "module_id") DO NOTHING;

-- 3. Features de quota (vinculadas ao módulo projects)
INSERT INTO "features" ("id", "key", "name", "type", "value_type", "module_id", "created_at", "updated_at")
SELECT gen_random_uuid()::text, v.key, v.name, 'STATIC', 'NUMBER', m."id", now(), now()
  FROM (VALUES
    ('projects.max_workspaces', 'Espaços de trabalho (Projects)'),
    ('projects.max_tasks', 'Tarefas (Projects)')
  ) AS v(key, name)
  CROSS JOIN "modules" m
 WHERE m."slug" = 'projects'
ON CONFLICT ("key") DO UPDATE
  SET "name" = EXCLUDED."name", "module_id" = EXCLUDED."module_id", "updated_at" = now();

-- 4a. Limites de max_workspaces por plano (Light/Essential bloqueados = 0)
INSERT INTO "plan_limits" ("id", "plan_id", "feature_id", "value_number", "created_at", "updated_at")
SELECT gen_random_uuid()::text, p."id", f."id",
  CASE p."slug"
    WHEN 'light'      THEN 0
    WHEN 'essential'  THEN 0
    WHEN 'scale'      THEN 10
    WHEN 'enterprise' THEN 30
  END,
  now(), now()
FROM "plans" p
CROSS JOIN "features" f
WHERE p."slug" IN ('light', 'essential', 'scale', 'enterprise')
  AND f."key" = 'projects.max_workspaces'
ON CONFLICT ("plan_id", "feature_id") DO UPDATE
  SET "value_number" = EXCLUDED."value_number", "updated_at" = now();

-- 4b. Limites de max_tasks por plano (Light/Essential bloqueados = 0)
INSERT INTO "plan_limits" ("id", "plan_id", "feature_id", "value_number", "created_at", "updated_at")
SELECT gen_random_uuid()::text, p."id", f."id",
  CASE p."slug"
    WHEN 'light'      THEN 0
    WHEN 'essential'  THEN 0
    WHEN 'scale'      THEN 10000
    WHEN 'enterprise' THEN 50000
  END,
  now(), now()
FROM "plans" p
CROSS JOIN "features" f
WHERE p."slug" IN ('light', 'essential', 'scale', 'enterprise')
  AND f."key" = 'projects.max_tasks'
ON CONFLICT ("plan_id", "feature_id") DO UPDATE
  SET "value_number" = EXCLUDED."value_number", "updated_at" = now();
