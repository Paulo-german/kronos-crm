-- AlterTable
ALTER TABLE "inboxes" ADD COLUMN     "evolution_api_key" TEXT,
ADD COLUMN     "evolution_api_url" TEXT,
ADD COLUMN     "evolution_webhook_secret" TEXT;
