/*
  Warnings:

  - You are about to drop the column `metadata` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the `notification_preferences` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "public"."notifications" DROP COLUMN "metadata",
ALTER COLUMN "type" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."notification_preferences";

-- CreateTable
CREATE TABLE "public"."social_links" (
    "id" TEXT NOT NULL,
    "logo" TEXT,
    "facebook" TEXT,
    "twitter" TEXT,
    "instagram" TEXT,
    "linkedin" TEXT,
    "youtube" TEXT,

    CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);
