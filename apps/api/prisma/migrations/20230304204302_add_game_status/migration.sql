/*
  Warnings:

  - Added the required column `status` to the `games` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'STARTED', 'FINISHED');

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "name" TEXT,
ADD COLUMN     "status" "GameStatus" NOT NULL;
