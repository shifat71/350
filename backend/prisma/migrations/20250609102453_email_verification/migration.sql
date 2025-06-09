/*
  Warnings:

  - A unique constraint covering the columns `[emailVerificationToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerificationExpiry" TIMESTAMP(3),
ADD COLUMN     "emailVerificationToken" TEXT,
ADD COLUMN     "isEmailVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "users_emailVerificationToken_key" ON "users"("emailVerificationToken");
