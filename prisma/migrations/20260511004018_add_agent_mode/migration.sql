-- CreateEnum
CREATE TYPE "AgentMode" AS ENUM ('PIPELINE', 'BOOKING');

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "agent_mode" "AgentMode" NOT NULL DEFAULT 'PIPELINE';
