/*
  Warnings:

  - You are about to drop the `_MapPositionToNFT` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_NFTToNFTMetadata` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `color` to the `map_positions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `game_id` to the `map_positions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `color` to the `nfts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `job` to the `nfts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "COLOR" AS ENUM ('RED', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'PURPLE', 'PINK', 'BROWN', 'WHITE', 'BLACK');

-- CreateEnum
CREATE TYPE "NFT_JOB" AS ENUM ('RAIL_2_6', 'RAIL_2_4', 'RAIL_6_8', 'RAIL_4_8', 'RAIL_2_8', 'RAIL_4_6', 'RAIL_2_4_6_8', 'BRIDGE', 'KNIGHT', 'LIGHT');

-- CreateEnum
CREATE TYPE "MAP_ITEMS" AS ENUM ('MOUNTAIN', 'RIVER', 'CHECKPOINT', 'ENEMY');

-- DropForeignKey
ALTER TABLE "_MapPositionToNFT" DROP CONSTRAINT "_MapPositionToNFT_A_fkey";

-- DropForeignKey
ALTER TABLE "_MapPositionToNFT" DROP CONSTRAINT "_MapPositionToNFT_B_fkey";

-- DropForeignKey
ALTER TABLE "_NFTToNFTMetadata" DROP CONSTRAINT "_NFTToNFTMetadata_A_fkey";

-- DropForeignKey
ALTER TABLE "_NFTToNFTMetadata" DROP CONSTRAINT "_NFTToNFTMetadata_B_fkey";

-- AlterTable
ALTER TABLE "map_positions" ADD COLUMN     "color" "COLOR" NOT NULL,
ADD COLUMN     "game_id" TEXT NOT NULL,
ADD COLUMN     "map_item" "MAP_ITEMS",
ADD COLUMN     "pre_placed" "NFT_JOB";

-- AlterTable
ALTER TABLE "nfts" ADD COLUMN     "ability_b" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ability_k" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ability_l" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ability_r" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "color" "COLOR" NOT NULL,
ADD COLUMN     "job" "NFT_JOB" NOT NULL,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "_MapPositionToNFT";

-- DropTable
DROP TABLE "_NFTToNFTMetadata";

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings_activities" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_activities" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_NFTMetadataToNft" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_MapPositionToNft" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_NFTMetadataToNft_AB_unique" ON "_NFTMetadataToNft"("A", "B");

-- CreateIndex
CREATE INDEX "_NFTMetadataToNft_B_index" ON "_NFTMetadataToNft"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_MapPositionToNft_AB_unique" ON "_MapPositionToNft"("A", "B");

-- CreateIndex
CREATE INDEX "_MapPositionToNft_B_index" ON "_MapPositionToNft"("B");

-- AddForeignKey
ALTER TABLE "map_positions" ADD CONSTRAINT "map_positions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings_activities" ADD CONSTRAINT "settings_activities_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NFTMetadataToNft" ADD CONSTRAINT "_NFTMetadataToNft_A_fkey" FOREIGN KEY ("A") REFERENCES "nft_metadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NFTMetadataToNft" ADD CONSTRAINT "_NFTMetadataToNft_B_fkey" FOREIGN KEY ("B") REFERENCES "nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MapPositionToNft" ADD CONSTRAINT "_MapPositionToNft_A_fkey" FOREIGN KEY ("A") REFERENCES "map_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MapPositionToNft" ADD CONSTRAINT "_MapPositionToNft_B_fkey" FOREIGN KEY ("B") REFERENCES "nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
