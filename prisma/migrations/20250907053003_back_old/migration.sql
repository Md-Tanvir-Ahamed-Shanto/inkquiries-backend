/*
  Warnings:

  - You are about to drop the column `artistId` on the `ReviewComment` table. All the data in the column will be lost.
  - You are about to drop the column `artistId` on the `review_likes` table. All the data in the column will be lost.
  - Made the column `clientId` on table `review_likes` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."ReviewComment" DROP CONSTRAINT "ReviewComment_artistId_fkey";

-- DropForeignKey
ALTER TABLE "public"."review_likes" DROP CONSTRAINT "review_likes_artistId_fkey";

-- DropIndex
DROP INDEX "public"."review_likes_artistId_idx";

-- DropIndex
DROP INDEX "public"."review_likes_artistId_reviewId_key";

-- AlterTable
ALTER TABLE "public"."ReviewComment" DROP COLUMN "artistId";

-- AlterTable
ALTER TABLE "public"."review_likes" DROP COLUMN "artistId",
ALTER COLUMN "clientId" SET NOT NULL;
