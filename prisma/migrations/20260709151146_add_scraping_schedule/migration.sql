-- CreateTable
CREATE TABLE "ScrapingSchedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "store" TEXT NOT NULL DEFAULT 'revolico',
    "cron" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "jobs" JSONB NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapingSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScrapingSchedule_name_key" ON "ScrapingSchedule"("name");
