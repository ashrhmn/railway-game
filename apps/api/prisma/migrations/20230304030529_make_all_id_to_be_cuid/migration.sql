/*
  Warnings:

  - The primary key for the `nft_metadata` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `nfts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "_NFTToNFTMetadata" DROP CONSTRAINT "_NFTToNFTMetadata_A_fkey";

-- DropForeignKey
ALTER TABLE "_NFTToNFTMetadata" DROP CONSTRAINT "_NFTToNFTMetadata_B_fkey";

-- AlterTable
ALTER TABLE "_NFTToNFTMetadata" ALTER COLUMN "A" SET DATA TYPE TEXT,
ALTER COLUMN "B" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "nft_metadata" DROP CONSTRAINT "nft_metadata_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "nft_metadata_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "nft_metadata_id_seq";

-- AlterTable
ALTER TABLE "nfts" DROP CONSTRAINT "nfts_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "nfts_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "nfts_id_seq";

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "users_id_seq";

-- AddForeignKey
ALTER TABLE "_NFTToNFTMetadata" ADD CONSTRAINT "_NFTToNFTMetadata_A_fkey" FOREIGN KEY ("A") REFERENCES "nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NFTToNFTMetadata" ADD CONSTRAINT "_NFTToNFTMetadata_B_fkey" FOREIGN KEY ("B") REFERENCES "nft_metadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;
