"""
建立管理員帳號的腳本
用法: python create_admin.py <email> <role>
role 可以是 'PlatformAdmin' 或 'ClubAdmin'
"""
import sys
import os
from pathlib import Path

# 添加父目錄到路徑
sys.path.append(str(Path(__file__).parent))

from dotenv import load_dotenv
from config.database import DatabaseConfig

load_dotenv()

def create_admin(email, role='PlatformAdmin'):
    """將指定 email 的使用者設為管理員"""
    if role not in ('PlatformAdmin', 'ClubAdmin'):
        print(f"錯誤: role 必須是 'PlatformAdmin' 或 'ClubAdmin'")
        return False
    
    conn = DatabaseConfig.get_postgres_connection()
    cursor = conn.cursor()
    
    try:
        # 查詢使用者
        cursor.execute("SELECT user_id FROM \"user\" WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user:
            print(f"錯誤: 找不到 email 為 '{email}' 的使用者")
            DatabaseConfig.return_postgres_connection(conn)
            return False
        
        user_id = user[0]
        
        # 檢查是否已經是管理員
        cursor.execute("SELECT admin_id FROM admin WHERE user_id = %s", (user_id,))
        if cursor.fetchone():
            print(f"使用者 {email} 已經是管理員")
            DatabaseConfig.return_postgres_connection(conn)
            return True
        
        # 建立管理員記錄
        cursor.execute("""
            INSERT INTO admin (user_id, role)
            VALUES (%s, %s)
            RETURNING admin_id
        """, (user_id, role))
        
        admin_id = cursor.fetchone()[0]
        conn.commit()
        
        print(f"成功: 已將 {email} 設為 {role} (admin_id: {admin_id})")
        DatabaseConfig.return_postgres_connection(conn)
        return True
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        print(f"錯誤: {str(e)}")
        return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python create_admin.py <email> [role]")
        print("role 可以是 'PlatformAdmin' (預設) 或 'ClubAdmin'")
        sys.exit(1)
    
    email = sys.argv[1]
    role = sys.argv[2] if len(sys.argv) > 2 else 'PlatformAdmin'
    
    create_admin(email, role)

