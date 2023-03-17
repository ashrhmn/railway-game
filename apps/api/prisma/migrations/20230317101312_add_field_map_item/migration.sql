-- AlterEnum
ALTER TYPE "MAP_ITEMS" ADD VALUE 'FIELD';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MAP_ITEM_VARIANT" ADD VALUE 'FIELD_1';
ALTER TYPE "MAP_ITEM_VARIANT" ADD VALUE 'FIELD_2';
ALTER TYPE "MAP_ITEM_VARIANT" ADD VALUE 'FIELD_3';
ALTER TYPE "MAP_ITEM_VARIANT" ADD VALUE 'FIELD_4';
ALTER TYPE "MAP_ITEM_VARIANT" ADD VALUE 'FIELD_5';
