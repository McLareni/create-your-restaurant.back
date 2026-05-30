-- CreateTable
CREATE TABLE "DishTagLookup" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DishTagLookup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DishAllergenLookup" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DishAllergenLookup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DishTagLookup_restaurantId_name_key" ON "DishTagLookup"("restaurantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "DishAllergenLookup_restaurantId_name_key" ON "DishAllergenLookup"("restaurantId", "name");

-- AddForeignKey
ALTER TABLE "DishTagLookup" ADD CONSTRAINT "DishTagLookup_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishAllergenLookup" ADD CONSTRAINT "DishAllergenLookup_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
