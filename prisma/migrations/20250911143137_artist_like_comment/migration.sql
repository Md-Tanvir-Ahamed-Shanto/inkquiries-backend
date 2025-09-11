/*
  Warnings:

  - A unique constraint covering the columns `[artistId,reviewId]` on the table `review_likes` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."ReviewComment" ADD COLUMN     "artistId" TEXT;

-- AlterTable
ALTER TABLE "public"."review_likes" ADD COLUMN     "artistId" TEXT,
ALTER COLUMN "clientId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "review_likes_artistId_idx" ON "public"."review_likes"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "review_likes_artistId_reviewId_key" ON "public"."review_likes"("artistId", "reviewId");

-- AddForeignKey
ALTER TABLE "public"."ReviewComment" ADD CONSTRAINT "ReviewComment_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_likes" ADD CONSTRAINT "review_likes_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
