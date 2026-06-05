/*
  Warnings:

  - You are about to drop the column `name` on the `ComboDish` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `ComboDish` table. All the data in the column will be lost.
  - You are about to drop the column `zoneId` on the `DiningTable` table. All the data in the column will be lost.
  - You are about to drop the column `allergens` on the `Dish` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Dish` table. All the data in the column will be lost.
  - You are about to drop the column `taxRate` on the `Dish` table. All the data in the column will be lost.
  - You are about to drop the `DishUpsell` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DishVariant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Staff` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Zone` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DiningTable" DROP CONSTRAINT "DiningTable_zoneId_fkey";

-- DropForeignKey
ALTER TABLE "DishUpsell" DROP CONSTRAINT "DishUpsell_mainDishId_fkey";

-- DropForeignKey
ALTER TABLE "DishUpsell" DROP CONSTRAINT "DishUpsell_upsellDishId_fkey";

-- DropForeignKey
ALTER TABLE "DishVariant" DROP CONSTRAINT "DishVariant_dishId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_tableId_fkey";

-- DropForeignKey
ALTER TABLE "Staff" DROP CONSTRAINT "Staff_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "Zone" DROP CONSTRAINT "Zone_restaurantId_fkey";

-- AlterTable
ALTER TABLE "ComboDish" DROP COLUMN "name",
DROP COLUMN "price";

-- AlterTable
ALTER TABLE "DiningTable" DROP COLUMN "zoneId",
ADD COLUMN     "zone" TEXT;

-- AlterTable
ALTER TABLE "Dish" DROP COLUMN "allergens",
DROP COLUMN "tags",
DROP COLUMN "taxRate";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "waiterId" INTEGER,
ALTER COLUMN "totalAmount" SET DEFAULT 0.0;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "building" TEXT,
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "telegram" TEXT,
ADD COLUMN     "tiktok" TEXT,
ADD COLUMN     "workDays" TEXT[] DEFAULT ARRAY['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']::TEXT[],
ADD COLUMN     "workHoursEnd" TEXT DEFAULT '22:00',
ADD COLUMN     "workHoursStart" TEXT DEFAULT '10:00';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "pinCode" TEXT,
ADD COLUMN     "restaurantId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "role" SET DEFAULT 'STAFF';

-- DropTable
DROP TABLE "DishUpsell";

-- DropTable
DROP TABLE "DishVariant";

-- DropTable
DROP TABLE "Staff";

-- DropTable
DROP TABLE "Zone";

-- CreateTable
CREATE TABLE "_DishAllergenLookup" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_DishAllergenLookup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DishTagLookup" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_DishTagLookup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DishAllergenLookup_B_index" ON "_DishAllergenLookup"("B");

-- CreateIndex
CREATE INDEX "_DishTagLookup_B_index" ON "_DishTagLookup"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DiningTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DishAllergenLookup" ADD CONSTRAINT "_DishAllergenLookup_A_fkey" FOREIGN KEY ("A") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DishAllergenLookup" ADD CONSTRAINT "_DishAllergenLookup_B_fkey" FOREIGN KEY ("B") REFERENCES "DishAllergenLookup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DishTagLookup" ADD CONSTRAINT "_DishTagLookup_A_fkey" FOREIGN KEY ("A") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DishTagLookup" ADD CONSTRAINT "_DishTagLookup_B_fkey" FOREIGN KEY ("B") REFERENCES "DishTagLookup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
