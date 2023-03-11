-- DropForeignKey
ALTER TABLE "rail_positions" DROP CONSTRAINT "rail_positions_game_id_fkey";

-- AlterTable
ALTER TABLE "rail_positions" ALTER COLUMN "x" SET DEFAULT 14,
ALTER COLUMN "y" SET DEFAULT 14;

-- AddForeignKey
ALTER TABLE "rail_positions" ADD CONSTRAINT "rail_positions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
