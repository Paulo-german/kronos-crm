-- CreateEnum
CREATE TYPE "entity_type" AS ENUM ('CONTACT', 'DEAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "field_type" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'DATE', 'PHONE', 'EMAIL', 'URL');

-- CreateTable
CREATE TABLE "field_definitions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_type" "entity_type" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "field_type" NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "position" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "field_definition_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "field_definitions_organization_id_entity_type_is_active_pos_idx" ON "field_definitions"("organization_id", "entity_type", "is_active", "position");

-- CreateIndex
CREATE UNIQUE INDEX "field_definitions_organization_id_entity_type_key_key" ON "field_definitions"("organization_id", "entity_type", "key");

-- CreateIndex
CREATE INDEX "custom_field_values_entity_id_idx" ON "custom_field_values"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_field_definition_id_entity_id_key" ON "custom_field_values"("field_definition_id", "entity_id");

-- AddForeignKey
ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_field_definition_id_fkey" FOREIGN KEY ("field_definition_id") REFERENCES "field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- DML idempotente — feature/plan limits + backfill de orgs existentes.
-- Roda no deploy via `prisma migrate deploy`. Sem isso, orgs já criadas
-- ficam sem os system fields e o plano Light não fica bloqueado.
-- ─────────────────────────────────────────────────────────────

-- Bloco 1: Feature `crm.max_custom_fields` (idempotente)
INSERT INTO "features" ("id", "key", "name", "type", "value_type", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'crm.max_custom_fields', 'Campos Personalizados', 'STATIC', 'NUMBER', NOW(), NOW())
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
  AND f."key" = 'crm.max_custom_fields'
ON CONFLICT ("plan_id", "feature_id") DO UPDATE
  SET "value_number" = EXCLUDED."value_number", "updated_at" = NOW();

-- Bloco 2: Backfill de system fields para orgs existentes.
-- ON CONFLICT DO NOTHING garante idempotência (unique: org+entityType+key).
INSERT INTO "field_definitions" (
  "id", "organization_id", "entity_type", "key", "label",
  "type", "is_system", "is_required", "position", "is_active",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  o."id",
  'CONTACT'::"entity_type",
  fields."key",
  fields."label",
  fields."field_type"::"field_type",
  true,
  fields."is_required",
  fields."position",
  true,
  NOW(), NOW()
FROM "organizations" o
CROSS JOIN (
  VALUES
    ('name',  'Nome',     'TEXT',  true,  0),
    ('email', 'Email',    'EMAIL', false, 1),
    ('phone', 'Telefone', 'PHONE', false, 2),
    ('role',  'Cargo',    'TEXT',  false, 3),
    ('cpf',   'CPF',      'TEXT',  false, 4)
) AS fields("key", "label", "field_type", "is_required", "position")
ON CONFLICT ("organization_id", "entity_type", "key") DO NOTHING;
