-- Remove default residual de deal_contacts.role
ALTER TABLE "deal_contacts" ALTER COLUMN "role" DROP DEFAULT;

-- Corrige plan_limits.value_number para INTEGER (créditos/limites são sempre inteiros)
ALTER TABLE "plan_limits" ALTER COLUMN "value_number" SET DATA TYPE INTEGER USING value_number::INTEGER;
