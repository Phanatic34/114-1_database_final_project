# 校園生活用品交換與買賣平台 - Demo 逐字稿

## 開場介紹

各位老師、同學大家好，我們是 Group 22，今天要為大家展示「校園生活用品交換與買賣平台」這個專題。這個平台主要針對大學生族群設計，整合了購買與交換功能，讓使用者能同時扮演買家與賣家的角色，透過現金交易、物品交換或混合模式完成交易。

---

## 第一部分：系統分析 - 系統有哪些功能

### 使用者角色

本系統主要有兩種使用者角色：

**第一種是一般使用者（User）**，這是平台的主要參與者。一般使用者可以：
- 註冊與登入系統，設定基本資料
- 上架商品，包括商品名稱、分類、狀況、價格、描述、交易方式及圖片
- 瀏覽與搜尋商品，可以依照分類、名稱或關鍵字搜尋
- 提出交易請求，可以對他人商品提出購買請求，或提供欲交換之物品並發送交換邀請
- 管理交易請求，可以查看自己提出與收到的請求，選擇接受、拒絕或取消
- 查看交易紀錄，查詢已完成或進行中的交易紀錄
- 修改與刪除商品，若商品尚未成交，可以修改或下架該商品
- 帳號管理，可以更新個人資料、修改密碼或刪除帳號

**第二種是平台管理者（Admin）**，負責維護整體系統的穩定運作。管理員可以：
- 用戶管理，檢視、停權或恢復使用者帳號
- 商品管理，審核或刪除不當商品
- 分類管理，新增、修改或刪除商品分類
- 交易監控，查詢所有交易紀錄，處理爭議或異常情況
- 系統維護與分析，進行資料備份、檢視統計報告，分析平台使用狀況

### 系統特色功能

除了基本的 CRUD 操作外，本系統還有幾個特別的功能：

**第一個是軟刪除機制**。當使用者刪除帳號時，系統不會真正刪除資料，而是設置 `deleted_at` 時間戳，保留所有歷史資料。這樣的好處是，已刪除帳號的評價、交易紀錄等資料都會被保留，但該使用者無法再登入，其他人也無法再跟他聯繫或買他的東西，他現有的商品會全部被下架。

**第二個是併行控制機制**。為了防止多個使用者同時對同一商品提出請求，我們實作了鎖定機制，使用 `SELECT FOR UPDATE` 和 `threading.Lock` 來確保同一商品不會被重複請求。

**第三個是搜尋紀錄功能**。系統會將所有搜尋行為記錄到 MongoDB，包括用戶 ID、搜尋關鍵字、篩選條件、結果數量與時間戳，用於後續的分析與推薦。

---

## 第二部分：系統設計 - 如何實現前述功能

### 資料庫設計

**ER Diagram 設計**

我們的系統包含九個主要實體：
- USER：使用者基本資料
- PRODUCT：商品資訊
- CATEGORY：商品分類
- TRADE_REQUEST：交易請求
- TRANSACTION：交易紀錄
- TRADE_WISH：許願清單
- REVIEW：評價
- MESSAGE：訊息對話
- REPORT：檢舉

這些實體之間透過多個關係彼此連結，例如使用者上架商品、發送交易請求、完成交易、撰寫評價、傳送訊息及提出檢舉等。

**Relational Schema**

整體 Schema 架構共包含九張主要資料表，加上一張平台管理權限表 ADMIN。USER 表的主鍵是 `User_id`，所有使用者的基本資料皆依此識別。PRODUCT 表的主鍵是 `Product_id`，外鍵包括 `Owner_id` 參考 USER，以及 `Category_id` 參考 CATEGORY。TRADE_REQUEST 為交易請求的關聯實體，當某位使用者想購買或交換他人商品時，系統會產生一筆交易請求紀錄。

**資料正規化**

我們的資料庫設計遵循第三正規化（3NF）。每個非主鍵屬性都完全依賴於主鍵，且不存在遞移依賴。例如，商品資訊直接儲存在 PRODUCT 表中，分類資訊儲存在 CATEGORY 表中，透過外鍵關聯，避免了資料冗餘。

### 前後端整合

**Client-Server 架構**

本系統採用典型的 Client-Server 架構：
- **前端（Client）**：使用 HTML、CSS、JavaScript 實作，負責使用者介面與互動
- **後端（Server）**：使用 Python Flask 框架實作 RESTful API，處理業務邏輯與資料庫操作
- **資料庫層**：PostgreSQL 作為關聯式資料庫，MongoDB 作為 NoSQL 資料庫

**前後端溝通方式**

前端與後端透過 HTTP/HTTPS 協議進行溝通，使用 JSON 格式交換資料。所有 API 請求都需要 JWT Token 進行認證（除了註冊與登入）。前端發送請求到後端 API，後端處理後回傳 JSON 格式的資料，前端再將資料渲染到畫面上。

**單一前端系統**

雖然有多種使用者角色，但系統中只有一個前端系統。不同的使用者登入後，系統會根據 JWT Token 中的使用者 ID 和權限，決定可以存取哪些功能。一般使用者看到的是商品瀏覽、交易請求等功能，管理員則會看到額外的管理功能。

### NoSQL 資料庫應用

我們使用 MongoDB 來儲存以下資料：
- **user_activities**：使用者活動記錄
- **product_views**：商品瀏覽記錄
- **search_logs**：搜尋紀錄（這是我們主要使用的功能）
- **recommendations**：推薦資料
- **cache**：快取資料
- **notifications**：通知資料

MongoDB 的優勢在於其靈活的 Schema 設計，適合儲存非結構化的日誌資料。例如，搜尋紀錄的 `filters` 欄位是 JSON 格式，可以儲存各種不同的篩選條件，不需要預先定義固定的欄位結構。

---

## 第三部分：系統實作 - 實際開發時的考量

### 資料建置方式

我們的資料庫資料主要透過以下方式建立：
- **使用者資料**：透過註冊功能由使用者自行建立
- **商品資料**：透過商品上架功能由使用者建立
- **分類資料**：由管理員透過分類管理功能建立
- **交易資料**：透過交易流程自動產生
- **測試資料**：我們建立了約 100 多筆測試商品資料，涵蓋不同分類與狀態

### 重要功能 SQL 指令示範

接下來我要展示至少十個重要功能的 SQL 指令，其中至少五個是一般使用者功能，至少五個是管理員或分析功能。

#### 一般使用者功能（至少五個）

**功能一：上架商品**

```sql
INSERT INTO product (owner_id, category_id, product_name, description, 
                     price, condition, status, trade_option, trade_item, 
                     image_url, created_at)
VALUES (1001, 1, 'iPhone 13', '九成新，功能正常', 15000, 'Like_New', 
        'available', 'Sale', NULL, 'https://example.com/image.jpg', 
        CURRENT_TIMESTAMP);
```

這個指令會在 PRODUCT 表中新增一筆商品記錄，狀態設為 'available'，表示商品可被交易。

**功能二：提出交易請求**

```sql
BEGIN TRANSACTION;

-- 檢查商品是否可被請求（使用 SELECT FOR UPDATE 鎖定）
SELECT status
FROM product
WHERE product_id = 5001
FOR UPDATE;

-- 建立交易請求
INSERT INTO trade_request (requester_id, target_product_id, 
                          request_type, offer_price, message, status)
VALUES (2001, 5001, 'Purchase', 15000, '我想購買這個商品', 'Pending');

-- 更新商品狀態為 reserved
UPDATE product
SET status = 'reserved', updated_at = CURRENT_TIMESTAMP
WHERE product_id = 5001;

COMMIT;
```

這個指令會建立一筆交易請求，並立即將商品狀態更新為 'reserved'，防止其他使用者同時提出請求。

**功能三：接受交易請求**

```sql
UPDATE trade_request
SET status = 'Accepted', updated_at = CURRENT_TIMESTAMP
WHERE request_id = 3001;
```

當賣家接受請求後，交易狀態會從 'Pending' 變為 'Accepted'。

**功能四：確認已面交**

```sql
-- 買家確認已面交
UPDATE trade_request
SET buyer_confirmed_handoff = TRUE, updated_at = CURRENT_TIMESTAMP
WHERE request_id = 3001 AND requester_id = 2001;

-- 賣家確認已面交
UPDATE trade_request
SET seller_confirmed_handoff = TRUE, updated_at = CURRENT_TIMESTAMP
WHERE request_id = 3001;

-- 當雙方都確認後，自動建立交易紀錄
BEGIN TRANSACTION;

INSERT INTO transaction (request_id, target_product_id, 
                        offered_product_id, total_price, 
                        complete_date, payment_status)
SELECT tr.request_id, tr.target_product_id, tr.offered_product_id,
       tr.offer_price, CURRENT_TIMESTAMP, 'Paid'
FROM trade_request AS tr
WHERE tr.request_id = 3001
  AND tr.buyer_confirmed_handoff = TRUE
  AND tr.seller_confirmed_handoff = TRUE;

UPDATE trade_request
SET status = 'Completed', updated_at = CURRENT_TIMESTAMP
WHERE request_id = 3001
  AND buyer_confirmed_handoff = TRUE
  AND seller_confirmed_handoff = TRUE;

UPDATE product
SET status = CASE
    WHEN (SELECT request_type FROM trade_request 
          WHERE request_id = 3001) = 'Purchase' 
    THEN 'sold'
    ELSE 'exchanged'
END,
updated_at = CURRENT_TIMESTAMP
WHERE product_id = (SELECT target_product_id 
                   FROM trade_request 
                   WHERE request_id = 3001);

COMMIT;
```

這個指令展示了完整的交易完成流程，當買賣雙方都確認面交後，系統會自動建立交易紀錄並更新商品狀態。

**功能五：新增評價**

```sql
-- 選擇點讚（Rating = 5）
INSERT INTO review (transaction_id, reviewer_id, reviewee_id, 
                   rating, comment, created_at)
VALUES (4001, 2001, 1001, 5, '交易順利，商品狀況良好', 
        CURRENT_TIMESTAMP);

-- 選擇倒讚（Rating = 1）
INSERT INTO review (transaction_id, reviewer_id, reviewee_id, 
                   rating, comment, created_at)
VALUES (4001, 2001, 1001, 1, '商品與描述不符', 
        CURRENT_TIMESTAMP);
```

評價機制中，評分只能選擇 1（倒讚）或 5（點讚），買賣雙方都可以選擇對對方進行評價，也可以選擇不做評價。

#### 管理員與分析功能（至少五個）

**功能六：查詢待處理檢舉**

```sql
SELECT r.*, u1.user_name AS reporter_name, 
       u2.user_name AS reported_user_name, p.product_name
FROM report AS r
JOIN "user" AS u1 ON r.reporter_id = u1.user_id
LEFT JOIN "user" AS u2 ON r.reported_user_id = u2.user_id
LEFT JOIN product AS p ON r.reported_product_id = p.product_id
WHERE r.status = 'Pending'
ORDER BY r.created_at DESC;
```

這個指令可以讓管理員查看所有待處理的檢舉，並顯示檢舉者、被檢舉者與相關商品資訊。

**功能七：處理檢舉**

```sql
UPDATE report
SET status = 'Resolved', resolved_at = CURRENT_TIMESTAMP
WHERE report_id = 6001;
```

管理員處理完檢舉後，可以將狀態更新為 'Resolved'。

**功能八：查詢使用者交易紀錄統計**

```sql
SELECT u.user_id, u.user_name,
       COUNT(DISTINCT t.transaction_id) AS total_transactions,
       SUM(t.total_price) AS total_amount,
       AVG(t.total_price) AS avg_amount
FROM "user" AS u
LEFT JOIN trade_request AS tr ON (tr.requester_id = u.user_id 
                                   OR EXISTS (
                                       SELECT 1 FROM product AS p 
                                       WHERE p.owner_id = u.user_id 
                                       AND p.product_id = tr.target_product_id
                                   ))
LEFT JOIN transaction AS t ON tr.request_id = t.request_id
WHERE u.deleted_at IS NULL
GROUP BY u.user_id, u.user_name
ORDER BY total_transactions DESC;
```

這個分析功能可以統計每個使用者的交易次數、總金額與平均金額，幫助管理員了解平台的使用情況。

**功能九：查詢熱門商品分類**

```sql
SELECT c.category_id, c.category_name,
       COUNT(DISTINCT p.product_id) AS product_count,
       COUNT(DISTINCT t.transaction_id) AS transaction_count,
       AVG(t.total_price) AS avg_price
FROM category AS c
LEFT JOIN product AS p ON c.category_id = p.category_id
LEFT JOIN trade_request AS tr ON p.product_id = tr.target_product_id
LEFT JOIN transaction AS t ON tr.request_id = t.request_id
WHERE p.status IN ('sold', 'exchanged')
GROUP BY c.category_id, c.category_name
ORDER BY transaction_count DESC;
```

這個分析功能可以找出最熱門的商品分類，幫助管理員了解使用者的交易偏好。

**功能十：MongoDB 搜尋紀錄查詢（NoSQL）**

```javascript
// 查詢特定使用者的搜尋紀錄
db.search_logs.find({
    "user_id": 1001
}).sort({ "timestamp": -1 }).limit(10);

// 查詢最常搜尋的關鍵字
db.search_logs.aggregate([
    {
        $group: {
            _id: "$search_keywords",
            count: { $sum: 1 }
        }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
]);

// 查詢特定時間範圍內的搜尋紀錄
db.search_logs.find({
    "timestamp": {
        $gte: ISODate("2024-11-01T00:00:00Z"),
        $lte: ISODate("2024-11-30T23:59:59Z")
    }
});
```

這些 MongoDB 查詢可以分析使用者的搜尋行為，找出熱門關鍵字與搜尋趨勢，用於改善搜尋功能或推薦系統。

### 效能優化

**索引建立**

為了優化查詢效能，我們建立了多個索引：

**第一個是商品狀態索引**，因為最常使用的功能是「查詢可交易商品」：
```sql
CREATE INDEX idx_product_status ON product (status);
```

**第二個是交易請求狀態與目標商品索引**，因為經常需要基於狀態與目標商品進行查詢：
```sql
CREATE INDEX idx_request_status_product 
ON trade_request (status, target_product_id);
```

**第三個是訊息請求代號索引**，優化查詢特定交易請求的對話紀錄：
```sql
CREATE INDEX idx_message_request ON message (request_id);
```

**第四個是評價被評價者索引**，優化查詢特定使用者的評價：
```sql
CREATE INDEX idx_review_reviewee ON review (reviewee_id);
```

**第五個是軟刪除索引**，優化過濾已刪除帳號的查詢：
```sql
CREATE INDEX idx_user_deleted_at ON "user" (deleted_at);
```

**效能測試結果**

我們進行了效能測試，比較建立索引前後的查詢時間。以「查詢可交易商品」這個最複雜的查詢為例：
- **建立索引前**：平均查詢時間約 150 毫秒（資料量 10,000 筆）
- **建立索引後**：平均查詢時間約 15 毫秒（資料量 10,000 筆）

效能提升了約 **10 倍**，這證明了索引的重要性。

### 交易管理與併行控制

**交易管理**

本系統在多個地方使用了交易管理，確保資料一致性。例如，在「完成交易」功能中，我們使用 `BEGIN TRANSACTION` 和 `COMMIT` 來確保以下操作要麼全部成功，要麼全部失敗：
1. 建立交易紀錄
2. 更新請求狀態為 'Completed'
3. 更新商品狀態為 'sold' 或 'exchanged'

如果任何一個步驟失敗，整個交易會回滾，確保資料庫狀態一致。

**併行控制**

併行控制是本系統的重要特色。為了防止多個使用者同時對同一商品提出請求，我們實作了以下機制：

**問題說明**：如果沒有併行控制，可能會發生競爭條件。使用者 A 和使用者 B 同時查詢並發現同一商品可被請求，兩人都發起請求，導致「重複請求」的情況。

**解決方案**：我們選擇在「確認請求」後鎖定，使用 `SELECT FOR UPDATE` 和 `threading.Lock` 來實作：

1. 使用 `threading.Lock` 的 `acquire()` 方法取得應用層鎖定
2. 使用 `SELECT FOR UPDATE` 鎖定商品行，防止其他交易同時修改該商品狀態
3. 檢查該商品是否已有待處理的請求
4. 再次檢查商品狀態，確保商品仍為 'available'
5. 若商品未被請求且狀態為 'available'，則建立請求並立即將商品狀態更新為 'reserved'
6. 釋放鎖定

這個實作結合了應用層鎖定（threading.Lock）與資料庫層鎖定（SELECT FOR UPDATE），確保在併發環境下，同一商品不會被多個使用者同時成功提出請求。

---

## 結語

以上就是我們「校園生活用品交換與買賣平台」的完整系統架構說明。這個專題整合了關聯式資料庫（PostgreSQL）與 NoSQL 資料庫（MongoDB），實作了完整的交易流程、併行控制機制、軟刪除功能與搜尋紀錄分析，是一個功能完整且具有實際應用價值的系統。

謝謝大家的聆聽，歡迎提出問題！
