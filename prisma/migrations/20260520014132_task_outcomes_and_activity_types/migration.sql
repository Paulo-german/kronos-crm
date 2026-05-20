-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'whatsapp';
ALTER TYPE "ActivityType" ADD VALUE 'visit';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "outcome_notes" TEXT,
ADD COLUMN     "outcome_type" TEXT;
