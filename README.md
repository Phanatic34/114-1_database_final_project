# 校園生活用品交換與買賣平台

Group 22 - Database Final Project (114-1)

**專案成員：**
- B12705001 范嘉栩
- B12705021 周建凱
- B12705050 宋承陽

---

## 📋 目錄

1. [快速開始](#快速開始)
2. [完整設置指南](#完整設置指南)
3. [資料庫還原](#資料庫還原)
4. [啟動服務](#啟動服務)
5. [專案結構](#專案結構)
6. [技術架構](#技術架構)
7. [API 文檔](#api-文檔)
8. [常見問題](#常見問題)

---

## 🚀 快速開始

### 前置需求

- **Python 3.8+**（建議 3.9 或更高版本）
- **PostgreSQL 12+**（已安裝並運行）
- **MongoDB Atlas 帳號**（或本地 MongoDB）
- **Git**（用於克隆專案）

### 三步驟啟動

1. **還原資料庫**（見下方「資料庫還原」章節）
2. **設定環境變數**（見下方「完整設置指南」）
3. **啟動服務**（見下方「啟動服務」章節）

---

## 📖 完整設置指南

### 步驟 1：安裝 Python 依賴

```bash
# 進入後端目錄
cd .backend

# 安裝所有依賴套件
pip install -r requirements.txt
```

**必要套件：**
- Flask
- psycopg2-binary（PostgreSQL 驅動）
- pymongo（MongoDB 驅動）
- python-dotenv（環境變數管理）
- bcrypt（密碼加密）
- PyJWT（JWT 認證）

### 步驟 2：設定環境變數

#### 2.1 複製環境變數範例檔

```bash
cd .backend
copy env.example .env
```

#### 2.2 編輯 `.env` 檔案

使用文字編輯器開啟 `.backend/.env`，設定以下內容：

```env
# PostgreSQL 資料庫配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=campus_trading
DB_USER=postgres
DB_PASSWORD=你的PostgreSQL密碼

# MongoDB 配置（使用 MongoDB Atlas）
MONGO_URI=mongodb+srv://你的帳號:你的密碼@cluster0.780gv9p.mongodb.net/campus_trading_nosql?retryWrites=true&w=majority

# 或使用本地 MongoDB（如果沒有 Atlas）
# MONGO_HOST=localhost
# MONGO_PORT=27017
# MONGO_DB=campus_trading_nosql
# MONGO_USER=
# MONGO_PASSWORD=

# JWT 配置
JWT_SECRET=a456233d5f2941d5

# Flask 配置
FLASK_ENV=development
PORT=5000
```

**重要：**
- `DB_PASSWORD`：請替換為您的 PostgreSQL 密碼
- `MONGO_URI`：如果使用 MongoDB Atlas，請替換為您的連接字串
- `JWT_SECRET`：可保持不變或自行修改

### 步驟 3：確認資料庫服務運行

#### PostgreSQL

**Windows：**
1. 開啟「服務」管理員（Win + R，輸入 `services.msc`）
2. 找到「postgresql-x64-XX」服務
3. 確認狀態為「執行中」

**或使用命令列：**
```bash
# 測試連接
psql -U postgres -h localhost
```

#### MongoDB Atlas

1. 登入 [MongoDB Atlas](https://cloud.mongodb.com/)
2. 確認 Cluster 狀態為「Running」
3. 確認 IP 白名單已設定（允許所有 IP：`0.0.0.0/0`）

---

## 💾 資料庫還原

### 方法一：使用備份檔還原（推薦）

#### PostgreSQL 還原

**使用 .backup 檔案（壓縮格式）：**

```bash
# Windows PowerShell
$env:PGPASSWORD="你的PostgreSQL密碼"
pg_restore -h localhost -p 5432 -U postgres -d campus_trading -c database_backups/postgresql_campus_trading_20251210_004949.backup
```

**或使用 .sql 檔案：**

```bash
# Windows PowerShell
$env:PGPASSWORD="你的PostgreSQL密碼"
psql -h localhost -p 5432 -U postgres -d campus_trading < database_backups/postgresql_campus_trading_20251210_004453.sql
```

#### 執行資料庫遷移（軟刪除功能）

還原資料庫後，需要執行遷移腳本以添加軟刪除功能所需的欄位：

```bash
# 從專案根目錄執行
python .backend/database/add_deleted_at_migration.py
```

**遷移內容：**
- 在 `user` 表中添加 `deleted_at` 欄位（TIMESTAMP，用於標記帳號刪除時間）
- 創建索引以優化查詢性能

**注意：** 如果資料庫是全新建立的，遷移腳本會自動執行。如果使用備份檔還原，請手動執行遷移。

**如果資料庫不存在，先建立：**

```bash
# 連接到 PostgreSQL
psql -U postgres

# 建立資料庫
CREATE DATABASE campus_trading;

# 退出
\q
```

#### MongoDB 還原

**如果使用 MongoDB Atlas：**
- 資料已在雲端，無需還原
- 確認連接字串正確即可

**如果使用本地 MongoDB：**
```bash
mongorestore --host localhost:27017 --db campus_trading_nosql ./database_backups/mongodb_backup/
```

### 方法二：從頭初始化資料庫

如果沒有備份檔，可以從頭建立：

```bash
cd .backend

# 初始化 PostgreSQL（建立所有表格和索引）
python database/init_db.py

# 初始化 MongoDB（建立 Collections 和索引）
python database/mongodb_schema.py
```

**注意：** 此方法會建立空的資料庫結構，不會有測試資料。

---

## 🚀 啟動服務

### 方式一：使用批次檔（推薦，Windows）

**啟動所有服務：**
```bash
# 雙擊執行
start_all.bat
```

**停止所有服務：**
```bash
# 雙擊執行
stop_all.bat
```

### 方式二：手動啟動

#### 步驟 1：啟動後端服務

**開啟終端視窗 1：**

```bash
cd .backend
python app.py
```

**成功訊息：**
```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

**重要：** 保持這個視窗開啟！

#### 步驟 2：啟動前端服務

**開啟終端視窗 2：**

```bash
cd .frontend
python -m http.server 8000
```

**成功訊息：**
```
Serving HTTP on :: port 8000 (http://[::]:8000/) ...
```

#### 步驟 3：開啟網站

在瀏覽器開啟：
```
http://localhost:8000
```

---

## 📁 專案結構

```
db-final/
├── .frontend/              # 前端檔案
│   ├── index.html          # 首頁
│   ├── login.html          # 登入頁
│   ├── register.html       # 註冊頁
│   ├── item_list.html      # 商品列表
│   ├── item_page.html      # 商品詳情
│   ├── sell.html           # 上架商品
│   ├── my_items.html       # 我的商品
│   ├── requests.html       # 交易請求
│   ├── messages.html       # 訊息對話
│   ├── transactions.html   # 交易紀錄
│   ├── admin.html          # 管理員後台
│   ├── js/                 # JavaScript 檔案
│   │   ├── api.js          # API 封裝
│   │   ├── data.js         # 資料處理
│   │   └── ...
│   └── css/                # 樣式檔案
├── .backend/               # 後端系統
│   ├── app.py              # 主應用程式（啟動後端）
│   ├── api/                # API 路由
│   │   └── routes/         # 各功能路由
│   │       ├── auth.py     # 認證
│   │       ├── products.py # 商品
│   │       ├── trade_requests.py  # 交易請求
│   │       ├── transactions.py   # 交易紀錄
│   │       ├── reviews.py         # 評價
│   │       ├── messages.py        # 訊息
│   │       ├── reports.py         # 檢舉
│   │       └── admin.py           # 管理員
│   ├── config/             # 配置檔案
│   │   └── database.py     # 資料庫連線配置
│   ├── database/            # 資料庫腳本
│   │   ├── schema.sql       # PostgreSQL Schema
│   │   ├── init_db.py      # 資料庫初始化
│   │   └── mongodb_schema.py  # MongoDB 初始化
│   ├── utils/              # 工具函數
│   │   └── auth.py         # 認證工具
│   ├── requirements.txt    # Python 依賴
│   ├── env.example         # 環境變數範例
│   └── .env                # 環境變數（需自行建立）
├── database_backups/        # 資料庫備份檔
│   ├── postgresql_campus_trading_20251210_004949.backup
│   └── postgresql_campus_trading_20251210_004453.sql
├── outline.tex             # 系統設計文件（LaTeX）
├── README.md               # 本檔案
├── 啟動說明.md             # 詳細啟動指南
├── 資料庫備份說明.md       # 資料庫備份說明
├── start_all.bat           # 啟動所有服務（Windows）
└── stop_all.bat            # 停止所有服務（Windows）
```

---

## 🏗️ 技術架構

### 前端
- **HTML5, CSS3, JavaScript (Vanilla JS)**
- 無需框架，可直接在瀏覽器運行
- 使用 Fetch API 與後端通訊
- LocalStorage 用於暫存使用者資訊

### 後端
- **Python Flask** - Web API 框架
- **PostgreSQL** - 關聯式資料庫（主要資料）
  - 使用 `psycopg2` 連接
  - 連線池管理
- **MongoDB** - NoSQL 資料庫（活動記錄、推薦系統等）
  - 使用 `pymongo` 連接
  - 支援 MongoDB Atlas 雲端服務

### 認證機制
- **JWT (JSON Web Tokens)** - 使用者認證
- **Bcrypt** - 密碼加密

---

## 📊 資料庫架構

### PostgreSQL 關聯式資料庫

**主要資料表：**
- `user` - 使用者基本資料（包含 `deleted_at` 欄位，用於軟刪除）
- `category` - 商品分類
- `product` - 商品資訊
- `trade_request` - 交易請求
- `transaction` - 交易紀錄
- `trade_wish` - 交換許願
- `review` - 評價與評論
- `message` - 訊息對話
- `report` - 檢舉記錄
- `admin` - 管理員權限

**詳細結構請參考：**
- `.backend/database/schema.sql` - 完整 SQL Schema
- `outline.tex` - 系統設計文件（包含 ER Diagram 和資料字典）

### MongoDB NoSQL 資料庫

**Collections：**
- `user_activities` - 使用者活動記錄
- `product_views` - 商品瀏覽統計
- `search_logs` - 搜尋記錄（**已實作**：自動記錄所有商品搜尋行為）
- `recommendations` - 商品推薦
- `cache` - 快取資料
- `notifications` - 通知訊息

**搜尋紀錄功能：**
- 當使用者搜尋商品時，系統會自動記錄到 MongoDB 的 `search_logs` collection
- 記錄內容包括：用戶 ID（如果已登入）、搜尋關鍵字、篩選條件、結果數量、時間戳
- 可用於分析使用者搜尋行為、熱門關鍵字、推薦系統等

---

## 🔌 API 文檔

### 基礎 URL
```
http://localhost:5000/api
```

### 主要 API 端點

#### 認證
- `POST /api/auth/register` - 註冊新使用者
- `POST /api/auth/login` - 使用者登入
- `DELETE /api/auth/delete-account` - 刪除帳號（軟刪除，需認證）

#### 商品
- `GET /api/products` - 查詢商品列表（支援篩選）
- `GET /api/products/<id>` - 查詢單一商品
- `POST /api/products` - 新增商品（需認證）
- `PUT /api/products/<id>` - 更新商品（需認證）
- `DELETE /api/products/<id>` - 刪除商品（需認證）
- `GET /api/products/seller-stats/<user_id>` - 查詢賣家統計

#### 交易請求
- `POST /api/trade-requests` - 建立交易請求（需認證）
- `GET /api/trade-requests` - 查詢交易請求（需認證）
- `POST /api/trade-requests/<id>/accept` - 接受請求（需認證）
- `POST /api/trade-requests/<id>/reject` - 拒絕請求（需認證）
- `POST /api/trade-requests/<id>/cancel` - 取消請求（需認證）
- `POST /api/trade-requests/<id>/confirm-handoff` - 確認已面交（需認證）

#### 交易紀錄
- `GET /api/transactions` - 查詢交易紀錄（需認證）

#### 評價
- `POST /api/reviews` - 新增評價（需認證）
- `GET /api/reviews/user/<user_id>` - 查詢使用者評價
- `GET /api/reviews/transaction/<transaction_id>/status` - 查詢評價狀態

#### 訊息
- `POST /api/messages` - 發送訊息（需認證）
- `GET /api/messages/request/<request_id>` - 查詢對話紀錄（需認證）

#### 檢舉
- `POST /api/reports` - 提出檢舉（需認證）

#### 管理員
- `GET /api/admin/users` - 查詢所有使用者（需管理員權限）
- `GET /api/admin/products` - 查詢所有商品（需管理員權限）
- `GET /api/admin/reports` - 查詢待處理檢舉（需管理員權限）
- `POST /api/admin/reports/<id>/resolve` - 處理檢舉（需管理員權限）

**詳細 API 文檔請參考：** `.backend/README.md`

---

## ⚠️ 常見問題

### 問題 1：後端無法啟動

**錯誤：** `ModuleNotFoundError: No module named 'flask'`

**解決：**
```bash
cd .backend
pip install -r requirements.txt
```

### 問題 2：資料庫連接失敗

**錯誤：** `password authentication failed for user "postgres"`

**解決步驟：**
1. 確認 PostgreSQL 服務運行中
2. 檢查 `.backend/.env` 中的 `DB_PASSWORD` 是否正確
3. 確認資料庫 `campus_trading` 已建立
4. 測試連接：
   ```bash
   psql -U postgres -h localhost
   ```

### 問題 3：前端無法連接後端

**錯誤：** "無法連接到伺服器" 或 "Failed to fetch"

**解決步驟：**
1. **確認後端運行中：**
   - 訪問 `http://localhost:5000/` 應該看到 JSON 回應
   - 檢查後端終端是否有錯誤訊息

2. **檢查 CORS 設定：**
   - 後端已啟用 CORS，允許所有來源
   - 如果仍有問題，檢查後端終端的錯誤訊息

3. **檢查瀏覽器 Console（F12）：**
   - 查看 Network 標籤，確認 API 請求是否發出
   - 查看 Console 標籤，確認錯誤訊息

### 問題 4：登入後仍顯示未登入

**原因：** 瀏覽器快取問題

**解決方法：**
1. **強制重新載入：** 按 `Ctrl + Shift + R`（Windows）或 `Cmd + Shift + R`（Mac）
2. **清除快取：** 按 `Ctrl + Shift + Delete`，清除快取的圖片和檔案
3. **使用無痕模式：** 開啟瀏覽器無痕視窗測試

### 問題 5：端口被佔用

**錯誤：** `Address already in use`

**解決：**
1. 檢查是否有其他服務在使用相同端口
2. 或修改 `.env` 中的 `PORT=5001`（後端）或使用其他端口（前端）

### 問題 6：資料庫還原失敗

**錯誤：** `relation "xxx" already exists`

**解決：**
```bash
# 先刪除現有資料庫
psql -U postgres
DROP DATABASE campus_trading;
CREATE DATABASE campus_trading;
\q

# 再還原備份
pg_restore -h localhost -p 5432 -U postgres -d campus_trading -c database_backups/postgresql_campus_trading_20251210_004949.backup
```

---

## 📝 測試帳號

如果使用備份檔還原，系統中可能包含以下測試帳號：

- **管理員帳號：** `fanjosh2005@gmail.com`（管理員權限）
- **測試帳號：** `test1@gmail.com` ~ `test105@gmail.com`（密碼：`123456`）

**注意：** 請根據實際還原的資料庫內容確認可用帳號。

---

## 🔒 安全性說明

1. **密碼加密：** 使用 bcrypt 加密儲存
2. **JWT 認證：** API 使用 JWT Token 進行認證
3. **SQL 注入防護：** 使用參數化查詢
4. **CORS 設定：** 開發環境允許所有來源（生產環境需限制）

---

## 📚 相關文件

- **`啟動說明.md`** - 詳細啟動指南（包含更多故障排除）
- **`outline.tex`** - 完整的系統分析與設計文件（LaTeX）
  - ER Diagram
  - 資料字典
  - SQL 指令範例
  - 併行控制說明
- **`資料庫備份說明.md`** - 資料庫備份與還原詳細說明
- **`.backend/README.md`** - 後端 API 詳細文檔

---

## 🎯 功能特色

### 使用者功能
- ✅ 註冊與登入（JWT 認證）
- ✅ 商品上架與管理
- ✅ 商品瀏覽與搜尋（分類、關鍵字）
- ✅ 提出交易請求（購買/交換）
- ✅ 管理交易請求（接受/拒絕/取消）
- ✅ 完成交易與確認面交
- ✅ 交易評價（點讚/倒讚/不做評價）
- ✅ 訊息對話
- ✅ 檢舉功能
- ✅ 查看交易紀錄
- ✅ 帳號管理（修改密碼、軟刪除帳號）

### 管理員功能
- ✅ 商品管理（查詢、刪除、更新狀態）
- ✅ 使用者管理（查詢、停權）
- ✅ 檢舉處理（查詢、處理）
- ✅ 分類管理
- ✅ 平台統計

### 系統功能
- ✅ 併行控制（防止重複請求，使用 SELECT FOR UPDATE）
- ✅ 交易狀態管理（available → reserved → sold/exchanged）
- ✅ 軟刪除機制（帳號刪除後保留歷史資料，標記為已刪除）
- ✅ 搜尋紀錄（MongoDB - 自動記錄所有商品搜尋行為）
- ✅ 活動記錄（MongoDB）
- ✅ 商品推薦系統（MongoDB）

### 軟刪除功能說明

當使用者刪除帳號時，系統採用「軟刪除」機制：

- **帳號狀態**：帳號會被標記為已刪除（`deleted_at` 欄位），但不會從資料庫中完全移除
- **資料保留**：所有歷史資料都會保留，包括：
  - 交易紀錄
  - 評價與評論
  - 訊息對話紀錄
  - 檢舉記錄
- **功能限制**：
  - 已刪除帳號無法再登入系統
  - 該用戶的所有商品會自動下架（狀態改為 `removed`）
  - 其他用戶無法對已刪除帳號的商品發起新的交易請求
  - 無法向已刪除帳號發送新訊息
- **顯示標記**：
  - 在後台管理介面中，已刪除帳號會顯示「(已刪除)」標記
  - 在對話紀錄中，已刪除用戶的名稱會顯示「(已刪除)」
  - 在交易請求中，已刪除用戶的名稱會顯示「(已刪除)」

---

## 📞 需要幫助？

如果遇到問題：

1. **檢查服務狀態：**
   - 確認 PostgreSQL 服務運行中
   - 確認後端服務運行中（`http://localhost:5000`）
   - 確認前端服務運行中（`http://localhost:8000`）

2. **檢查日誌：**
   - 後端日誌：查看運行 `python app.py` 的終端
   - 前端日誌：開啟瀏覽器開發者工具（F12）查看 Console

3. **檢查配置：**
   - 確認 `.backend/.env` 檔案存在且正確設定
   - 確認資料庫已還原或初始化

4. **參考文件：**
   - `啟動說明.md` - 更詳細的故障排除
   - `outline.tex` - 系統設計文件

---

## 📄 授權

本專案為資料庫課程（114-1）期末專案。

---

**最後更新：** 2024-12-10

**最新變更：**
- 實作軟刪除功能：帳號刪除後保留歷史資料，標記為已刪除
- 添加 `deleted_at` 欄位到 `user` 表
- 更新相關 API 以支援軟刪除機制
