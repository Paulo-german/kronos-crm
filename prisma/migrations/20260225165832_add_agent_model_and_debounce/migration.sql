-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "debounce_seconds" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "model_id" TEXT NOT NULL DEFAULT 'anthropic/claude-sonnet-4';
