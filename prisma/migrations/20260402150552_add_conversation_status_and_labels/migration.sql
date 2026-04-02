-- CreateEnum
CREATE TYPE "conversation_status" AS ENUM ('OPEN', 'RESOLVED');

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "resolved_at" TIMESTAMP(3),
ADD COLUMN     "resolved_by" TEXT,
ADD COLUMN     "status" "conversation_status" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "pipelines" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "conversation_labels" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_label_assignments" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "label_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_label_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_labels_organization_id_idx" ON "conversation_labels"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_labels_organization_id_name_key" ON "conversation_labels"("organization_id", "name");

-- CreateIndex
CREATE INDEX "conversation_label_assignments_conversation_id_idx" ON "conversation_label_assignments"("conversation_id");

-- CreateIndex
CREATE INDEX "conversation_label_assignments_label_id_idx" ON "conversation_label_assignments"("label_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_label_assignments_conversation_id_label_id_key" ON "conversation_label_assignments"("conversation_id", "label_id");

-- CreateIndex
CREATE INDEX "conversations_organization_id_status_updated_at_idx" ON "conversations"("organization_id", "status", "updated_at" DESC);

-- AddForeignKey
ALTER TABLE "conversation_labels" ADD CONSTRAINT "conversation_labels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_label_assignments" ADD CONSTRAINT "conversation_label_assignments_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_label_assignments" ADD CONSTRAINT "conversation_label_assignments_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "conversation_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
