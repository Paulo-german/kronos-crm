/*
  Migration: add_owner_to_contact
  
  Steps:
  1. Delete existing contacts (test data)
  2. Add owner_id column
*/

-- Step 1: Limpar contatos de teste
DELETE FROM "contacts";

-- Step 2: Adicionar coluna owner_id
ALTER TABLE "contacts" ADD COLUMN "owner_id" TEXT NOT NULL;

-- Step 3: Adicionar foreign key
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_fkey" 
  FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
