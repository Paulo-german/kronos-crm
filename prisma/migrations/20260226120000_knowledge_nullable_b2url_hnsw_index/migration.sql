-- AlterTable: make b2_url nullable (no B2 storage needed — text extracted and discarded)
ALTER TABLE "agent_knowledge_files" ALTER COLUMN "b2_url" DROP NOT NULL;

-- CreateIndex: HNSW for cosine similarity on embeddings (was dropped in 20260225150357)
CREATE INDEX idx_agent_knowledge_chunks_embedding
ON agent_knowledge_chunks
USING hnsw (embedding vector_cosine_ops);
