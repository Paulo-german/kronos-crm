-- AlterTable
ALTER TABLE "agent_sessions" ADD COLUMN     "current_step_entered_at_turn" INTEGER NOT NULL DEFAULT 0;
