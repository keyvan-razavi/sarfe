CREATE TYPE "OrderStatus" AS ENUM ('RESERVED', 'EXPIRED', 'CANCELED');

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "idempotencyKey" VARCHAR(128) NOT NULL,
  "requestFingerprint" VARCHAR(64) NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'RESERVED',
  "customerSnapshot" JSONB NOT NULL,
  "addressSnapshot" JSONB NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "subtotalMinor" BIGINT NOT NULL,
  "shippingMinor" BIGINT NOT NULL,
  "taxMinor" BIGINT NOT NULL,
  "totalMinor" BIGINT NOT NULL,
  "shippingPolicy" VARCHAR(100) NOT NULL,
  "taxPolicy" VARCHAR(100) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Order_amounts_nonnegative" CHECK ("subtotalMinor" >= 0 AND "shippingMinor" >= 0 AND "taxMinor" >= 0 AND "totalMinor" >= 0),
  CONSTRAINT "Order_total_matches_components" CHECK ("totalMinor"::BIGINT = "subtotalMinor"::BIGINT + "shippingMinor"::BIGINT + "taxMinor"::BIGINT)
);
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX "Order_status_expiresAt_idx" ON "Order"("status", "expiresAt");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

CREATE TABLE "OrderLine" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "variantId" TEXT,
  "productNameSnapshot" TEXT NOT NULL,
  "variantNameSnapshot" TEXT NOT NULL,
  "skuSnapshot" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reservedRemaining" INTEGER NOT NULL,
  "unitPriceMinor" INTEGER NOT NULL,
  "lineTotalMinor" BIGINT NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderLine_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "OrderLine_reserved_range" CHECK ("reservedRemaining" >= 0 AND "reservedRemaining" <= "quantity"),
  CONSTRAINT "OrderLine_amounts_nonnegative" CHECK ("unitPriceMinor" >= 0 AND "lineTotalMinor" >= 0),
  CONSTRAINT "OrderLine_line_total_matches" CHECK ("lineTotalMinor"::BIGINT = "unitPriceMinor"::BIGINT * "quantity")
);
CREATE INDEX "OrderLine_variantId_orderId_idx" ON "OrderLine"("variantId", "orderId");
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
