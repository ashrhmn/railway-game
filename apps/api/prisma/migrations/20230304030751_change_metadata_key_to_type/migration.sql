/*
  Warnings:

  - You are about to drop the column `key` on the `nft_metadata` table. All the data in the column will be lost.
  - Added the required column `type` to the `nft_metadata` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "nft_metadata" DROP COLUMN "key",
ADD COLUMN     "type" TEXT NOT NULL;
