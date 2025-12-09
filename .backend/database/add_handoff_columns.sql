-- 添加買家和賣家「已面交」確認欄位
ALTER TABLE trade_request 
ADD COLUMN IF NOT EXISTS buyer_confirmed_handoff BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seller_confirmed_handoff BOOLEAN DEFAULT FALSE;




