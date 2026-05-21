-- DropForeignKey
ALTER TABLE "squad_members" DROP CONSTRAINT "squad_members_user_id_fkey";

-- DropIndex
DROP INDEX "squad_members_squad_id_user_id_key";

-- AlterTable
ALTER TABLE "squad_members" DROP COLUMN "user_id",
ADD COLUMN     "member_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "squad_members_squad_id_member_id_key" ON "squad_members"("squad_id", "member_id");

-- AddForeignKey
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

