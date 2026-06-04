-- CreateEnum
CREATE TYPE "AlarmConditionType" AS ENUM ('PRICE_DROPS_BELOW', 'PRICE_RISES_ABOVE', 'PRICE_CHANGES_BY_PERCENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ALARM_TRIGGERED');

-- AlterEnum (RoleType rename: ACCOUNT_ADMIN -> ACCOUNT_OWNER, CUSTOMER -> MEMBER, add SUPER_ADMIN)
ALTER TYPE "RoleType" RENAME TO "RoleType_old";
CREATE TYPE "RoleType" AS ENUM ('ACCOUNT_OWNER', 'SUPER_ADMIN', 'MEMBER');

ALTER TABLE "Role" ALTER COLUMN "name" TYPE "RoleType" USING (
  CASE "name"::text
    WHEN 'ACCOUNT_ADMIN' THEN 'ACCOUNT_OWNER'::"RoleType"
    WHEN 'CUSTOMER' THEN 'MEMBER'::"RoleType"
    ELSE "name"::text::"RoleType"
  END
);

DROP TYPE "RoleType_old";

-- CreateTable
CREATE TABLE "Alarm" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "productUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" "AlarmConditionType" NOT NULL,
    "threshold" DECIMAL(12,2) NOT NULL,
    "percentage" DOUBLE PRECISION,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastEvaluatedAt" TIMESTAMP(3),
    "lastEvaluatedPrice" DECIMAL(12,2),
    "lastMatchedAt" TIMESTAMP(3),
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alarm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlarmHistory" (
    "id" TEXT NOT NULL,
    "alarmId" TEXT NOT NULL,
    "productUrl" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlarmHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "alarmId" TEXT,
    "type" "NotificationType" NOT NULL DEFAULT 'ALARM_TRIGGERED',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlarmHistory_alarmId_matchedAt_idx" ON "AlarmHistory"("alarmId", "matchedAt");

-- CreateIndex
CREATE INDEX "AlarmHistory_alarmId_price_idx" ON "AlarmHistory"("alarmId", "price");

-- CreateIndex
CREATE INDEX "Notification_accountId_createdAt_idx" ON "Notification"("accountId", "createdAt");

-- AddForeignKey
ALTER TABLE "Alarm" ADD CONSTRAINT "Alarm_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlarmHistory" ADD CONSTRAINT "AlarmHistory_alarmId_fkey" FOREIGN KEY ("alarmId") REFERENCES "Alarm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_alarmId_fkey" FOREIGN KEY ("alarmId") REFERENCES "Alarm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
