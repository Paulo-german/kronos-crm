/*
  Warnings:

  - You are about to drop the column `lost_stage_id` on the `pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `won_stage_id` on the `pipelines` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DealPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('OPEN', 'WON', 'LOST', 'PAUSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'stage_change';
ALTER TYPE "ActivityType" ADD VALUE 'product_added';
ALTER TYPE "ActivityType" ADD VALUE 'product_removed';
ALTER TYPE "ActivityType" ADD VALUE 'task_created';
ALTER TYPE "ActivityType" ADD VALUE 'task_completed';

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "lostReason" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paused_at" TIMESTAMP(3),
ADD COLUMN     "priority" "DealPriority" NOT NULL DEFAULT 'medium',
ADD COLUMN     "status" "DealStatus" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "pipelines" DROP COLUMN "lost_stage_id",
DROP COLUMN "won_stage_id";
