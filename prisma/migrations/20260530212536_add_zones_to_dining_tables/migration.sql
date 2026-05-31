/*
  Warnings:

  - A unique constraint covering the columns `[number,restaurantId]` on the table `DiningTable` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DiningTable_restaurantId_number_key";

-- AlterTable
ALTER TABLE "DiningTable" ADD COLUMN     "zoneId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'INACTIVE';

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zone_name_restaurantId_key" ON "Zone"("name", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "DiningTable_number_restaurantId_key" ON "DiningTable"("number", "restaurantId");

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiningTable" ADD CONSTRAINT "DiningTable_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
