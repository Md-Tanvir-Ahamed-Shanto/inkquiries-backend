-- CreateIndex
CREATE INDEX "review_likes_clientId_idx" ON "public"."review_likes"("clientId");

-- CreateIndex
CREATE INDEX "review_likes_reviewId_idx" ON "public"."review_likes"("reviewId");
