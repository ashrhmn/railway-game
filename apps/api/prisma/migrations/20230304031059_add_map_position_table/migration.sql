-- CreateTable
CREATE TABLE "map_positions" (
    "id" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MapPositionToNFT" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_MapPositionToNFT_AB_unique" ON "_MapPositionToNFT"("A", "B");

-- CreateIndex
CREATE INDEX "_MapPositionToNFT_B_index" ON "_MapPositionToNFT"("B");

-- AddForeignKey
ALTER TABLE "_MapPositionToNFT" ADD CONSTRAINT "_MapPositionToNFT_A_fkey" FOREIGN KEY ("A") REFERENCES "map_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MapPositionToNFT" ADD CONSTRAINT "_MapPositionToNFT_B_fkey" FOREIGN KEY ("B") REFERENCES "nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
