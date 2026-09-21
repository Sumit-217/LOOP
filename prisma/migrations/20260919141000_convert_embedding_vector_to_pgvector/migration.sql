-- Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "embeddings" DROP COLUMN "vector",
ADD COLUMN     "vector" vector(768) NOT NULL;
