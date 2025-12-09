-- 新增買家和賣家面交確認欄位
ALTER TABLE trade_request
ADD COLUMN IF NOT EXISTS buyer_confirmed_handoff BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seller_confirmed_handoff BOOLEAN DEFAULT FALSE;

