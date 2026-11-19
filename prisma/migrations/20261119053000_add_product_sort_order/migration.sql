ALTER TABLE "Product"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 9999;

WITH ranked_products AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      ORDER BY "createdAt" DESC, "id" ASC
    ) AS position
  FROM "Product"
)
UPDATE "Product" AS product
SET "sortOrder" = ranked_products.position
FROM ranked_products
WHERE product."id" = ranked_products."id";

CREATE INDEX "Product_status_sortOrder_createdAt_idx"
ON "Product"("status", "sortOrder", "createdAt");
