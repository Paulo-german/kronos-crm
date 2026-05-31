-- CreateTable (idempotente — production já pode ter esta tabela criada)
CREATE TABLE IF NOT EXISTS "capture_forms" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "public_token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fields" JSONB NOT NULL DEFAULT '{}',
    "button_label" TEXT NOT NULL DEFAULT 'Enviar',
    "success_message" TEXT NOT NULL DEFAULT 'Obrigado! Recebemos seus dados.',
    "redirect_url" TEXT,
    "assigned_to" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "capture_source_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capture_forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "capture_forms_public_token_key" ON "capture_forms"("public_token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "capture_forms_organization_id_is_active_idx" ON "capture_forms"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "capture_forms_organization_id_created_at_idx" ON "capture_forms"("organization_id", "created_at" DESC);

-- AddForeignKey (ignora se já existir)
DO $$ BEGIN
  ALTER TABLE "capture_forms" ADD CONSTRAINT "capture_forms_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "capture_forms" ADD CONSTRAINT "capture_forms_assigned_to_fkey"
    FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "capture_forms" ADD CONSTRAINT "capture_forms_capture_source_id_fkey"
    FOREIGN KEY ("capture_source_id") REFERENCES "capture_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
