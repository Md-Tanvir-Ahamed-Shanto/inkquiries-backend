/*
  Warnings:

  - Added the required column `type` to the `review_reports` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."review_reports" ADD COLUMN     "type" TEXT NOT NULL;
