-- AlterTable
ALTER TABLE "public"."admins" ADD COLUMN     "resetPasswordToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);
