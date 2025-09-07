-- AlterTable
ALTER TABLE "public"."artists" ADD COLUMN     "about" TEXT,
ADD COLUMN     "personalVibe" JSONB;

-- CreateTable
CREATE TABLE "public"."GallaryImage" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "imageUrls" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GallaryImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."GallaryImage" ADD CONSTRAINT "GallaryImage_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
