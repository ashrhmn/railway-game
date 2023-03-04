-- CreateEnum
CREATE TYPE "ROLE" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "role" "ROLE"[] DEFAULT ARRAY[]::"ROLE"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nft_metadata" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nft_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_NFTToNFTMetadata" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "_NFTToNFTMetadata_AB_unique" ON "_NFTToNFTMetadata"("A", "B");

-- CreateIndex
CREATE INDEX "_NFTToNFTMetadata_B_index" ON "_NFTToNFTMetadata"("B");

-- AddForeignKey
ALTER TABLE "_NFTToNFTMetadata" ADD CONSTRAINT "_NFTToNFTMetadata_A_fkey" FOREIGN KEY ("A") REFERENCES "nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NFTToNFTMetadata" ADD CONSTRAINT "_NFTToNFTMetadata_B_fkey" FOREIGN KEY ("B") REFERENCES "nft_metadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;
