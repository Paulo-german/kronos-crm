-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "segment" TEXT;

-- CreateIndex
CREATE INDEX "companies_organization_id_cnpj_idx" ON "companies"("organization_id", "cnpj");

-- CreateIndex
CREATE INDEX "companies_organization_id_domain_idx" ON "companies"("organization_id", "domain");
