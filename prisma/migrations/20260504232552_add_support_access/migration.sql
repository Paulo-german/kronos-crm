-- AlterEnum
ALTER TYPE "MemberRole" ADD VALUE 'SUPPORT';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_support_agent" BOOLEAN NOT NULL DEFAULT false;
