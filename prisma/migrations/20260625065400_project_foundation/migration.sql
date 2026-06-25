-- CreateEnum
CREATE TYPE "project_task_status_category" AS ENUM ('NOT_STARTED', 'ACTIVE', 'DONE');

-- CreateEnum
CREATE TYPE "project_task_priority" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "project_workspaces" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_workspace_members" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_task_statuses" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "category" "project_task_status_category" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_task_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_folders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_lists" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "status_id" TEXT NOT NULL,
    "parent_task_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "priority" "project_task_priority" NOT NULL DEFAULT 'NONE',
    "start_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "time_estimate" INTEGER,
    "deal_id" TEXT,
    "contact_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_workspaces_organization_id_is_archived_position_idx" ON "project_workspaces"("organization_id", "is_archived", "position");

-- CreateIndex
CREATE INDEX "project_workspace_members_user_id_idx" ON "project_workspace_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_workspace_members_workspace_id_user_id_key" ON "project_workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "project_task_statuses_workspace_id_position_idx" ON "project_task_statuses"("workspace_id", "position");

-- CreateIndex
CREATE INDEX "project_folders_organization_id_workspace_id_position_idx" ON "project_folders"("organization_id", "workspace_id", "position");

-- CreateIndex
CREATE INDEX "project_lists_organization_id_workspace_id_folder_id_positi_idx" ON "project_lists"("organization_id", "workspace_id", "folder_id", "position");

-- CreateIndex
CREATE INDEX "project_tasks_organization_id_list_id_status_id_position_idx" ON "project_tasks"("organization_id", "list_id", "status_id", "position");

-- CreateIndex
CREATE INDEX "project_tasks_organization_id_list_id_position_idx" ON "project_tasks"("organization_id", "list_id", "position");

-- CreateIndex
CREATE INDEX "project_tasks_organization_id_due_date_idx" ON "project_tasks"("organization_id", "due_date");

-- CreateIndex
CREATE INDEX "project_tasks_parent_task_id_idx" ON "project_tasks"("parent_task_id");

-- CreateIndex
CREATE INDEX "project_tasks_organization_id_deal_id_idx" ON "project_tasks"("organization_id", "deal_id");

-- CreateIndex
CREATE INDEX "project_tasks_organization_id_contact_id_idx" ON "project_tasks"("organization_id", "contact_id");

-- AddForeignKey
ALTER TABLE "project_workspaces" ADD CONSTRAINT "project_workspaces_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_workspaces" ADD CONSTRAINT "project_workspaces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_workspace_members" ADD CONSTRAINT "project_workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "project_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_workspace_members" ADD CONSTRAINT "project_workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_statuses" ADD CONSTRAINT "project_task_statuses_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "project_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_folders" ADD CONSTRAINT "project_folders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_folders" ADD CONSTRAINT "project_folders_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "project_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_lists" ADD CONSTRAINT "project_lists_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_lists" ADD CONSTRAINT "project_lists_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "project_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_lists" ADD CONSTRAINT "project_lists_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "project_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "project_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "project_task_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
