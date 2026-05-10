-- Backfill contact_id nos appointments existentes a partir do contato principal do deal.
-- Prioridade: is_primary DESC (true primeiro), depois id ASC como desempate.
-- Appointments de deals sem nenhum contato ficam com contact_id NULL (caso válido).
UPDATE "appointments" a
SET "contact_id" = (
  SELECT dc."contact_id"
  FROM "deal_contacts" dc
  WHERE dc."deal_id" = a."deal_id"
  ORDER BY dc."is_primary" DESC, dc."id" ASC
  LIMIT 1
)
WHERE a."contact_id" IS NULL
  AND a."deal_id" IS NOT NULL;
