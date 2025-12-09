"""
MongoDB 資料模型
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from config.database import DatabaseConfig

class UserActivity:
    """使用者活動記錄"""
    
    @staticmethod
    def log_activity(user_id: int, activity_type: str, details: Dict[str, Any]):
        """記錄使用者活動"""
        db = DatabaseConfig.get_mongo_db()
        collection = db['user_activities']
        
        activity = {
            'user_id': user_id,
            'activity_type': activity_type,  # 'view_product', 'search', 'create_product', etc.
            'details': details,
            'timestamp': datetime.utcnow()
        }
        
        return collection.insert_one(activity)

class ProductView:
    """商品瀏覽統計"""
    
    @staticmethod
    def increment_view(product_id: int, user_id: Optional[int] = None):
        """增加商品瀏覽次數"""
        db = DatabaseConfig.get_mongo_db()
        collection = db['product_views']
        
        today = datetime.utcnow().date()
        
        collection.update_one(
            {'product_id': product_id, 'view_date': today},
            {
                '$inc': {'view_count': 1},
                '$set': {'last_viewed_at': datetime.utcnow()},
                '$setOnInsert': {'product_id': product_id, 'view_date': today}
            },
            upsert=True
        )
        
        if user_id:
            collection.update_one(
                {'product_id': product_id, 'view_date': today},
                {'$addToSet': {'viewers': user_id}}
            )

class SearchLog:
    """搜尋記錄"""
    
    @staticmethod
    def log_search(user_id: Optional[int], keywords: str, filters: Dict[str, Any], result_count: int):
        """記錄搜尋行為"""
        db = DatabaseConfig.get_mongo_db()
        collection = db['search_logs']
        
        log = {
            'user_id': user_id,
            'search_keywords': keywords,
            'filters': filters,
            'result_count': result_count,
            'timestamp': datetime.utcnow()
        }
        
        return collection.insert_one(log)

class Recommendation:
    """商品推薦"""
    
    @staticmethod
    def save_recommendations(user_id: int, recommendations: List[Dict[str, Any]]):
        """儲存推薦結果"""
        db = DatabaseConfig.get_mongo_db()
        collection = db['recommendations']
        
        # 刪除舊的推薦
        collection.delete_many({'user_id': user_id})
        
        # 插入新的推薦
        docs = [{'user_id': user_id, **rec} for rec in recommendations]
        if docs:
            collection.insert_many(docs)
    
    @staticmethod
    def get_recommendations(user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """取得推薦商品"""
        db = DatabaseConfig.get_mongo_db()
        collection = db['recommendations']
        
        recommendations = list(collection.find(
            {'user_id': user_id}
        ).sort('score', -1).limit(limit))
        
        # 移除 MongoDB 的 _id
        for rec in recommendations:
            rec.pop('_id', None)
        
        return recommendations

class Notification:
    """通知訊息"""
    
    @staticmethod
    def create_notification(user_id: int, notification_type: str, title: str, 
                          content: str, metadata: Optional[Dict[str, Any]] = None):
        """建立通知"""
        db = DatabaseConfig.get_mongo_db()
        collection = db['notifications']
        
        notification = {
            'user_id': user_id,
            'notification_type': notification_type,  # 'trade_request', 'message', 'review', etc.
            'title': title,
            'content': content,
            'metadata': metadata or {},
            'is_read': False,
            'created_at': datetime.utcnow()
        }
        
        return collection.insert_one(notification)
    
    @staticmethod
    def get_user_notifications(user_id: int, limit: int = 20, unread_only: bool = False):
        """取得使用者通知"""
        db = DatabaseConfig.get_mongo_db()
        collection = db['notifications']
        
        query = {'user_id': user_id}
        if unread_only:
            query['is_read'] = False
        
        notifications = list(collection.find(query)
                           .sort('created_at', -1)
                           .limit(limit))
        
        for notif in notifications:
            notif.pop('_id', None)
        
        return notifications
    
    @staticmethod
    def mark_as_read(notification_id: str, user_id: int):
        """標記為已讀"""
        db = DatabaseConfig.get_mongo_db()
        collection = db['notifications']
        
        collection.update_one(
            {'_id': notification_id, 'user_id': user_id},
            {'$set': {'is_read': True}}
        )

