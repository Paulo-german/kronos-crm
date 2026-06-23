-- AlterTable
ALTER TABLE "broadcasts" ADD COLUMN     "template_language" TEXT,
ADD COLUMN     "template_name" TEXT,
ADD COLUMN     "template_params" JSONB,
ALTER COLUMN "message_content" DROP NOT NULL;
