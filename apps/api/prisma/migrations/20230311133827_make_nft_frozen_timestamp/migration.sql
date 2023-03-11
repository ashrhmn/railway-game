/*
  Warnings:

  - You are about to drop the column `isFrozen` on the `nfts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "nfts" DROP COLUMN "isFrozen",
ADD COLUMN     "frozen_till" INTEGER;
