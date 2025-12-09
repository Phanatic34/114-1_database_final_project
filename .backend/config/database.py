"""
資料庫連線配置
"""
import os
import psycopg2
from psycopg2 import pool
from pymongo import MongoClient
from typing import Optional
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

class DatabaseConfig:
    """資料庫配置類別"""
    
    # PostgreSQL 配置
    POSTGRES_HOST = os.getenv('DB_HOST', 'localhost')
    POSTGRES_PORT = os.getenv('DB_PORT', '5432')
    POSTGRES_DB = os.getenv('DB_NAME', 'campus_trading')
    POSTGRES_USER = os.getenv('DB_USER', 'postgres')
    POSTGRES_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')
    
    # MongoDB 配置
    MONGO_HOST = os.getenv('MONGO_HOST', 'localhost')
    MONGO_PORT = int(os.getenv('MONGO_PORT', '27017'))
    MONGO_DB = os.getenv('MONGO_DB', 'campus_trading_nosql')
    MONGO_USER = os.getenv('MONGO_USER', '')
    MONGO_PASSWORD = os.getenv('MONGO_PASSWORD', '')
    
    # PostgreSQL 連線池
    _postgres_pool: Optional[pool.ThreadedConnectionPool] = None
    
    # MongoDB 客戶端
    _mongo_client: Optional[MongoClient] = None
    
    @classmethod
    def get_postgres_pool(cls):
        """取得 PostgreSQL 連線池"""
        if cls._postgres_pool is None:
            cls._postgres_pool = pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=10,
                host=cls.POSTGRES_HOST,
                port=cls.POSTGRES_PORT,
                database=cls.POSTGRES_DB,
                user=cls.POSTGRES_USER,
                password=cls.POSTGRES_PASSWORD
            )
        return cls._postgres_pool
    
    @classmethod
    def get_postgres_connection(cls):
        """取得 PostgreSQL 連線"""
        pool = cls.get_postgres_pool()
        return pool.getconn()
    
    @classmethod
    def return_postgres_connection(cls, conn):
        """歸還 PostgreSQL 連線到池中"""
        pool = cls.get_postgres_pool()
        pool.putconn(conn)
    
    @classmethod
    def get_mongo_client(cls):
        """取得 MongoDB 客戶端"""
        if cls._mongo_client is None:
            # 優先使用 MONGO_URI（適用於 MongoDB Atlas）
            mongo_uri = os.getenv('MONGO_URI')
            
            if mongo_uri:
                # 使用完整的連接字符串（MongoDB Atlas）
                cls._mongo_client = MongoClient(mongo_uri)
            elif cls.MONGO_USER and cls.MONGO_PASSWORD:
                # 使用分離的配置（本地 MongoDB 或自定義設定）
                # 檢查是否使用 SRV（MongoDB Atlas）
                use_srv = os.getenv('MONGO_USE_SRV', 'false').lower() == 'true'
                if use_srv:
                    mongo_uri = f"mongodb+srv://{cls.MONGO_USER}:{cls.MONGO_PASSWORD}@{cls.MONGO_HOST}/{cls.MONGO_DB}?retryWrites=true&w=majority"
                else:
                    mongo_uri = f"mongodb://{cls.MONGO_USER}:{cls.MONGO_PASSWORD}@{cls.MONGO_HOST}:{cls.MONGO_PORT}/{cls.MONGO_DB}"
                cls._mongo_client = MongoClient(mongo_uri)
            else:
                # 無認證的本地 MongoDB
                mongo_uri = f"mongodb://{cls.MONGO_HOST}:{cls.MONGO_PORT}/{cls.MONGO_DB}"
                cls._mongo_client = MongoClient(mongo_uri)
        return cls._mongo_client
    
    @classmethod
    def get_mongo_db(cls):
        """取得 MongoDB 資料庫物件"""
        client = cls.get_mongo_client()
        return client[cls.MONGO_DB]
    
    @classmethod
    def close_all(cls):
        """關閉所有連線"""
        if cls._postgres_pool:
            cls._postgres_pool.closeall()
        if cls._mongo_client:
            cls._mongo_client.close()

