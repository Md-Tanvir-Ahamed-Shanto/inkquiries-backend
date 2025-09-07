-- DropForeignKey
ALTER TABLE "public"."ReviewReport" DROP CONSTRAINT "ReviewReport_reporterId_fkey";

-- AlterTable
ALTER TABLE "public"."admins" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'admin';

-- AlterTable
ALTER TABLE "public"."artists" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'artist';

-- AlterTable
ALTER TABLE "public"."clients" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'client';

-- AddForeignKey
ALTER TABLE "public"."ReviewReport" ADD CONSTRAINT "ReviewReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "public"."artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
