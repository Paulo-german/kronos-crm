-- CreateEnum
CREATE TYPE "broadcast_status" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "broadcast_recipient_status" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "inbox_id" TEXT NOT NULL,
    "connection_type" "ConnectionType" NOT NULL,
    "name" TEXT NOT NULL,
    "message_content" TEXT NOT NULL,
    "throttle_ms" INTEGER NOT NULL DEFAULT 1500,
    "status" "broadcast_status" NOT NULL DEFAULT 'DRAFT',
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "scheduled_for" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_recipients" (
    "id" TEXT NOT NULL,
    "broadcast_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "phone_snapshot" TEXT NOT NULL,
    "status" "broadcast_recipient_status" NOT NULL DEFAULT 'PENDING',
    "provider_message_id" TEXT,
    "error_message" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "conversation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcast_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "broadcasts_status_scheduled_for_idx" ON "broadcasts"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "broadcasts_organization_id_status_created_at_idx" ON "broadcasts"("organization_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "broadcasts_organization_id_created_by_created_at_idx" ON "broadcasts"("organization_id", "created_by", "created_at" DESC);

-- CreateIndex
CREATE INDEX "broadcast_recipients_broadcast_id_status_idx" ON "broadcast_recipients"("broadcast_id", "status");

-- CreateIndex
CREATE INDEX "broadcast_recipients_contact_id_idx" ON "broadcast_recipients"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_recipients_broadcast_id_contact_id_key" ON "broadcast_recipients"("broadcast_id", "contact_id");

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_inbox_id_fkey" FOREIGN KEY ("inbox_id") REFERENCES "inboxes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- SQL Helpers de lock (worker de processamento — Trigger.dev)
-- IDs são TEXT (padrão do projeto: uuid() do Prisma → text no Postgres),
-- não uuid. Concorrência segura via FOR UPDATE SKIP LOCKED.
-- ─────────────────────────────────────────────────────────────

-- Promoção de SCHEDULED -> RUNNING quando a janela agendada passou
CREATE OR REPLACE FUNCTION promote_scheduled_broadcasts() RETURNS void AS $$
  UPDATE broadcasts
     SET status = 'RUNNING', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
   WHERE status = 'SCHEDULED'
     AND scheduled_for <= NOW();
$$ LANGUAGE sql;

-- Recovery: SENDING -> PENDING para recipients travados há mais de 5 minutos
-- (crash da task entre o claim e o envio)
CREATE OR REPLACE FUNCTION recover_stuck_sending_recipients() RETURNS void AS $$
  UPDATE broadcast_recipients
     SET status = 'PENDING', updated_at = NOW()
   WHERE status = 'SENDING'
     AND updated_at < NOW() - INTERVAL '5 minutes';
$$ LANGUAGE sql;

-- Claim atômico do próximo broadcast RUNNING com recipients PENDING (FIFO).
-- Retorna o broadcast + credenciais da inbox (JOIN) para o worker enviar.
-- Colunas enumeradas explicitamente (não b.*) para casar com o RETURNS TABLE.
CREATE OR REPLACE FUNCTION claim_next_broadcast()
RETURNS TABLE (
  id text, organization_id text, inbox_id text, name text, message_content text,
  throttle_ms int, status text, connection_type text,
  evolution_api_url text, evolution_api_key text, evolution_instance_name text,
  meta_access_token text, meta_phone_number_id text,
  zapi_instance_id text, zapi_token text, zapi_client_token text
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.organization_id, b.inbox_id, b.name, b.message_content,
         b.throttle_ms, b.status::text, b.connection_type::text,
         i.evolution_api_url, i.evolution_api_key, i.evolution_instance_name,
         i.meta_access_token, i.meta_phone_number_id,
         i.zapi_instance_id, i.zapi_token, i.zapi_client_token
    FROM broadcasts b
    JOIN inboxes i ON i.id = b.inbox_id
   WHERE b.status = 'RUNNING'
     AND EXISTS (SELECT 1 FROM broadcast_recipients r
                  WHERE r.broadcast_id = b.id AND r.status = 'PENDING')
   ORDER BY b.created_at ASC
   LIMIT 1
   FOR UPDATE OF b SKIP LOCKED;
END $$ LANGUAGE plpgsql;

-- Claim atômico de um chunk de recipients PENDING (marca SENDING numa query só)
CREATE OR REPLACE FUNCTION claim_recipients(p_broadcast_id text, p_limit int)
RETURNS SETOF broadcast_recipients AS $$
  UPDATE broadcast_recipients
     SET status = 'SENDING', updated_at = NOW()
   WHERE id IN (
     SELECT id FROM broadcast_recipients
      WHERE broadcast_id = p_broadcast_id AND status = 'PENDING'
      ORDER BY created_at ASC
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED
   )
   RETURNING *;
$$ LANGUAGE sql;

-- Incremento atômico dos contadores denormalizados após cada chunk
CREATE OR REPLACE FUNCTION increment_broadcast_counts(
  p_broadcast_id text, p_sent int, p_failed int
) RETURNS void AS $$
  UPDATE broadcasts
     SET sent_count = sent_count + p_sent,
         failed_count = failed_count + p_failed,
         updated_at = NOW()
   WHERE id = p_broadcast_id;
$$ LANGUAGE sql;
