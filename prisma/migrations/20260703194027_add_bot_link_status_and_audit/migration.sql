-- CreateEnum
CREATE TYPE "BotLinkCodeStatus" AS ENUM ('PENDING', 'VALIDATED', 'CONFIRMED', 'CONSUMED', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BotLinkAction" AS ENUM ('CODE_GENERATED', 'CODE_VALIDATED', 'CODE_CONFIRMED', 'CODE_DENIED', 'CODE_EXPIRED', 'LINKED', 'UNLINKED');

-- AlterTable
ALTER TABLE "bot_link_codes" ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "status" "BotLinkCodeStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedFrom" TEXT;

-- CreateTable
CREATE TABLE "bot_link_audit" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "BotLinkAction" NOT NULL,
    "code" TEXT,
    "codeId" TEXT,
    "provider" TEXT,
    "externalId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_link_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bot_link_audit_accountId_createdAt_idx" ON "bot_link_audit"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "bot_link_audit_code_idx" ON "bot_link_audit"("code");

-- CreateIndex
CREATE INDEX "bot_link_audit_userId_createdAt_idx" ON "bot_link_audit"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "bot_link_codes_status_idx" ON "bot_link_codes"("status");

-- AddForeignKey
ALTER TABLE "bot_link_audit" ADD CONSTRAINT "bot_link_audit_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_link_audit" ADD CONSTRAINT "bot_link_audit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
