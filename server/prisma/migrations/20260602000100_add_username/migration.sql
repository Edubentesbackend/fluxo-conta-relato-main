-- Add username column to users table
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Backfill existing users: use email prefix as username
UPDATE "users" SET "username" = split_part(email, '@', 1) WHERE "username" IS NULL;

-- Make column required and unique
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
