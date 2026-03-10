-- Remove user_id from files
ALTER TABLE files DROP COLUMN IF EXISTS user_id;

-- Remove user_id from pages
ALTER TABLE pages DROP COLUMN IF EXISTS user_id;

-- Drop users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TABLE IF EXISTS users;
