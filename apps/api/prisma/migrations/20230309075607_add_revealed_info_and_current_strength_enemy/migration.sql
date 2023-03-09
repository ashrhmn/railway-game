/*
  Warnings:

  - You are about to drop the `nft_metadata` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `current_strength` to the `enemies` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "enemies" ADD COLUMN     "current_strength" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "map_positions" ADD COLUMN     "is_revealed" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "nft_metadata";
