-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('GENERAL', 'NEWS', 'REMINDERS', 'ANNOUNCEMENTS', 'OFFERS', 'FEEDBACK');

-- DropIndex
DROP INDEX "automation_executions_contact_id_idx";

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "category" "NotificationCategory" NOT NULL DEFAULT 'GENERAL';
