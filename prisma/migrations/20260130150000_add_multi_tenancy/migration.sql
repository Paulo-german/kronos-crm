-- Multi-tenancy Migration
-- Fase 1: Adiciona suporte a organizações

-- =============================================================================
-- 1. CRIAR NOVOS ENUMS
-- =============================================================================

CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'ACCEPTED');
CREATE TYPE "OrganizationPlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- =============================================================================
-- 2. CRIAR TABELA ORGANIZATIONS
-- =============================================================================

CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "stripe_customer_id" TEXT,
    "plan" "OrganizationPlan" NOT NULL DEFAULT 'FREE',
    "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- =============================================================================
-- 3. CRIAR TABELA MEMBERS
-- =============================================================================

CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MemberStatus" NOT NULL DEFAULT 'PENDING',
    "invitation_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "members_invitation_token_key" ON "members"("invitation_token");
CREATE UNIQUE INDEX "members_organization_id_email_key" ON "members"("organization_id", "email");

ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- 4. ADICIONAR organization_id ÀS TABELAS (NULLABLE PRIMEIRO)
-- =============================================================================

-- Companies
ALTER TABLE "companies" ADD COLUMN "organization_id" TEXT;

-- Contacts
ALTER TABLE "contacts" ADD COLUMN "organization_id" TEXT;

-- Pipelines
ALTER TABLE "pipelines" ADD COLUMN "organization_id" TEXT;

-- Products
ALTER TABLE "products" ADD COLUMN "organization_id" TEXT;

-- Tasks
ALTER TABLE "tasks" ADD COLUMN "organization_id" TEXT;

-- =============================================================================
-- 5. MIGRAR DADOS: Criar Org para cada usuário e atribuir dados
-- =============================================================================

-- Para cada usuário, criar uma organização pessoal
INSERT INTO "organizations" ("id", "name", "slug", "plan", "subscription_status", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    COALESCE("full_name", SPLIT_PART("email", '@', 1)) || '''s Workspace',
    LOWER(REPLACE(REPLACE(SPLIT_PART("email", '@', 1), '.', '-'), '_', '-')) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
    CASE "billing_plan"
        WHEN 'free' THEN 'FREE'::"OrganizationPlan"
        WHEN 'pro' THEN 'PRO'::"OrganizationPlan"
        WHEN 'enterprise' THEN 'ENTERPRISE'::"OrganizationPlan"
        ELSE 'FREE'::"OrganizationPlan"
    END,
    "subscription_status",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users";

-- Criar membro OWNER para cada usuário na sua org
-- Primeiro, precisamos mapear user -> org via um padrão de slug
INSERT INTO "members" ("id", "organization_id", "user_id", "email", "role", "status", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    o.id,
    u.id,
    u.email,
    'OWNER'::"MemberRole",
    'ACCEPTED'::"MemberStatus",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users" u
JOIN "organizations" o ON o.slug LIKE LOWER(REPLACE(REPLACE(SPLIT_PART(u.email, '@', 1), '.', '-'), '_', '-')) || '-%';

-- =============================================================================
-- 6. ATUALIZAR organization_id NAS ENTIDADES BASEADO NO OWNER
-- =============================================================================

-- Companies: pegar org do owner
UPDATE "companies" c
SET "organization_id" = m."organization_id"
FROM "members" m
WHERE c."owner_id" = m."user_id" AND m."role" = 'OWNER';

-- Contacts: pegar org do owner
UPDATE "contacts" ct
SET "organization_id" = m."organization_id"
FROM "members" m
WHERE ct."owner_id" = m."user_id" AND m."role" = 'OWNER';

-- Products: pegar org do owner
UPDATE "products" p
SET "organization_id" = m."organization_id"
FROM "members" m
WHERE p."owner_id" = m."user_id" AND m."role" = 'OWNER';

-- Pipelines: pegar org do creator
UPDATE "pipelines" pl
SET "organization_id" = m."organization_id"
FROM "members" m
WHERE pl."created_by" = m."user_id" AND m."role" = 'OWNER';

-- Tasks: pegar org do creator
UPDATE "tasks" t
SET "organization_id" = m."organization_id"
FROM "members" m
WHERE t."created_by" = m."user_id" AND m."role" = 'OWNER';

-- =============================================================================
-- 7. TORNAR organization_id NOT NULL E ADICIONAR FKs
-- =============================================================================

-- Companies
ALTER TABLE "companies" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "companies" ADD CONSTRAINT "companies_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Contacts
ALTER TABLE "contacts" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Pipelines
ALTER TABLE "pipelines" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Products
ALTER TABLE "products" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tasks
ALTER TABLE "tasks" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- 8. TORNAR owner_id/created_by NULLABLE (LEGACY)
-- =============================================================================

-- Companies: tornar owner_id nullable
ALTER TABLE "companies" ALTER COLUMN "owner_id" DROP NOT NULL;

-- Contacts: tornar owner_id nullable
ALTER TABLE "contacts" ALTER COLUMN "owner_id" DROP NOT NULL;

-- Products: tornar owner_id nullable
ALTER TABLE "products" ALTER COLUMN "owner_id" DROP NOT NULL;

-- Pipelines: tornar created_by nullable
ALTER TABLE "pipelines" ALTER COLUMN "created_by" DROP NOT NULL;
