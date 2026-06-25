-- Dado de referência (o seed não roda em produção): registra o módulo
-- Prospection (Kronos Prospection) e o libera em todos os planos ativos,
-- seguindo a política atual "todos os planos têm todos os módulos".
-- IDs são TEXT no projeto (uuid() do Prisma), por isso o ::text.

INSERT INTO "modules" ("id", "slug", "name", "is_active", "created_at", "updated_at")
VALUES (gen_random_uuid()::text, 'prospection', 'Prospection', true, now(), now())
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "plan_modules" ("id", "plan_id", "module_id", "created_at")
SELECT gen_random_uuid()::text, p."id", m."id", now()
  FROM "plans" p
  CROSS JOIN "modules" m
 WHERE m."slug" = 'prospection'
   AND p."is_active" = true
ON CONFLICT ("plan_id", "module_id") DO NOTHING;
