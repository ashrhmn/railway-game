-- AlterTable
ALTER TABLE "map_positions" ADD COLUMN     "bridge_constructed_on" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "title" TEXT;
