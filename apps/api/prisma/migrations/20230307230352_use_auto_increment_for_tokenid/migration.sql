/*
  Warnings:

  - You are about to drop the column `tokenId` on the `nfts` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[token_id,game_id]` on the table `nfts` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "nfts_tokenId_game_id_key";

-- AlterTable
ALTER TABLE "nfts" DROP COLUMN "tokenId",
ADD COLUMN     "token_id" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "nfts_token_id_game_id_key" ON "nfts"("token_id", "game_id");
