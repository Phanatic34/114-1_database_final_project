-- 修改 product 表的欄位類型
ALTER TABLE product ALTER COLUMN image_url TYPE TEXT;
ALTER TABLE product ALTER COLUMN description TYPE TEXT;

-- 修改 trade_wish 表的欄位類型（如果有的話）
ALTER TABLE trade_wish ALTER COLUMN image_url TYPE TEXT;




