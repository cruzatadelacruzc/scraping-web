-- CreateTable
CREATE TABLE "ScraperConfig" (
    "id" TEXT NOT NULL,
    "storeKey" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScraperConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScraperConfig_storeKey_key" ON "ScraperConfig"("storeKey");