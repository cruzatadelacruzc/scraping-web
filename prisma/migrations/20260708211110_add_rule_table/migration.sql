-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rule_ruleKey_key" ON "Rule"("ruleKey");
