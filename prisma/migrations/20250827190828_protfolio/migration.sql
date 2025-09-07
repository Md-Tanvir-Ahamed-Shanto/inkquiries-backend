/*
  Warnings:

  - You are about to drop the column `caption` on the `PortfolioImage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."PortfolioImage" DROP COLUMN "caption",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "style" TEXT,
ADD COLUMN     "title" TEXT;
