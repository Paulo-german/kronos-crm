-- CreateEnum
CREATE TYPE "project_list_view_type" AS ENUM ('BOARD', 'LIST', 'CALENDAR');

-- CreateEnum
CREATE TYPE "project_field_type" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'MONEY', 'SELECT', 'MULTI_SELECT', 'DATE', 'CHECKBOX', 'URL', 'RATING', 'PROGRESS', 'PERSON');

-- CreateTable
CREATE TABLE "project_task_assignees" (
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_task_assignees_pkey" PRIMARY KEY ("task_id","user_id")
);

-- CreateTable
CREATE TABLE "project_list_views" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "project_list_view_type" NOT NULL,
    "config" JSONB,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_list_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tags" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_task_tags" (
    "task_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "project_task_tags_pkey" PRIMARY KEY ("task_id","tag_id")
);

-- CreateTable
CREATE TABLE "project_field_definitions" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "project_field_type" NOT NULL,
    "options" JSONB,
    "description" TEXT,
    "default_value" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_field_values" (
    "id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_task_assignees_user_id_task_id_idx" ON "project_task_assignees"("user_id", "task_id");

-- CreateIndex
CREATE INDEX "project_list_views_organization_id_list_id_position_idx" ON "project_list_views"("organization_id", "list_id", "position");

-- CreateIndex
CREATE INDEX "project_tags_workspace_id_idx" ON "project_tags"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_tags_workspace_id_name_key" ON "project_tags"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "project_task_tags_tag_id_idx" ON "project_task_tags"("tag_id");

-- CreateIndex
CREATE INDEX "project_field_definitions_workspace_id_position_idx" ON "project_field_definitions"("workspace_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "project_field_definitions_workspace_id_name_key" ON "project_field_definitions"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "project_field_values_task_id_idx" ON "project_field_values"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_field_values_field_id_task_id_key" ON "project_field_values"("field_id", "task_id");

-- AddForeignKey
ALTER TABLE "project_task_assignees" ADD CONSTRAINT "project_task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_assignees" ADD CONSTRAINT "project_task_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_list_views" ADD CONSTRAINT "project_list_views_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_list_views" ADD CONSTRAINT "project_list_views_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "project_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "project_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_tags" ADD CONSTRAINT "project_task_tags_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_tags" ADD CONSTRAINT "project_task_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "project_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_field_definitions" ADD CONSTRAINT "project_field_definitions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "project_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_field_values" ADD CONSTRAINT "project_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "project_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_field_values" ADD CONSTRAINT "project_field_values_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
