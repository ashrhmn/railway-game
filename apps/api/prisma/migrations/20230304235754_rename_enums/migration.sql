/*
  Warnings:

  - The values [STARTED] on the enum `GameStatus` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `name` on table `games` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "GameStatus_new" AS ENUM ('WAITING', 'RUNNING', 'FINISHED');
ALTER TABLE "games" ALTER COLUMN "status" TYPE "GameStatus_new" USING ("status"::text::"GameStatus_new");
ALTER TYPE "GameStatus" RENAME TO "GameStatus_old";
ALTER TYPE "GameStatus_new" RENAME TO "GameStatus";
DROP TYPE "GameStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "games" ALTER COLUMN "name" SET NOT NULL;
