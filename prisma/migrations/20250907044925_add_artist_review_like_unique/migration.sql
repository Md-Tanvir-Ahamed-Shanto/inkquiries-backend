/*
  Warnings:

  - A unique constraint covering the columns `[artistId,reviewId]` on the table `review_likes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "review_likes_artistId_idx" ON "public"."review_likes"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "review_likes_artistId_reviewId_key" ON "public"."review_likes"("artistId", "reviewId");
