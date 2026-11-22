CREATE TYPE "MockPaymentOutcome" AS ENUM ('APPROVED', 'DECLINED');

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "attemptKey" VARCHAR(128) NOT NULL,
  "outcome" "MockPaymentOutcome" NOT NULL,
  "amountMinor" BIGINT NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentAttempt_amount_nonnegative" CHECK ("amountMinor" >= 0)
);

CREATE UNIQUE INDEX "PaymentAttempt_attemptKey_key" ON "PaymentAttempt"("attemptKey");
CREATE INDEX "PaymentAttempt_orderId_createdAt_idx" ON "PaymentAttempt"("orderId", "createdAt");
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
