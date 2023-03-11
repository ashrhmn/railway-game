/*
  Warnings:

  - Made the column `frozen_till` on table `nfts` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "nfts" ALTER COLUMN "frozen_till" SET NOT NULL,
ALTER COLUMN "frozen_till" SET DEFAULT 0;
