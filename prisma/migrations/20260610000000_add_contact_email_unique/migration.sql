-- Normalizar emails existentes para lowercase + trim antes de criar o índice único.
-- Necessário porque @@unique no Postgres é case-sensitive — sem normalizar,
-- duplicatas como "Paulo@x.com" e "paulo@x.com" impediriam a criação do índice.
UPDATE "contacts" SET "email" = lower(trim("email")) WHERE "email" IS NOT NULL;

-- Resolver duplicatas de email dentro da mesma organização antes de criar o índice único.
-- Mantém o contato criado mais recentemente (maior created_at) e remove os demais.
-- Usa DELETE + RETURNING para atomicidade na transação.
DELETE FROM "contacts"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "organization_id", "email"
        ORDER BY "created_at" DESC
      ) AS rn
    FROM "contacts"
    WHERE "email" IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Remover o índice não-único anterior (substituído pelo unique abaixo)
DROP INDEX IF EXISTS "contacts_organization_id_email_idx";

-- CreateIndex: unicidade de email por organização
CREATE UNIQUE INDEX "contacts_organization_id_email_key" ON "contacts"("organization_id", "email");
