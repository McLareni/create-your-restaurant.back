/*
  Warnings:

  - The `weight` column on the `Dish` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `cookingTime` column on the `Dish` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `calories` column on the `Dish` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Dish" ADD COLUMN     "isLactoseFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSpicy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVegan" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "weight",
ADD COLUMN     "weight" DOUBLE PRECISION,
DROP COLUMN "cookingTime",
ADD COLUMN     "cookingTime" INTEGER,
DROP COLUMN "calories",
ADD COLUMN     "calories" INTEGER;
