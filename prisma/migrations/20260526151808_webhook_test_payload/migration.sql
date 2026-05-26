-- AlterTable
ALTER TABLE "webhook_sources" ADD COLUMN     "last_test_at" TIMESTAMP(3),
ADD COLUMN     "last_test_payload" JSONB;
