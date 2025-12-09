-- ============================================
-- 校園生活用品交換與買賣平台
-- PostgreSQL Database Schema
-- Group 22
-- ============================================

-- 啟用必要的擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USER 表（使用者基本資料）
-- ============================================
CREATE TABLE IF NOT EXISTS "user" (
    user_id BIGSERIAL PRIMARY KEY,
    user_name VARCHAR(20) NOT NULL,
    student_id VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,  -- 使用 hash，所以長度增加
    phone VARCHAR(15),
    register_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CATEGORY 表（商品分類）
-- ============================================
CREATE TABLE IF NOT EXISTS category (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(30) NOT NULL CHECK (category_name IN ('Textbooks', 'Electronics', 'Clothing', 'Stationery', 'Daily_Use', 'Others')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. PRODUCT 表（商品資訊）
-- ============================================
CREATE TABLE IF NOT EXISTS product (
    product_id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    category_id INTEGER NOT NULL REFERENCES category(category_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    product_name VARCHAR(50) NOT NULL,
    price INTEGER CHECK (price >= 0),  -- 僅販售時使用，可為 NULL
    trade_option VARCHAR(10) NOT NULL DEFAULT 'sale' CHECK (trade_option IN ('sale', 'trade', 'both')),
    condition VARCHAR(20) NOT NULL CHECK (condition IN ('Brand_New', 'Good', 'Used')),
    description TEXT,  -- 改用 TEXT 支援較長描述
    trade_item VARCHAR(100),  -- 當 Trade_option 為 trade/both 時填寫
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'exchanged', 'removed')),
    image_url TEXT,  -- 改用 TEXT 支援 base64 圖片
    post_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. ADMIN 表（平台管理權限）
-- ============================================
CREATE TABLE IF NOT EXISTS admin (
    admin_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES "user"(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('PlatformAdmin', 'ClubAdmin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. TRADE_REQUEST 表（交易請求）
-- ============================================
CREATE TABLE IF NOT EXISTS trade_request (
    request_id BIGSERIAL PRIMARY KEY,
    requester_id BIGINT NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    target_product_id BIGINT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE ON UPDATE CASCADE,
    offered_product_id BIGINT REFERENCES product(product_id) ON DELETE SET NULL ON UPDATE CASCADE,  -- 僅當 Request_type='Trade' 時有值
    request_type VARCHAR(10) NOT NULL CHECK (request_type IN ('Purchase', 'Trade')),
    offer_price INTEGER CHECK (offer_price >= 0),  -- 僅當 Request_type='Purchase' 時使用
    status VARCHAR(15) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled')),
    message VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. TRANSACTION 表（完成的交易紀錄）
-- ============================================
CREATE TABLE IF NOT EXISTS transaction (
    transaction_id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL UNIQUE REFERENCES trade_request(request_id) ON DELETE CASCADE ON UPDATE CASCADE,
    target_product_id BIGINT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE ON UPDATE CASCADE,
    offered_product_id BIGINT REFERENCES product(product_id) ON DELETE SET NULL ON UPDATE CASCADE,  -- 若為購買則為 NULL
    total_price INTEGER CHECK (total_price >= 0),  -- 僅購買類型使用
    complete_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(10) NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Paid', 'Unpaid', 'NA')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. TRADE_WISH 表（開放式交換許願）
-- ============================================
CREATE TABLE IF NOT EXISTS trade_wish (
    wish_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    offered_product_id BIGINT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE ON UPDATE CASCADE,  -- 屬於該 User
    image_url VARCHAR(255),
    desired_text VARCHAR(100) NOT NULL,  -- 文字敘述，如「鉛筆」或「遊戲機」
    desired_category_id INTEGER REFERENCES category(category_id) ON DELETE SET NULL ON UPDATE CASCADE,
    status VARCHAR(15) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Matched', 'Cancelled')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. REVIEW 表（交易評價與評論）
-- ============================================
CREATE TABLE IF NOT EXISTS review (
    review_id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transaction(transaction_id) ON DELETE CASCADE ON UPDATE CASCADE,
    reviewer_id BIGINT NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    reviewee_id BIGINT NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_review_per_transaction UNIQUE (transaction_id, reviewer_id, reviewee_id)
);

-- ============================================
-- 9. MESSAGE 表（買賣雙方訊息對話）
-- ============================================
CREATE TABLE IF NOT EXISTS message (
    message_id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES trade_request(request_id) ON DELETE CASCADE ON UPDATE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    receiver_id BIGINT NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    content VARCHAR(500) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 10. REPORT 表（檢舉不當商品或行為）
-- ============================================
CREATE TABLE IF NOT EXISTS report (
    report_id BIGSERIAL PRIMARY KEY,
    reporter_id BIGINT NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    reported_product_id BIGINT REFERENCES product(product_id) ON DELETE SET NULL ON UPDATE CASCADE,  -- 若檢舉商品則有值
    reported_user_id BIGINT REFERENCES "user"(user_id) ON DELETE SET NULL ON UPDATE CASCADE,  -- 若檢舉使用者則有值
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('Scam', 'Inappropriate', 'Fraud', 'Other')),
    description VARCHAR(500) NOT NULL,
    status VARCHAR(15) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Under_Review', 'Resolved', 'Rejected')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    CHECK (reported_product_id IS NOT NULL OR reported_user_id IS NOT NULL)  -- 至少有一個不為 NULL
);

-- ============================================
-- 索引建立（效能優化）
-- ============================================

-- PRODUCT 表索引
CREATE INDEX IF NOT EXISTS idx_product_status ON product(status);
CREATE INDEX IF NOT EXISTS idx_product_owner ON product(owner_id);
CREATE INDEX IF NOT EXISTS idx_product_category ON product(category_id);

-- TRADE_REQUEST 表索引
CREATE INDEX IF NOT EXISTS idx_request_status_product ON trade_request(status, target_product_id);
CREATE INDEX IF NOT EXISTS idx_request_requester ON trade_request(requester_id);
CREATE INDEX IF NOT EXISTS idx_request_target_product ON trade_request(target_product_id);

-- MESSAGE 表索引
CREATE INDEX IF NOT EXISTS idx_message_request ON message(request_id);
CREATE INDEX IF NOT EXISTS idx_message_sender ON message(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_receiver ON message(receiver_id);

-- REVIEW 表索引
CREATE INDEX IF NOT EXISTS idx_review_reviewee ON review(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_review_transaction ON review(transaction_id);

-- TRANSACTION 表索引
CREATE INDEX IF NOT EXISTS idx_transaction_request ON transaction(request_id);
CREATE INDEX IF NOT EXISTS idx_transaction_target_product ON transaction(target_product_id);

-- USER 表索引
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_student_id ON "user"(student_id);

-- ============================================
-- 觸發器：自動更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_updated_at BEFORE UPDATE ON product
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trade_request_updated_at BEFORE UPDATE ON trade_request
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trade_wish_updated_at BEFORE UPDATE ON trade_wish
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 初始資料：商品分類
-- ============================================
INSERT INTO category (category_name) VALUES
    ('Textbooks'),
    ('Electronics'),
    ('Clothing'),
    ('Stationery'),
    ('Daily_Use'),
    ('Others')
ON CONFLICT DO NOTHING;

