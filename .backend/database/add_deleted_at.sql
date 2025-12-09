-- 添加 deleted_at 欄位到 user 表
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- 添加索引以優化查詢
CREATE INDEX IF NOT EXISTS idx_user_deleted_at ON "user"(deleted_at);

-- 添加註釋
COMMENT ON COLUMN "user".deleted_at IS '帳號刪除時間，NULL 表示未刪除';




