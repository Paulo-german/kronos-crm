-- AlterTable: ADD COLUMN com DEFAULT é safe no PostgreSQL (não reescreve a tabela)
ALTER TABLE "pipelines" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Seta isDefault=true no pipeline mais antigo de cada organização
-- (usa subquery com DISTINCT ON para garantir exatamente um por org)
UPDATE "pipelines" SET "is_default" = true
WHERE "id" IN (
  SELECT DISTINCT ON ("organization_id") "id"
  FROM "pipelines"
  ORDER BY "organization_id", "created_at" ASC
);
