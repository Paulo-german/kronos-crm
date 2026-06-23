-- AlterEnum: estágio "frio" no funil de lifecycle.
-- COLD = contato de lista importada/fria, com quem nunca tivemos contato
-- (ainda não "levantou a mão"). A posição lógica no funil é dada pelo
-- STAGE_ORDER (Record no código), não pela ordem física do enum — por isso
-- adicionamos no fim (consistente entre dev e prod, sem recriar o tipo).
ALTER TYPE "lifecycle_stage" ADD VALUE 'COLD';
