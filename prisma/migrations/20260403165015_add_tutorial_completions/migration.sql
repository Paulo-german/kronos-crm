-- CreateTable
CREATE TABLE "tutorial_completions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tutorial_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutorial_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tutorial_completions_organization_id_idx" ON "tutorial_completions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "tutorial_completions_user_id_organization_id_tutorial_id_key" ON "tutorial_completions"("user_id", "organization_id", "tutorial_id");

-- AddForeignKey
ALTER TABLE "tutorial_completions" ADD CONSTRAINT "tutorial_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorial_completions" ADD CONSTRAINT "tutorial_completions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
