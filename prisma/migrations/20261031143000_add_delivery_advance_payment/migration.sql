CREATE TABLE "DeliveryAdvancePayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'BKASH',
    "providerPaymentId" TEXT,
    "trxId" TEXT,
    "safePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryAdvancePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryAdvancePayment_providerPaymentId_key"
ON "DeliveryAdvancePayment"("providerPaymentId");

CREATE UNIQUE INDEX "DeliveryAdvancePayment_trxId_key"
ON "DeliveryAdvancePayment"("trxId");

CREATE INDEX "DeliveryAdvancePayment_orderId_createdAt_idx"
ON "DeliveryAdvancePayment"("orderId", "createdAt");

CREATE INDEX "DeliveryAdvancePayment_status_createdAt_idx"
ON "DeliveryAdvancePayment"("status", "createdAt");

ALTER TABLE "DeliveryAdvancePayment"
ADD CONSTRAINT "DeliveryAdvancePayment_orderId_fkey"
FOREIGN KEY ("orderId")
REFERENCES "Order"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;