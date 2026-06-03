CREATE TYPE "TransactionAuditAction" AS ENUM ('updated', 'voided');

ALTER TABLE "transactions"
  ADD COLUMN "voided_at" TIMESTAMPTZ(6),
  ADD COLUMN "voided_by_id" UUID,
  ADD COLUMN "void_reason" TEXT;

CREATE INDEX "transactions_voided_at_idx" ON "transactions"("voided_at");
CREATE INDEX "transactions_voided_by_id_idx" ON "transactions"("voided_by_id");

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_voided_by_id_fkey"
  FOREIGN KEY ("voided_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "transaction_audit_events" (
  "id" UUID NOT NULL,
  "transaction_id" UUID NOT NULL,
  "action" "TransactionAuditAction" NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB,
  "reason" TEXT NOT NULL,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "transaction_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "transaction_audit_events_transaction_id_created_at_idx"
  ON "transaction_audit_events"("transaction_id", "created_at");

CREATE INDEX "transaction_audit_events_action_idx"
  ON "transaction_audit_events"("action");

CREATE INDEX "transaction_audit_events_created_by_id_idx"
  ON "transaction_audit_events"("created_by_id");

ALTER TABLE "transaction_audit_events"
  ADD CONSTRAINT "transaction_audit_events_transaction_id_fkey"
  FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction_audit_events"
  ADD CONSTRAINT "transaction_audit_events_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
