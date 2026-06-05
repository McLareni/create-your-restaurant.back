-- CreateTable
CREATE TABLE "PosIntegration" (
    "id" TEXT NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'POSTER',
    "apiKey" TEXT NOT NULL,
    "importMenu" BOOLEAN NOT NULL DEFAULT true,
    "syncStops" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosIntegration_restaurantId_key" ON "PosIntegration"("restaurantId");

-- AddForeignKey
ALTER TABLE "PosIntegration" ADD CONSTRAINT "PosIntegration_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
