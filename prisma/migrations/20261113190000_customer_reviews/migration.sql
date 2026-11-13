-- Extend existing Review records into a moderated storefront review system.

ALTER TABLE "Review"
  ALTER COLUMN "productId" DROP NOT NULL,
  ADD COLUMN "orderId" TEXT,
  ADD COLUMN "customerEmail" TEXT,
  ADD COLUMN "customerPhone" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'WEBSITE',
  ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "verifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Review"
SET "status" = CASE
  WHEN "approved" = true THEN 'APPROVED'
  ELSE 'PENDING'
END;

ALTER TABLE "Review"
  DROP CONSTRAINT IF EXISTS "Review_productId_fkey";

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_productId_fkey"
  FOREIGN KEY ("productId")
  REFERENCES "Product"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_orderId_fkey"
  FOREIGN KEY ("orderId")
  REFERENCES "Order"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE TABLE "ReviewImage" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "publicId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReviewImage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ReviewImage"
  ADD CONSTRAINT "ReviewImage_reviewId_fkey"
  FOREIGN KEY ("reviewId")
  REFERENCES "Review"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

CREATE INDEX "Review_status_featured_sortOrder_createdAt_idx"
  ON "Review"("status", "featured", "sortOrder", "createdAt");

CREATE INDEX "Review_productId_status_createdAt_idx"
  ON "Review"("productId", "status", "createdAt");

CREATE INDEX "Review_orderId_idx"
  ON "Review"("orderId");

CREATE INDEX "ReviewImage_reviewId_sortOrder_idx"
  ON "ReviewImage"("reviewId", "sortOrder");
