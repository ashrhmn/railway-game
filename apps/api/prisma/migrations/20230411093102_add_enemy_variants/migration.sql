/*
  Warnings:

  - Added the required column `variant` to the `enemies` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ENEMY_VARIANT" AS ENUM ('ENEMY_1', 'ENEMY_2', 'ENEMY_3', 'ENEMY_4', 'ENEMY_5');

-- AlterTable
ALTER TABLE "enemies" ADD COLUMN     "variant" "ENEMY_VARIANT" NOT NULL;
