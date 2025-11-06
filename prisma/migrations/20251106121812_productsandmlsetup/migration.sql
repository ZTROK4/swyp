/*
  Warnings:

  - You are about to drop the column `dob` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userCode` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('view', 'add_to_cart', 'purchase');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "dob",
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "avgPriceMax" DOUBLE PRECISION,
ADD COLUMN     "avgPriceMin" DOUBLE PRECISION,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "preferredCategories" TEXT[],
ADD COLUMN     "signupDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "totalPurchases" INTEGER DEFAULT 0,
ADD COLUMN     "totalViews" INTEGER DEFAULT 0,
ADD COLUMN     "userCode" TEXT NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "productCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "badge" TEXT,
    "description" TEXT,
    "composition" TEXT,
    "shippingInfo" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "stockAvailable" INTEGER NOT NULL DEFAULT 0,
    "sizingAvailability" TEXT,
    "sizeChartUrl" TEXT,
    "color" TEXT,
    "specs" TEXT,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "brand" TEXT,
    "tags" TEXT[],
    "averageRating" DOUBLE PRECISION DEFAULT 0,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "purchaseCount" INTEGER NOT NULL DEFAULT 0,
    "addedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "displayOrder" INTEGER,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "eventType" "EventType" NOT NULL,
    "sessionId" TEXT,
    "durationSec" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" DOUBLE PRECISION,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_productCode_key" ON "Product"("productCode");

-- CreateIndex
CREATE INDEX "Interaction_userId_idx" ON "Interaction"("userId");

-- CreateIndex
CREATE INDEX "Interaction_productId_idx" ON "Interaction"("productId");

-- CreateIndex
CREATE INDEX "Interaction_eventType_idx" ON "Interaction"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "User_userCode_key" ON "User"("userCode");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
