/*
  Warnings:

  - A unique constraint covering the columns `[user_id,organization_id]` on the table `user_profiles` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "user_profiles_user_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_organization_id_key" ON "user_profiles"("user_id", "organization_id");
