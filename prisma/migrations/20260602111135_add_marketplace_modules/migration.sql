-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "activeModules" TEXT[] DEFAULT ARRAY['menu-engine', 'qr-tables', 'staff']::TEXT[],
ADD COLUMN     "purchasedModules" TEXT[] DEFAULT ARRAY['menu-engine', 'qr-tables', 'staff']::TEXT[];
