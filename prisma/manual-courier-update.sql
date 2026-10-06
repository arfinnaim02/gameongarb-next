ALTER TABLE "CourierShipment"
ADD COLUMN IF NOT EXISTS "trackingUrl" TEXT;

ALTER TABLE "CourierShipment"
ADD COLUMN IF NOT EXISTS "codAmount" DECIMAL(12,2);

ALTER TABLE "CourierShipment"
ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "CourierShipment_trackingId_key"
ON "CourierShipment"("trackingId");

CREATE INDEX IF NOT EXISTS "CourierShipment_provider_status_idx"
ON "CourierShipment"("provider", "status");

CREATE INDEX IF NOT EXISTS "CourierShipment_trackingId_idx"
ON "CourierShipment"("trackingId");

CREATE TABLE IF NOT EXISTS "CourierTrackingEvent" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "status" TEXT,
  "message" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'API',
  "externalAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CourierTrackingEvent_pkey"
  PRIMARY KEY ("id"),

  CONSTRAINT "CourierTrackingEvent_shipmentId_fkey"
  FOREIGN KEY ("shipmentId")
  REFERENCES "CourierShipment"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CourierTrackingEvent_shipmentId_createdAt_idx"
ON "CourierTrackingEvent"("shipmentId", "createdAt");