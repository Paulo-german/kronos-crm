-- AlterTable: adicionar coluna de aparência ao formulário de captura
ALTER TABLE "capture_forms" ADD COLUMN "appearance" JSONB NOT NULL DEFAULT '{}';
