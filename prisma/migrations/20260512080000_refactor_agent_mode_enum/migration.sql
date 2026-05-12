-- Rename values do enum AgentMode preservando os dados existentes.
-- PIPELINE -> PRODUCT, BOOKING -> SERVICE, adicionando HYBRID.
ALTER TYPE "AgentMode" RENAME VALUE 'PIPELINE' TO 'PRODUCT';
ALTER TYPE "AgentMode" RENAME VALUE 'BOOKING' TO 'SERVICE';
ALTER TYPE "AgentMode" ADD VALUE 'HYBRID';

-- Ajusta o default da coluna para refletir o novo nome do valor.
ALTER TABLE "agents" ALTER COLUMN "agent_mode" SET DEFAULT 'PRODUCT';
