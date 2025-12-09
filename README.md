# 校園生活用品交換與買賣平台

Group 22 - Database Final Project (114-1)

## 🚀 快速啟動

**詳細啟動說明請參考：`啟動說明.md`**

### 三步驟啟動

1. **啟動後端**（終端視窗 1）：
   ```bash
   cd .backend
   python app.py
   ```

2. **啟動前端**（終端視窗 2）：
   ```bash
   cd .frontend
   python -m http.server 8000
   ```

3. **開啟網站**：
   在瀏覽器開啟 `http://localhost:8000`

## 專案簡介

本專案是一個整合「購買」與「交換」功能的校園二手交易平台，專為大學生族群設計。使用者可以同時扮演買家與賣家的角色，透過現金交易、物品交換或混合模式完成交易。

## 專案結構

```
db-final/
├── .frontend/          # 前端檔案（HTML, CSS, JavaScript）
│   ├── index.html
│   ├── item_list.html
│   ├── item_page.html
│   ├── js/
│   ├── images/
│   └── ...
├── .backend/           # 後端系統（Flask API）
│   ├── api/            # API 路由
│   ├── config/         # 配置檔案
│   ├── database/       # 資料庫腳本
│   ├── models/         # 資料模型
│   ├── utils/          # 工具函數
│   ├── app.py          # 主應用程式
│   └── requirements.txt
├── outline.tex         # 系統設計文件（LaTeX）
└── README.md           # 本檔案
```

## 技術架構

### 前端
- HTML5, CSS3, JavaScript (Vanilla JS)
- 無需框架，可直接在瀏覽器運行

### 後端
- **Python Flask** - Web API 框架
- **PostgreSQL** - 關聯式資料庫（主要資料）
- **MongoDB** - NoSQL 資料庫（活動記錄、推薦系統等）

## 快速開始

### 前置需求

1. **Python 3.8+**
2. **PostgreSQL 12+**
3. **MongoDB 4.4+**
4. **Node.js** (可選，用於前端開發工具)

### 1. 設定後端

```bash
# 進入後端目錄
cd .backend

# 安裝 Python 依賴
pip install -r requirements.txt

# 複製環境變數檔案
cp env.example .env

# 編輯 .env 檔案，設定資料庫連線資訊
# 詳細說明請參考 .backend/DATABASE_SETUP.md
```

### 2. 初始化資料庫

#### PostgreSQL

```bash
# 建立資料庫
psql -U postgres
CREATE DATABASE campus_trading;
\q

# 初始化 Schema
cd .backend
python database/init_db.py
```

#### MongoDB

```bash
# 確保 MongoDB 服務運行中
# 初始化 Collections
cd .backend
python database/mongodb_schema.py
```

詳細的資料庫設定步驟請參考 [.backend/DATABASE_SETUP.md](.backend/DATABASE_SETUP.md)

### 3. 啟動後端服務

```bash
cd .backend
python app.py
```

後端 API 將在 `http://localhost:5000` 運行。

### 4. 啟動前端

```bash
# 方式一：直接開啟 HTML 檔案
# 在瀏覽器中開啟 .frontend/index.html

# 方式二：使用本地伺服器（推薦）
cd .frontend
python -m http.server 8000
# 或
npx http-server
```

前端將在 `http://localhost:8000` 運行。

## 資料庫架構

### PostgreSQL 關聯式資料庫

主要資料表：
- `user` - 使用者基本資料
- `category` - 商品分類
- `product` - 商品資訊
- `trade_request` - 交易請求
- `transaction` - 交易紀錄
- `trade_wish` - 交換許願
- `review` - 評價與評論
- `message` - 訊息對話
- `report` - 檢舉記錄
- `admin` - 管理員權限

詳細的資料庫結構請參考 `outline.tex` 或 `.backend/database/schema.sql`

### MongoDB NoSQL 資料庫

Collections：
- `user_activities` - 使用者活動記錄
- `product_views` - 商品瀏覽統計
- `search_logs` - 搜尋記錄
- `recommendations` - 商品推薦
- `cache` - 快取資料
- `notifications` - 通知訊息

## API 文檔

後端 API 文檔請參考 [.backend/README.md](.backend/README.md)

主要 API 端點：
- `/api/auth/*` - 認證相關
- `/api/products/*` - 商品相關
- `/api/trade-requests/*` - 交易請求
- `/api/transactions/*` - 交易紀錄
- `/api/reviews/*` - 評價
- `/api/messages/*` - 訊息
- `/api/reports/*` - 檢舉
- `/api/admin/*` - 管理員功能

## 功能特色

### 使用者功能
- ✅ 註冊與登入（簡化認證，使用 user_id）
- ✅ 商品上架與管理
- ✅ 商品瀏覽與搜尋
- ✅ 提出交易請求（購買/交換）
- ✅ 管理交易請求（接受/拒絕/取消）
- ✅ 完成交易與評價
- ✅ 訊息對話
- ✅ 檢舉功能

### 管理員功能
- ✅ 商品管理
- ✅ 使用者管理
- ✅ 檢舉處理
- ✅ 分類管理

### 系統功能
- ✅ 併行控制（防止重複請求）
- ✅ 交易狀態管理
- ✅ 活動記錄（MongoDB）
- ✅ 商品推薦系統（MongoDB）

## 開發說明

### 資料庫連接

**重要：** 在開始開發前，請先完成資料庫設定：

1. 參考 `.backend/DATABASE_SETUP.md` 安裝並設定 PostgreSQL 和 MongoDB
2. 在 `.backend/.env` 中設定正確的資料庫連線資訊
3. 執行資料庫初始化腳本

### 環境變數

後端需要以下環境變數（在 `.backend/.env` 中設定）：

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=campus_trading
DB_USER=postgres
DB_PASSWORD=your_password

# MongoDB
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB=campus_trading_nosql

# JWT
JWT_SECRET=your-secret-key

# Flask
FLASK_ENV=development
PORT=5000
```

## 專案成員

- B12705001 范嘉栩
- B12705021 周建凱
- B12705050 宋承陽

## 相關文件

- **`啟動說明.md`** - 完整啟動指南（**請先看這個！**）
- [系統設計文件](outline.tex) - 完整的系統分析與設計（LaTeX）
- [後端 README](.backend/README.md) - 後端 API 文檔

## 授權

本專案為資料庫課程（114-1）期末專案。

## 注意事項

1. **生產環境部署前請務必：**
   - 修改 `JWT_SECRET` 為強密碼
   - 設定強資料庫密碼
   - 關閉 Flask debug 模式
   - 設定適當的 CORS 政策

2. **資料庫備份：**
   - 定期備份 PostgreSQL 資料庫
   - MongoDB 資料可視需要備份

3. **安全性：**
   - 密碼使用 bcrypt 加密
   - API 使用 user_id 認證（簡化版，適用於個人使用）
   - SQL 注入防護（使用參數化查詢）
