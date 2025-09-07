-- CreateTable
CREATE TABLE "public"."portfolio_likes" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "portfolioImageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolio_likes_clientId_idx" ON "public"."portfolio_likes"("clientId");

-- CreateIndex
CREATE INDEX "portfolio_likes_portfolioImageId_idx" ON "public"."portfolio_likes"("portfolioImageId");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_likes_clientId_portfolioImageId_key" ON "public"."portfolio_likes"("clientId", "portfolioImageId");

-- AddForeignKey
ALTER TABLE "public"."portfolio_likes" ADD CONSTRAINT "portfolio_likes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."portfolio_likes" ADD CONSTRAINT "portfolio_likes_portfolioImageId_fkey" FOREIGN KEY ("portfolioImageId") REFERENCES "public"."PortfolioImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
