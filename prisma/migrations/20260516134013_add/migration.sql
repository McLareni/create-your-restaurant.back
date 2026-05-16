-- AlterTable
ALTER TABLE "User" ADD COLUMN     "loginCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "loginCodeHash" TEXT,
ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
