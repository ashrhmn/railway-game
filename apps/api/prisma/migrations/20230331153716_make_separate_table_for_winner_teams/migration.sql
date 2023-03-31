/*
  Warnings:

  - You are about to drop the column `winnerTeam` on the `games` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "games" DROP COLUMN "winnerTeam";

-- CreateTable
CREATE TABLE "winner_teams" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "color" "COLOR" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "winner_teams_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "winner_teams" ADD CONSTRAINT "winner_teams_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
