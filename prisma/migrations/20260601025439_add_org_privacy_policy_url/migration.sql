/*
  Warnings:

  - You are about to drop the column `consent_text` on the `capture_forms` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "capture_forms" DROP COLUMN "consent_text";

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "privacy_policy_url" TEXT;
