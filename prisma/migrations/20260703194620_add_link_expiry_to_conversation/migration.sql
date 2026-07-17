-- AlterTable
ALTER TABLE "bot_conversations" ADD COLUMN     "linkExpiresAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "bot_conversations_linkExpiresAt_idx" ON "bot_conversations"("linkExpiresAt");
