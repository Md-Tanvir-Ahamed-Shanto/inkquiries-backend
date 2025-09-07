-- AlterTable
ALTER TABLE "public"."artists" ADD COLUMN     "resetPasswordToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."clients" ADD COLUMN     "resetPasswordToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);
