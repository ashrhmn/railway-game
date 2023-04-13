-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MAP_ITEM_VARIANT" ADD VALUE 'FIELD_6';
ALTER TYPE "MAP_ITEM_VARIANT" ADD VALUE 'FIELD_7';
ALTER TYPE "MAP_ITEM_VARIANT" ADD VALUE 'FIELD_8';
ALTER TYPE "MAP_ITEM_VARIANT" ADD VALUE 'FIELD_9';
ALTER TYPE "MAP_ITEM_VARIANT" ADD VALUE 'FIELD_10';
