-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('TASK', 'MEETING', 'CALL', 'WHATSAPP', 'VISIT', 'EMAIL');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "type" "TaskType" NOT NULL DEFAULT 'TASK';
