-- AlterTable
ALTER TABLE "contact_lifecycle_history" ADD COLUMN     "from_status" "customer_status",
ADD COLUMN     "to_status" "customer_status";
