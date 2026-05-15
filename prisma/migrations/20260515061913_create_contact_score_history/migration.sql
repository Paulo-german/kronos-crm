-- CreateTable
CREATE TABLE "contact_score_history" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_score_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_score_history_contact_id_created_at_idx" ON "contact_score_history"("contact_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "contact_score_history_organization_id_created_at_idx" ON "contact_score_history"("organization_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "contact_score_history" ADD CONSTRAINT "contact_score_history_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_score_history" ADD CONSTRAINT "contact_score_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
