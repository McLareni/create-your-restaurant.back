-- CreateEnum
CREATE TYPE "EnumLanguage" AS ENUM ('EN', 'FR', 'ES', 'DE', 'IT', 'RU', 'CN', 'JP', 'PL', 'UA');

-- CreateEnum
CREATE TYPE "EnumCurrency" AS ENUM ('USD', 'EUR', 'GBP', 'JPY', 'CNY', 'RUB', 'PLN', 'UAH');

-- CreateEnum
CREATE TYPE "EnumTypeRestaurant" AS ENUM ('FAST_FOOD', 'CASUAL_DINING', 'FINE_DINING', 'CAFE', 'BUFFET', 'FOOD_TRUCK');

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "EnumTypeRestaurant" NOT NULL,
    "currency" "EnumCurrency" NOT NULL,
    "phoneNumber" TEXT,
    "city" TEXT,
    "language" "EnumLanguage" NOT NULL,
    "ownerId" INTEGER NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
