-- AlterTable
ALTER TABLE "DiningTable" ADD COLUMN     "waiterCallType" TEXT DEFAULT 'WAITER';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "orderNumber" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "visualSettings" JSONB DEFAULT '{}';

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");
