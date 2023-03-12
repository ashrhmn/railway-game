/*
  Warnings:

  - Added the required column `direction` to the `rail_positions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RAIL_DIRECTION" AS ENUM ('LEFT', 'RIGHT', 'UP', 'DOWN');

-- AlterTable
ALTER TABLE "rail_positions" ADD COLUMN     "direction" "RAIL_DIRECTION" NOT NULL;
