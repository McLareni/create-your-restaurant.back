-- CreateTable
CREATE TABLE "InventoryItemState" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItemState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryItemState_inventoryItemId_recordedAt_idx"
ON "InventoryItemState"("inventoryItemId", "recordedAt");

-- AddForeignKey
ALTER TABLE "InventoryItemState"
ADD CONSTRAINT "InventoryItemState_inventoryItemId_fkey"
FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItemState"
ADD CONSTRAINT "InventoryItemState_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed initial inventory states for existing items
INSERT INTO "InventoryItemState" ("id", "inventoryItemId", "quantity", "recordedAt", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || i."id")::uuid::text, i."id", i."stock", NOW(), NOW(), NOW()
FROM "InventoryItem" i;
