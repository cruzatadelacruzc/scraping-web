-- DropForeignKey
ALTER TABLE "bot_conversations" DROP CONSTRAINT "bot_conversations_accountId_fkey";

-- AlterTable
ALTER TABLE "bot_conversations" ALTER COLUMN "accountId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "bot_conversations" ADD CONSTRAINT "bot_conversations_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
