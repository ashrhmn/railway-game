-- CreateEnum
CREATE TYPE "MAP_ITEM_VARIANT" AS ENUM ('RIVER_HORIZONTAL', 'RIVER_VERTICAL', 'RIVER_LEFT_TOP', 'RIVER_LEFT_BOTTOM', 'RIVER_RIGHT_TOP', 'RIVER_RIGHT_BOTTOM', 'MOUNTAIN_1', 'MOUNTAIN_2');

-- AlterTable
ALTER TABLE "map_positions" ADD COLUMN     "map_item_variant" "MAP_ITEM_VARIANT";
