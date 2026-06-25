-- CreateEnum
CREATE TYPE "project_field_edit_policy" AS ENUM ('SPACE_DEFAULT', 'EVERYONE', 'ELEVATED_ONLY');

-- CreateEnum
CREATE TYPE "project_field_permission_level" AS ENUM ('NONE', 'VIEW', 'EDIT');

-- CreateEnum
CREATE TYPE "project_template_scope" AS ENUM ('WORKSPACE', 'LIST');

-- AlterTable
ALTER TABLE "project_field_definitions" ADD COLUMN     "edit_policy" "project_field_edit_policy" NOT NULL DEFAULT 'SPACE_DEFAULT';

-- CreateTable
CREATE TABLE "project_task_comments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_checklist_items" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_task_attachments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_field_permission_exceptions" (
    "id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level" "project_field_permission_level" NOT NULL,

    CONSTRAINT "project_field_permission_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "scope" "project_template_scope" NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_task_comments_task_id_created_at_idx" ON "project_task_comments"("task_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "project_checklist_items_task_id_position_idx" ON "project_checklist_items"("task_id", "position");

-- CreateIndex
CREATE INDEX "project_task_attachments_task_id_created_at_idx" ON "project_task_attachments"("task_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "project_field_permission_exceptions_field_id_user_id_key" ON "project_field_permission_exceptions"("field_id", "user_id");

-- CreateIndex
CREATE INDEX "project_templates_organization_id_scope_idx" ON "project_templates"("organization_id", "scope");

-- AddForeignKey
ALTER TABLE "project_task_comments" ADD CONSTRAINT "project_task_comments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_comments" ADD CONSTRAINT "project_task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_comments" ADD CONSTRAINT "project_task_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_checklist_items" ADD CONSTRAINT "project_checklist_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_attachments" ADD CONSTRAINT "project_task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_attachments" ADD CONSTRAINT "project_task_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_field_permission_exceptions" ADD CONSTRAINT "project_field_permission_exceptions_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "project_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_field_permission_exceptions" ADD CONSTRAINT "project_field_permission_exceptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_templates" ADD CONSTRAINT "project_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
