"""
資料庫備份腳本
用於匯出 PostgreSQL 和 MongoDB 的備份檔
"""
import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

def backup_postgresql():
    """備份 PostgreSQL 資料庫"""
    print("=" * 60)
    print("開始備份 PostgreSQL 資料庫...")
    print("=" * 60)
    
    # 從環境變數讀取配置
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME', 'campus_trading')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', 'postgres')
    
    # 建立備份目錄
    backup_dir = Path(__file__).parent.parent / 'database_backups'
    backup_dir.mkdir(exist_ok=True)
    
    # 產生備份檔名（包含時間戳記）
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = backup_dir / f'postgresql_{db_name}_{timestamp}.backup'
    
    # 設定環境變數（pg_dump 會使用）
    env = os.environ.copy()
    env['PGPASSWORD'] = db_password
    
    # 執行 pg_dump
    try:
        cmd = [
            'pg_dump',
            '-h', db_host,
            '-p', db_port,
            '-U', db_user,
            '-d', db_name,
            '-F', 'c',  # 使用自訂格式（壓縮）
            '-f', str(backup_file)
        ]
        
        print(f"執行命令: {' '.join(cmd[:6])} ...")
        print(f"備份檔案: {backup_file}")
        
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            file_size = backup_file.stat().st_size / (1024 * 1024)  # MB
            print(f"✓ PostgreSQL 備份成功！")
            print(f"  檔案大小: {file_size:.2f} MB")
            print(f"  檔案位置: {backup_file}")
            return str(backup_file)
        else:
            print(f"✗ PostgreSQL 備份失敗:")
            print(result.stderr)
            return None
            
    except FileNotFoundError:
        print("✗ 錯誤: 找不到 pg_dump 命令")
        print("  請確認 PostgreSQL 已安裝並在 PATH 中")
        print("\n替代方案：使用 SQL 格式備份")
        return backup_postgresql_sql(db_host, db_port, db_name, db_user, db_password, backup_dir, timestamp)
    except Exception as e:
        print(f"✗ 備份過程發生錯誤: {e}")
        return None

def backup_postgresql_sql(db_host, db_port, db_name, db_user, db_password, backup_dir, timestamp):
    """使用 Python 備份 PostgreSQL（SQL 格式）"""
    try:
        import psycopg2
        
        backup_file = backup_dir / f'postgresql_{db_name}_{timestamp}.sql'
        
        print(f"使用 Python 連接備份...")
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )
        
        # 使用 pg_dump 的 Python 替代方案
        # 這裡我們使用 psycopg2 的 copy_expert
        cursor = conn.cursor()
        
        # 獲取所有表
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        print(f"找到 {len(tables)} 個資料表")
        
        with open(backup_file, 'w', encoding='utf-8') as f:
            # 寫入表頭
            f.write(f"-- PostgreSQL 資料庫備份\n")
            f.write(f"-- 資料庫: {db_name}\n")
            f.write(f"-- 備份時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"-- 資料表數量: {len(tables)}\n\n")
            
            # 備份每個表的結構和資料
            for table in tables:
                f.write(f"\n-- ============================================\n")
                f.write(f"-- 資料表: {table}\n")
                f.write(f"-- ============================================\n\n")
                
                # 獲取表結構
                cursor.execute(f"""
                    SELECT column_name, data_type, character_maximum_length, 
                           is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = '{table}'
                    ORDER BY ordinal_position;
                """)
                
                columns = cursor.fetchall()
                f.write(f"-- 表結構:\n")
                for col in columns:
                    f.write(f"--   {col[0]}: {col[1]}\n")
                f.write(f"\n")
                
                # 獲取資料
                cursor.execute(f'SELECT * FROM "{table}";')
                rows = cursor.fetchall()
                
                if rows:
                    f.write(f"-- 資料筆數: {len(rows)}\n")
                    # 這裡只寫入結構，實際資料可以通過 COPY 命令匯出
                    f.write(f"-- 注意: 此備份僅包含結構，完整資料請使用 pg_dump\n")
        
        cursor.close()
        conn.close()
        
        file_size = backup_file.stat().st_size / 1024  # KB
        print(f"✓ PostgreSQL 結構備份成功！")
        print(f"  檔案大小: {file_size:.2f} KB")
        print(f"  檔案位置: {backup_file}")
        print(f"  注意: 此為結構備份，完整備份請使用 pg_dump")
        return str(backup_file)
        
    except ImportError:
        print("✗ 錯誤: 無法匯入 psycopg2")
        return None
    except Exception as e:
        print(f"✗ 備份過程發生錯誤: {e}")
        return None

def backup_mongodb():
    """備份 MongoDB 資料庫"""
    print("\n" + "=" * 60)
    print("開始備份 MongoDB 資料庫...")
    print("=" * 60)
    
    mongo_uri = os.getenv('MONGO_URI')
    mongo_host = os.getenv('MONGO_HOST', 'localhost')
    mongo_port = os.getenv('MONGO_PORT', '27017')
    mongo_db = os.getenv('MONGO_DB', 'campus_trading_nosql')
    mongo_user = os.getenv('MONGO_USER', '')
    mongo_password = os.getenv('MONGO_PASSWORD', '')
    
    # 建立備份目錄
    backup_dir = Path(__file__).parent.parent / 'database_backups'
    backup_dir.mkdir(exist_ok=True)
    
    # 產生備份檔名
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = backup_dir / f'mongodb_{mongo_db}_{timestamp}'
    
    try:
        if mongo_uri:
            # MongoDB Atlas
            print(f"檢測到 MongoDB Atlas 連接")
            print(f"資料庫: {mongo_db}")
            print(f"\nMongoDB Atlas 備份說明:")
            print("1. 登入 MongoDB Atlas 網站")
            print("2. 選擇您的 Cluster")
            print("3. 點擊 '...' 選單 → 'Export'")
            print("4. 選擇要匯出的集合")
            print("5. 下載備份檔案")
            print(f"\n或使用 mongodump 命令:")
            print(f"  mongodump --uri=\"{mongo_uri}\" --out=\"{backup_file}\"")
            return None
        else:
            # 本地 MongoDB
            print(f"使用本地 MongoDB 備份")
            print(f"Host: {mongo_host}:{mongo_port}")
            print(f"Database: {mongo_db}")
            
            # 檢查 mongodump 是否可用
            try:
                subprocess.run(['mongodump', '--version'], 
                             capture_output=True, check=True)
            except (FileNotFoundError, subprocess.CalledProcessError):
                print("✗ 錯誤: 找不到 mongodump 命令")
                print("  請確認 MongoDB 已安裝並在 PATH 中")
                return backup_mongodb_python(mongo_host, mongo_port, mongo_db, backup_dir, timestamp)
            
            # 建立 mongodump 命令
            cmd = [
                'mongodump',
                '--host', f'{mongo_host}:{mongo_port}',
                '--db', mongo_db,
                '--out', str(backup_file)
            ]
            
            if mongo_user and mongo_password:
                cmd.extend(['--username', mongo_user, '--password', mongo_password, '--authenticationDatabase', 'admin'])
            
            print(f"執行命令: {' '.join(cmd)}")
            print(f"備份目錄: {backup_file}")
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"✓ MongoDB 備份成功！")
                print(f"  備份目錄: {backup_file}")
                return str(backup_file)
            else:
                print(f"✗ MongoDB 備份失敗:")
                print(result.stderr)
                return None
                
    except Exception as e:
        print(f"✗ 備份過程發生錯誤: {e}")
        return None

def backup_mongodb_python(mongo_host, mongo_port, mongo_db, backup_dir, timestamp):
    """使用 Python 備份 MongoDB"""
    try:
        from pymongo import MongoClient
        
        backup_file = backup_dir / f'mongodb_{mongo_db}_{timestamp}.json'
        
        print(f"使用 Python 連接備份...")
        
        # 連接 MongoDB
        if mongo_user and mongo_password:
            client = MongoClient(
                f'mongodb://{mongo_user}:{mongo_password}@{mongo_host}:{mongo_port}/'
            )
        else:
            client = MongoClient(f'mongodb://{mongo_host}:{mongo_port}/')
        
        db = client[mongo_db]
        collections = db.list_collection_names()
        
        print(f"找到 {len(collections)} 個集合")
        
        import json
        backup_data = {}
        
        for collection_name in collections:
            collection = db[collection_name]
            documents = list(collection.find())
            backup_data[collection_name] = documents
            print(f"  備份集合 '{collection_name}': {len(documents)} 筆資料")
        
        # 寫入 JSON 檔案
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, ensure_ascii=False, indent=2, default=str)
        
        client.close()
        
        file_size = backup_file.stat().st_size / (1024 * 1024)  # MB
        print(f"✓ MongoDB 備份成功！")
        print(f"  檔案大小: {file_size:.2f} MB")
        print(f"  檔案位置: {backup_file}")
        return str(backup_file)
        
    except ImportError:
        print("✗ 錯誤: 無法匯入 pymongo")
        return None
    except Exception as e:
        print(f"✗ 備份過程發生錯誤: {e}")
        return None

def main():
    """主函數"""
    print("\n" + "=" * 60)
    print("資料庫備份工具")
    print("=" * 60)
    print()
    
    # 備份 PostgreSQL
    pg_backup = backup_postgresql()
    
    # 備份 MongoDB
    mongo_backup = backup_mongodb()
    
    # 總結
    print("\n" + "=" * 60)
    print("備份完成總結")
    print("=" * 60)
    
    if pg_backup:
        print(f"✓ PostgreSQL 備份: {pg_backup}")
    else:
        print("✗ PostgreSQL 備份失敗")
    
    if mongo_backup:
        print(f"✓ MongoDB 備份: {mongo_backup}")
    else:
        print("✗ MongoDB 備份失敗或跳過")
    
    backup_dir = Path(__file__).parent.parent / 'database_backups'
    print(f"\n所有備份檔案存放在: {backup_dir}")
    print("\n備份完成！")

if __name__ == '__main__':
    main()

