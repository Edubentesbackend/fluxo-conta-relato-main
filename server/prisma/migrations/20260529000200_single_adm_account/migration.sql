-- A conta administrativa operacional da fundacao e fixa.
UPDATE accounts
SET account_type = 'projeto'
WHERE account_type = 'adm'
  AND account_number IS DISTINCT FROM '12671-3';

UPDATE accounts
SET account_type = 'adm'
WHERE account_number = '12671-3';

ALTER TABLE accounts
  ADD CONSTRAINT accounts_adm_number_check
  CHECK (account_type <> 'adm' OR account_number = '12671-3');

ALTER TABLE accounts
  ADD CONSTRAINT accounts_fixed_adm_type_check
  CHECK (account_number IS DISTINCT FROM '12671-3' OR account_type = 'adm');

CREATE UNIQUE INDEX accounts_single_adm_idx
  ON accounts (account_type)
  WHERE account_type = 'adm';
