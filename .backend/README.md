# 校園生活用品交換與買賣平台 - 後端系統

## 專案結構

```
.backend/
├── api/                    # API 路由
│   ├── routes/            # 各功能路由
│   │   ├── auth.py       # 認證相關
│   │   ├── products.py   # 商品相關
│   │   ├── trade_requests.py  # 交易請求
│   │   ├── transactions.py    # 交易紀錄
│   │   ├── reviews.py         # 評價
│   │   ├── messages.py        # 訊息
│   │   ├── reports.py         # 檢舉
│   │   └── admin.py           # 管理員
│   └── __init__.py
├── config/                 # 配置檔案
│   ├── database.py        # 資料庫連線配置
│   └── __init__.py
├── database/              # 資料庫相關
│   ├── schema.sql         # PostgreSQL Schema
│   ├── init_db.py         # 資料庫初始化腳本
│   └── mongodb_schema.py  # MongoDB Schema
├── models/                # 資料模型
│   └── mongodb_models.py  # MongoDB 模型
├── utils/                 # 工具函數
│   ├── auth.py           # 認證工具
│   └── __init__.py
├── app.py                 # 主應用程式
├── requirements.txt       # Python 依賴
└── .env.example          # 環境變數範例
```

## 安裝與設定

### 1. 安裝 Python 依賴

```bash
pip install -r requirements.txt
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env` 並修改配置：

```bash
cp .env.example .env
```

編輯 `.env` 檔案，設定資料庫連線資訊。

### 3. 初始化 PostgreSQL 資料庫

確保 PostgreSQL 已安裝並運行，然後執行：

```bash
python database/init_db.py
```

或手動執行 SQL：

```bash
psql -U postgres -d campus_trading -f database/schema.sql
```

### 4. 初始化 MongoDB

確保 MongoDB 已安裝並運行，然後執行：

```bash
python database/mongodb_schema.py
```

## 執行應用程式

```bash
python app.py
```

應用程式將在 `http://localhost:5000` 運行。

## API 端點

### 認證 (Auth)
- `POST /api/auth/register` - 使用者註冊
- `POST /api/auth/login` - 使用者登入

### 商品 (Products)
- `GET /api/products` - 查詢商品列表
- `GET /api/products/<id>` - 查詢單一商品
- `POST /api/products` - 新增商品（需認證）
- `PUT /api/products/<id>` - 更新商品（需認證）
- `DELETE /api/products/<id>` - 刪除商品（需認證）

### 交易請求 (Trade Requests)
- `POST /api/trade-requests` - 建立交易請求（需認證）
- `GET /api/trade-requests` - 查詢交易請求（需認證）
- `POST /api/trade-requests/<id>/accept` - 接受請求（需認證）
- `POST /api/trade-requests/<id>/reject` - 拒絕請求（需認證）
- `POST /api/trade-requests/<id>/cancel` - 取消請求（需認證）

### 交易紀錄 (Transactions)
- `GET /api/transactions` - 查詢交易紀錄（需認證）
- `POST /api/transactions` - 完成交易（需認證）

### 評價 (Reviews)
- `POST /api/reviews` - 新增評價（需認證）
- `GET /api/reviews/user/<user_id>` - 查詢使用者評價

### 訊息 (Messages)
- `POST /api/messages` - 發送訊息（需認證）
- `GET /api/messages/request/<request_id>` - 查詢對話紀錄（需認證）

### 檢舉 (Reports)
- `POST /api/reports` - 提出檢舉（需認證）

### 管理員 (Admin)
- `DELETE /api/admin/products/<id>` - 刪除商品（需管理員權限）
- `PUT /api/admin/products/<id>/status` - 更新商品狀態（需管理員權限）
- `GET /api/admin/reports` - 查詢檢舉（需管理員權限）
- `POST /api/admin/reports/<id>/resolve` - 處理檢舉（需管理員權限）

## 認證方式

大部分 API 需要 JWT Token 認證。在請求 header 中加入：

```
Authorization: Bearer <your-token>
```

Token 可透過 `/api/auth/login` 取得。

## 資料庫架構

### PostgreSQL (關聯式資料庫)
- `user` - 使用者
- `category` - 商品分類
- `product` - 商品
- `trade_request` - 交易請求
- `transaction` - 交易紀錄
- `trade_wish` - 交換許願
- `review` - 評價
- `message` - 訊息
- `report` - 檢舉
- `admin` - 管理員

### MongoDB (NoSQL)
- `user_activities` - 使用者活動記錄
- `product_views` - 商品瀏覽統計
- `search_logs` - 搜尋記錄
- `recommendations` - 商品推薦
- `cache` - 快取資料
- `notifications` - 通知訊息

## 併行控制

交易請求功能已實作併行控制機制，使用 Python `threading.Lock` 防止競爭條件。

## 注意事項

1. 生產環境請務必修改 `JWT_SECRET`
2. 資料庫密碼請使用強密碼
3. 建議使用環境變數管理敏感資訊
4. 生產環境請關閉 Flask debug 模式

