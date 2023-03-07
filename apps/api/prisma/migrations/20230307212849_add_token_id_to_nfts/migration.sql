/*
  Warnings:

  - A unique constraint covering the columns `[tokenId,game_id]` on the table `nfts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tokenId` to the `nfts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "nfts" ADD COLUMN     "tokenId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "nfts_tokenId_game_id_key" ON "nfts"("tokenId", "game_id");
