CREATE TYPE "LoanSettlementReviewStatus" AS ENUM (
  'reviewed',
  'needs_correction',
  'corrected',
  'disputed'
);

CREATE TABLE "loan_settlement_reviews" (
  "id" UUID NOT NULL,
  "loan_id" UUID NOT NULL,
  "review_status" "LoanSettlementReviewStatus" NOT NULL,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "loan_settlement_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "loan_settlement_reviews_loan_id_created_at_idx"
  ON "loan_settlement_reviews"("loan_id", "created_at");

CREATE INDEX "loan_settlement_reviews_review_status_idx"
  ON "loan_settlement_reviews"("review_status");

CREATE INDEX "loan_settlement_reviews_created_by_id_idx"
  ON "loan_settlement_reviews"("created_by_id");

ALTER TABLE "loan_settlement_reviews"
  ADD CONSTRAINT "loan_settlement_reviews_loan_id_fkey"
  FOREIGN KEY ("loan_id") REFERENCES "transactions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "loan_settlement_reviews"
  ADD CONSTRAINT "loan_settlement_reviews_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
