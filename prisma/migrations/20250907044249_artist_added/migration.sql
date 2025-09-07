-- AlterTable
ALTER TABLE "public"."ReviewComment" ADD COLUMN     "artistId" TEXT;

-- AlterTable
ALTER TABLE "public"."review_likes" ADD COLUMN     "artistId" TEXT,
ALTER COLUMN "clientId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."ReviewComment" ADD CONSTRAINT "ReviewComment_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_likes" ADD CONSTRAINT "review_likes_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
