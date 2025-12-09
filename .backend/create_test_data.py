"""
建立測試資料的腳本
創建三個測試帳號，每個帳號創建兩個商品
"""
import sys
import os
from pathlib import Path
import bcrypt
from datetime import datetime

# 添加父目錄到路徑
sys.path.append(str(Path(__file__).parent))

from dotenv import load_dotenv
from config.database import DatabaseConfig

load_dotenv()

def create_user(email, password, user_name, student_id=None):
    """創建使用者"""
    conn = DatabaseConfig.get_postgres_connection()
    cursor = conn.cursor()
    
    try:
        # 檢查是否已存在
        cursor.execute("SELECT user_id FROM \"user\" WHERE email = %s", (email,))
        if cursor.fetchone():
            print(f"使用者 {email} 已存在，跳過")
            DatabaseConfig.return_postgres_connection(conn)
            return None
        
        # 加密密碼
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # 創建使用者
        cursor.execute("""
            INSERT INTO "user" (user_name, student_id, email, password, register_date, status)
            VALUES (%s, %s, %s, %s, %s, 'active')
            RETURNING user_id
        """, (user_name, student_id or f"B{email.split('@')[0]}", email, hashed_password, datetime.now()))
        
        user_id = cursor.fetchone()[0]
        conn.commit()
        
        print(f"✓ 已創建使用者: {email} (user_id: {user_id})")
        DatabaseConfig.return_postgres_connection(conn)
        return user_id
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        print(f"✗ 創建使用者 {email} 失敗: {str(e)}")
        return None

def create_product(owner_id, category_id, product_name, price, condition, description, trade_option='sale'):
    """創建商品"""
    conn = DatabaseConfig.get_postgres_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO product (
                owner_id, category_id, product_name, price, 
                trade_option, condition, description, 
                status, post_date
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'available', %s)
            RETURNING product_id
        """, (
            owner_id, category_id, product_name, price,
            trade_option, condition, description,
            datetime.now()
        ))
        
        product_id = cursor.fetchone()[0]
        conn.commit()
        
        print(f"  ✓ 已創建商品: {product_name} (product_id: {product_id})")
        DatabaseConfig.return_postgres_connection(conn)
        return product_id
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        print(f"  ✗ 創建商品 {product_name} 失敗: {str(e)}")
        return None

def main():
    # 測試帳號資料
    test_users = [
        {
            'email': 'test1@gmail.com',
            'password': '123456',
            'name': '測試使用者一',
            'student_id': 'B12705001'
        },
        {
            'email': 'test2@gmail.com',
            'password': '123456',
            'name': '測試使用者二',
            'student_id': 'B12705002'
        },
        {
            'email': 'test3@gmail.com',
            'password': '123456',
            'name': '測試使用者三',
            'student_id': 'B12705003'
        }
    ]
    
    # 商品範本（每個使用者會創建兩個）
    product_templates = [
        {
            'category_id': 1,  # Textbooks
            'product_name': '微積分課本',
            'price': 300,
            'condition': 'Good',
            'description': '使用一學期，狀況良好，有部分筆記',
            'trade_option': 'sale'
        },
        {
            'category_id': 2,  # Electronics
            'product_name': '二手筆電',
            'price': 5000,
            'condition': 'Used',
            'description': '功能正常，外觀有使用痕跡',
            'trade_option': 'both'
        }
    ]
    
    print("開始創建測試資料...\n")
    
    # 創建使用者並為每個使用者創建商品
    for user_data in test_users:
        print(f"\n處理使用者: {user_data['email']}")
        user_id = create_user(
            user_data['email'],
            user_data['password'],
            user_data['name'],
            user_data['student_id']
        )
        
        if user_id:
            # 為此使用者創建兩個商品
            for i, template in enumerate(product_templates, 1):
                product_name = f"{user_data['name']}的{template['product_name']}"
                create_product(
                    user_id,
                    template['category_id'],
                    product_name,
                    template['price'],
                    template['condition'],
                    template['description'],
                    template['trade_option']
                )
    
    print("\n✓ 測試資料創建完成！")
    print("\n測試帳號資訊：")
    print("=" * 50)
    for user_data in test_users:
        print(f"Email: {user_data['email']}")
        print(f"密碼: {user_data['password']}")
        print(f"名稱: {user_data['name']}")
        print("-" * 50)

if __name__ == '__main__':
    main()

