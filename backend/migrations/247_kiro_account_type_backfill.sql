-- Align only legacy Kiro rows with the actual authentication method.
-- Imported OAuth credentials historically used the apikey account type.
UPDATE accounts
SET type = 'oauth'
WHERE platform = 'kiro'
  AND type <> 'oauth'
  AND lower(btrim(COALESCE(credentials ->> 'auth_method', 'social'))) <> 'api_key';

UPDATE accounts
SET type = 'apikey'
WHERE platform = 'kiro'
  AND type <> 'apikey'
  AND lower(btrim(credentials ->> 'auth_method')) = 'api_key';
