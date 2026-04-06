-- CreateEnum
CREATE TYPE "message_delivery_status" AS ENUM ('sent', 'delivered', 'read', 'failed');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "delivery_status" "message_delivery_status";
