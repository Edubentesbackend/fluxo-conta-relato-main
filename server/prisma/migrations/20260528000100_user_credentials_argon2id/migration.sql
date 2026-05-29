ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  hash_algorithm TEXT NOT NULL,
  hash_params JSONB,
  pepper_version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_credentials_user_type_unique UNIQUE (user_id, credential_type)
);

INSERT INTO user_credentials (
  user_id,
  credential_type,
  secret_hash,
  hash_algorithm,
  hash_params,
  pepper_version
)
SELECT
  id,
  'password',
  password_hash,
  'bcrypt',
  '{"legacySource":"users.password_hash"}'::jsonb,
  'legacy'
FROM users
WHERE password_hash IS NOT NULL;

CREATE INDEX user_credentials_type_idx ON user_credentials(credential_type);
CREATE INDEX user_credentials_user_id_idx ON user_credentials(user_id);

CREATE TRIGGER update_user_credentials_updated_at
  BEFORE UPDATE ON user_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
