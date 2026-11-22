-- The admin username changed from "munubol" to "user" (src/lib/constants.ts).
-- Rename the existing account so it keeps its password, keys and history.
-- Skipped if a "user" account already exists.
UPDATE "users" SET "username" = 'user'
WHERE "username" = 'munubol'
  AND NOT EXISTS (SELECT 1 FROM "users" WHERE "username" = 'user');
