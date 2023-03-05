/*
  Warnings:

  - The values [ENEMY] on the enum `MAP_ITEMS` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MAP_ITEMS_new" AS ENUM ('MOUNTAIN', 'RIVER', 'CHECKPOINT');
ALTER TABLE "map_positions" ALTER COLUMN "map_item" TYPE "MAP_ITEMS_new" USING ("map_item"::text::"MAP_ITEMS_new");
ALTER TYPE "MAP_ITEMS" RENAME TO "MAP_ITEMS_old";
ALTER TYPE "MAP_ITEMS_new" RENAME TO "MAP_ITEMS";
DROP TYPE "MAP_ITEMS_old";
COMMIT;
