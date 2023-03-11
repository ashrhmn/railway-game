/*
  Warnings:

  - A unique constraint covering the columns `[color,game_id]` on the table `rail_positions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "rail_positions_x_y_color_game_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "rail_positions_color_game_id_key" ON "rail_positions"("color", "game_id");
