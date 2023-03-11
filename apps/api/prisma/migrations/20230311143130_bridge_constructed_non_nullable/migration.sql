/*
  Warnings:

  - Made the column `bridge_constructed_on` on table `map_positions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "map_positions" ALTER COLUMN "bridge_constructed_on" SET NOT NULL;
