-- AlterTable
ALTER TABLE "StaffRole" ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
