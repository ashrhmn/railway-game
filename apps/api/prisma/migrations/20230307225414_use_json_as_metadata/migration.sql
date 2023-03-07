/*
  Warnings:

  - You are about to drop the `_NFTMetadataToNft` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_NFTMetadataToNft" DROP CONSTRAINT "_NFTMetadataToNft_A_fkey";

-- DropForeignKey
ALTER TABLE "_NFTMetadataToNft" DROP CONSTRAINT "_NFTMetadataToNft_B_fkey";

-- AlterTable
ALTER TABLE "nfts" ADD COLUMN     "metadata" JSONB[];

-- DropTable
DROP TABLE "_NFTMetadataToNft";
