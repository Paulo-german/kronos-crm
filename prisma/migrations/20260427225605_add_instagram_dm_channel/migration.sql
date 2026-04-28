/*
  Warnings:

  - A unique constraint covering the columns `[meta_ig_user_id]` on the table `inboxes` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "InboxChannel" ADD VALUE 'INSTAGRAM_DM';

-- AlterTable
ALTER TABLE "inboxes" ADD COLUMN     "meta_ig_page_id" TEXT,
ADD COLUMN     "meta_ig_user_id" TEXT,
ADD COLUMN     "meta_ig_username" TEXT;

-- CreateTable
CREATE TABLE "meta_data_deletion_requests" (
    "id" TEXT NOT NULL,
    "meta_user_id" TEXT NOT NULL,
    "confirmation_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "payload" JSONB,

    CONSTRAINT "meta_data_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meta_data_deletion_requests_confirmation_code_key" ON "meta_data_deletion_requests"("confirmation_code");

-- CreateIndex
CREATE INDEX "meta_data_deletion_requests_meta_user_id_idx" ON "meta_data_deletion_requests"("meta_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "inboxes_meta_ig_user_id_key" ON "inboxes"("meta_ig_user_id");

-- CreateIndex
CREATE INDEX "inboxes_meta_ig_user_id_idx" ON "inboxes"("meta_ig_user_id");
