-- AlterTable
ALTER TABLE "map_positions" ADD COLUMN     "enemyId" TEXT;

-- CreateTable
CREATE TABLE "enemies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strength" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enemies_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "map_positions" ADD CONSTRAINT "map_positions_enemyId_fkey" FOREIGN KEY ("enemyId") REFERENCES "enemies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
