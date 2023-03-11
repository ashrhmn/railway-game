/*
  Warnings:

  - You are about to drop the column `value` on the `settings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[key]` on the table `settings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `value_type` to the `settings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SettingsValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN');

-- AlterTable
ALTER TABLE "settings" DROP COLUMN "value",
ADD COLUMN     "bool_value" BOOLEAN,
ADD COLUMN     "num_value" DOUBLE PRECISION,
ADD COLUMN     "str_value" TEXT,
ADD COLUMN     "value_type" "SettingsValueType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");
