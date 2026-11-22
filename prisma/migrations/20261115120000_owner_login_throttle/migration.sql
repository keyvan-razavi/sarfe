CREATE TABLE "OwnerLoginThrottle" (
  "id" TEXT NOT NULL DEFAULT 'owner',
  "failures" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnerLoginThrottle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OwnerLoginThrottle_failures_nonnegative" CHECK ("failures" >= 0)
);
