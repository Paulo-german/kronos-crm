-- CreateEnum
CREATE TYPE "webhook_platform" AS ENUM ('GENERIC', 'SHOPIFY', 'NUVEM_SHOP', 'HOTMART', 'GOOGLE_FORMS', 'OTHER');

-- CreateEnum
CREATE TYPE "webhook_event_type" AS ENUM ('NEW_CONTACT', 'UPDATE_CONTACT', 'NEW_DEAL', 'UPDATE_DEAL', 'DEAL_CLOSED');

-- CreateEnum
CREATE TYPE "webhook_log_status" AS ENUM ('PROCESSED', 'ERROR', 'IGNORED');

-- CreateTable
CREATE TABLE "webhook_sources" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "secret_key" TEXT,
    "platform" "webhook_platform" NOT NULL DEFAULT 'GENERIC',
    "event_type" "webhook_event_type" NOT NULL,
    "field_mapping" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_received_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "webhook_source_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "external_event_id" TEXT,
    "payload" JSONB NOT NULL,
    "resolved_data" JSONB NOT NULL DEFAULT '{}',
    "status" "webhook_log_status" NOT NULL,
    "error_message" TEXT,
    "contact_id" TEXT,
    "deal_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_sources_token_key" ON "webhook_sources"("token");

-- CreateIndex
CREATE INDEX "webhook_sources_organization_id_is_active_idx" ON "webhook_sources"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "webhook_sources_organization_id_created_at_idx" ON "webhook_sources"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_logs_webhook_source_id_received_at_idx" ON "webhook_logs"("webhook_source_id", "received_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_logs_organization_id_received_at_idx" ON "webhook_logs"("organization_id", "received_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_logs_organization_id_status_received_at_idx" ON "webhook_logs"("organization_id", "status", "received_at" DESC);

-- AddForeignKey
ALTER TABLE "webhook_sources" ADD CONSTRAINT "webhook_sources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_source_id_fkey" FOREIGN KEY ("webhook_source_id") REFERENCES "webhook_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Índice único parcial para idempotência: dedup por (source, externalEventId) apenas quando preenchido.
-- Prisma não suporta partial unique index nativamente — criado via SQL manual.
CREATE UNIQUE INDEX webhook_logs_source_external_event_idx
  ON webhook_logs (webhook_source_id, external_event_id)
  WHERE external_event_id IS NOT NULL;
