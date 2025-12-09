"""
MongoDB Schema 定義
用於 NoSQL 部分的資料結構
"""
from pymongo import MongoClient, ASCENDING, DESCENDING
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from config.database import DatabaseConfig

def init_mongodb_collections():
    """初始化 MongoDB collections 和索引"""
    try:
        # 确保加载环境变量
        from dotenv import load_dotenv
        load_dotenv()
        
        db = DatabaseConfig.get_mongo_db()
        
        # ============================================
        # 1. 使用者活動記錄 (user_activities)
        # 用於記錄使用者的瀏覽歷史、搜尋記錄等
        # ============================================
        user_activities = db['user_activities']
        user_activities.create_index([('user_id', ASCENDING), ('timestamp', DESCENDING)])
        user_activities.create_index([('activity_type', ASCENDING)])
        
        # ============================================
        # 2. 商品瀏覽統計 (product_views)
        # 用於記錄商品瀏覽次數、熱門商品等
        # ============================================
        product_views = db['product_views']
        product_views.create_index([('product_id', ASCENDING)])
        product_views.create_index([('view_date', DESCENDING)])
        
        # ============================================
        # 3. 搜尋記錄 (search_logs)
        # 用於記錄使用者的搜尋行為，用於推薦系統
        # ============================================
        search_logs = db['search_logs']
        search_logs.create_index([('user_id', ASCENDING), ('timestamp', DESCENDING)])
        search_logs.create_index([('search_keywords', 'text')])  # 全文搜尋索引
        
        # ============================================
        # 4. 推薦資料 (recommendations)
        # 用於儲存商品推薦結果
        # ============================================
        recommendations = db['recommendations']
        recommendations.create_index([('user_id', ASCENDING)])
        recommendations.create_index([('product_id', ASCENDING)])
        
        # ============================================
        # 5. 快取資料 (cache)
        # 用於快取熱門商品、統計資料等
        # ============================================
        cache = db['cache']
        cache.create_index([('key', ASCENDING)], unique=True)
        cache.create_index([('expires_at', ASCENDING)])  # TTL 索引
        
        # ============================================
        # 6. 通知訊息 (notifications)
        # 用於儲存使用者的通知訊息
        # ============================================
        notifications = db['notifications']
        notifications.create_index([('user_id', ASCENDING), ('created_at', DESCENDING)])
        notifications.create_index([('is_read', ASCENDING)])
        
        print("MongoDB collections 初始化完成！")
        return True
        
    except Exception as e:
        print(f"MongoDB 初始化錯誤: {e}")
        return False

if __name__ == '__main__':
    init_mongodb_collections()

