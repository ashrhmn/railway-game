/*
  Warnings:

  - Added the required column `game_id` to the `nfts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "nfts" ADD COLUMN     "game_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "nfts" ADD CONSTRAINT "nfts_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
