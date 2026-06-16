-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationCategory" ADD VALUE 'ASSIGNMENTS';
ALTER TYPE "NotificationCategory" ADD VALUE 'ACTIONS';
ALTER TYPE "NotificationCategory" ADD VALUE 'ALERTS';

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "category" DROP DEFAULT;
