"""
資料庫初始化腳本
用於建立資料庫連線並執行 schema.sql
"""
import psycopg2
from psycopg2 import sql
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

sys.path.append(str(Path(__file__).parent.parent))

def init_database():
    """初始化資料庫，建立所有表格"""
    
    # 從環境變數或預設值讀取資料庫連線資訊
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': os.getenv('DB_NAME', 'campus_trading'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'postgres')
    }
    
    try:
        # 連接到 PostgreSQL
        conn = psycopg2.connect(**db_config)
        conn.autocommit = True
        cursor = conn.cursor()
        
        print(f"成功連接到資料庫: {db_config['database']}")
        
        # 讀取並執行 schema.sql
        schema_path = Path(__file__).parent / 'schema.sql'
        
        if not schema_path.exists():
            print(f"錯誤: 找不到 schema.sql 檔案於 {schema_path}")
            return False
        
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        # 執行 SQL 腳本
        print("正在執行 schema.sql...")
        cursor.execute(schema_sql)
        
        print("資料庫初始化完成！")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"資料庫錯誤: {e}")
        return False
    except Exception as e:
        print(f"發生錯誤: {e}")
        return False

if __name__ == '__main__':
    init_database()

