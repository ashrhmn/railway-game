/*
  Warnings:

  - Changed the type of `status` on the `games` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "GAME_STATUS" AS ENUM ('WAITING', 'RUNNING', 'FINISHED');

-- AlterTable
ALTER TABLE "games" DROP COLUMN "status",
ADD COLUMN     "status" "GAME_STATUS" NOT NULL;

-- DropEnum
DROP TYPE "GameStatus";
