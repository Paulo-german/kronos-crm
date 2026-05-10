-- AddColumn invite_token e invite_expires_at em professionals
-- Campos necessários para o fluxo de convite da fase Professional Access

ALTER TABLE "professionals" ADD COLUMN "invite_token" TEXT;
ALTER TABLE "professionals" ADD COLUMN "invite_expires_at" TIMESTAMP(3);

-- Garantir unicidade do token (NULL não viola UNIQUE em Postgres)
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_invite_token_key" UNIQUE ("invite_token");
