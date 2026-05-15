-- CreateEnum
CREATE TYPE "lifecycle_cause_type" AS ENUM ('AGENT_STEP_ADVANCED', 'DEAL_CREATED', 'DEAL_WON', 'DEAL_LOST', 'MANUAL', 'INACTIVITY', 'BACKFILL', 'AI_QUALIFICATION');

-- CreateTable
CREATE TABLE "contact_lifecycle_history" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "from_stage" "lifecycle_stage",
    "to_stage" "lifecycle_stage" NOT NULL,
    "cause_type" "lifecycle_cause_type" NOT NULL,
    "cause_ref_id" TEXT,
    "changed_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_lifecycle_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_lifecycle_history_contact_id_created_at_idx" ON "contact_lifecycle_history"("contact_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "contact_lifecycle_history_organization_id_to_stage_created__idx" ON "contact_lifecycle_history"("organization_id", "to_stage", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "contact_lifecycle_history" ADD CONSTRAINT "contact_lifecycle_history_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_lifecycle_history" ADD CONSTRAINT "contact_lifecycle_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
