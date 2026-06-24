-- AlterTable
ALTER TABLE "broadcasts" ADD COLUMN     "segment_id" TEXT;

-- CreateTable
CREATE TABLE "contact_segments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_segments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_segments_organization_id_created_at_idx" ON "contact_segments"("organization_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "contact_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_segments" ADD CONSTRAINT "contact_segments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_segments" ADD CONSTRAINT "contact_segments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- DML idempotente — feature/plan limits da Segmentação.
-- Roda no deploy via `prisma migrate deploy`. Sem isso, o plano Light
-- não fica bloqueado e os demais ficam sem limite definido.
-- Espelha o padrão de `crm.max_custom_fields`.
-- ─────────────────────────────────────────────────────────────

-- Feature `crm.max_segments` (idempotente)
INSERT INTO "features" ("id", "key", "name", "type", "value_type", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'crm.max_segments', 'Segmentações', 'STATIC', 'NUMBER', NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "updated_at" = NOW();

-- Limites por plano: Light=0 (bloqueado), Essential=10, Scale=25, Enterprise=50
INSERT INTO "plan_limits" ("id", "plan_id", "feature_id", "value_number", "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  p."id",
  f."id",
  CASE p."slug"
    WHEN 'light'       THEN 0
    WHEN 'essential'   THEN 10
    WHEN 'scale'       THEN 25
    WHEN 'enterprise'  THEN 50
  END,
  NOW(), NOW()
FROM "plans" p
CROSS JOIN "features" f
WHERE p."slug" IN ('light', 'essential', 'scale', 'enterprise')
  AND f."key" = 'crm.max_segments'
ON CONFLICT ("plan_id", "feature_id") DO UPDATE
  SET "value_number" = EXCLUDED."value_number", "updated_at" = NOW();
