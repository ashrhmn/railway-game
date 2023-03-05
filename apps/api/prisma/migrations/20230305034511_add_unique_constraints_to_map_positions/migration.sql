/*
  Warnings:

  - A unique constraint covering the columns `[x,y,game_id,color]` on the table `map_positions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "description" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "map_positions_x_y_game_id_color_key" ON "map_positions"("x", "y", "game_id", "color");
