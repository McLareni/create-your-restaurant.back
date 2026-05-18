-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('NONE', 'NEW', 'HIT', 'CHEF_CHOICE', 'TOP_RATED');

-- CreateTable
CREATE TABLE "ImageDish" (
    "id" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,

    CONSTRAINT "ImageDish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dish" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION,
    "cookingTime" INTEGER,
    "calories" INTEGER,
    "isVegan" BOOLEAN NOT NULL DEFAULT false,
    "isSpicy" BOOLEAN NOT NULL DEFAULT false,
    "isLactoseFree" BOOLEAN NOT NULL DEFAULT false,
    "badge" "BadgeType" NOT NULL DEFAULT 'NONE',
    "allergens" TEXT[],
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Dish_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ImageDish" ADD CONSTRAINT "ImageDish_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageDish" ADD CONSTRAINT "ImageDish_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dish" ADD CONSTRAINT "Dish_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
