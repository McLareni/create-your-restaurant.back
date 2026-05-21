-- CreateEnum
CREATE TYPE "ComboPriceType" AS ENUM ('FIXED', 'DISCOUNT');

-- CreateTable
CREATE TABLE "Combo" (
    "id" TEXT NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "priceType" "ComboPriceType" NOT NULL,
    "priceValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Combo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboDish" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ComboDish_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Combo" ADD CONSTRAINT "Combo_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboDish" ADD CONSTRAINT "ComboDish_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboDish" ADD CONSTRAINT "ComboDish_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
