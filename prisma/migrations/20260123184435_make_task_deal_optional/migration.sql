-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'deal_won';
ALTER TYPE "ActivityType" ADD VALUE 'deal_lost';
ALTER TYPE "ActivityType" ADD VALUE 'deal_reopened';

-- AlterEnum
ALTER TYPE "DealStatus" ADD VALUE 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "deal_id" DROP NOT NULL;
