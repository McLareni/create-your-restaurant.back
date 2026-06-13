-- AlterTable
ALTER TABLE "DiningTable" ADD COLUMN     "isWaiterCallActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "waiterCallRequestedAt" TIMESTAMP(3);
