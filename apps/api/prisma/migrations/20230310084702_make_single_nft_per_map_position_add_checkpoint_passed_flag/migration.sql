/*
  Warnings:

  - You are about to drop the column `current` on the `map_positions` table. All the data in the column will be lost.
  - You are about to drop the `_MapPositionToNft` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_MapPositionToNft" DROP CONSTRAINT "_MapPositionToNft_A_fkey";

-- DropForeignKey
ALTER TABLE "_MapPositionToNft" DROP CONSTRAINT "_MapPositionToNft_B_fkey";

-- AlterTable
ALTER TABLE "map_positions" DROP COLUMN "current",
ADD COLUMN     "checkPointPassed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nftId" TEXT;

-- DropTable
DROP TABLE "_MapPositionToNft";

-- AddForeignKey
ALTER TABLE "map_positions" ADD CONSTRAINT "map_positions_nftId_fkey" FOREIGN KEY ("nftId") REFERENCES "nfts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
