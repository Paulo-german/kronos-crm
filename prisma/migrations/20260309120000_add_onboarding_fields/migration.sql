-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organizations" ADD COLUMN "niche" TEXT;

-- Orgs existentes não devem ser bloqueadas pelo gatekeeper
UPDATE "organizations" SET "onboarding_completed" = true;
