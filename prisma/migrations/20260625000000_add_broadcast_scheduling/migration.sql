-- AlterEnum: novo estado para serialização por inbox (1 disparo ativo por número)
ALTER TYPE "broadcast_status" ADD VALUE 'QUEUED' BEFORE 'RUNNING';

-- AlterTable: janela de envio, run durável e ritmo
ALTER TABLE "broadcasts"
  ALTER COLUMN "throttle_ms" SET DEFAULT 30000,
  ADD COLUMN "sending_window_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sending_window_config" JSONB,
  ADD COLUMN "sending_window_timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN "trigger_run_id" TEXT,
  ADD COLUMN "next_send_at" TIMESTAMP(3);
