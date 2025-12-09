"""
使用者認證相關 API
"""
from flask import Blueprint, request, jsonify
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))
from config.database import DatabaseConfig
from utils.auth import generate_token, token_required
import bcrypt

bp = Blueprint('auth', __name__)

@bp.route('/register', methods=['POST'])
def register():
    """使用者註冊"""
    try:
        data = request.get_json()
        user_name = data.get('user_name')
        student_id = data.get('student_id')
        email = data.get('email')
        password = data.get('password')
        phone = data.get('phone')
        
        if not all([user_name, student_id, email, password]):
            return jsonify({'error': '缺少必要欄位'}), 400
        
        # 檢查 email 和 student_id 是否已存在
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT user_id FROM \"user\" WHERE email = %s OR student_id = %s", 
                      (email, student_id))
        if cursor.fetchone():
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': 'Email 或學號已存在'}), 400
        
        # 加密密碼
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # 插入新使用者
        cursor.execute("""
            INSERT INTO "user" (user_name, student_id, email, password, phone, register_date)
            VALUES (%s, %s, %s, %s, %s, CURRENT_DATE)
            RETURNING user_id, user_name, email, student_id
        """, (user_name, student_id, email, hashed_password, phone))
        
        user = cursor.fetchone()
        conn.commit()
        
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({
            'message': '註冊成功',
            'user': {
                'user_id': user[0],
                'user_name': user[1],
                'email': user[2],
                'student_id': user[3]
            }
        }), 201
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

@bp.route('/login', methods=['POST'])
def login():
    """使用者登入"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': '請提供 email 和密碼'}), 400
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT user_id, user_name, email, password, status, student_id, deleted_at
            FROM "user"
            WHERE email = %s
        """, (email,))
        
        user = cursor.fetchone()
        
        if not user:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': 'Email 或密碼錯誤'}), 401
        
        # 檢查帳號是否已刪除
        if user[6] is not None:  # deleted_at 不為 NULL
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '帳號已被刪除，無法登入'}), 403
        
        if user[4] != 'active':
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '帳號已被停權'}), 403
        
        # 驗證密碼
        if not bcrypt.checkpw(password.encode('utf-8'), user[3].encode('utf-8')):
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': 'Email 或密碼錯誤'}), 401
        
        # 檢查是否為管理員
        cursor.execute("SELECT role FROM admin WHERE user_id = %s", (user[0],))
        admin_result = cursor.fetchone()
        is_admin = admin_result is not None
        admin_role = admin_result[0] if admin_result else None
        
        DatabaseConfig.return_postgres_connection(conn)
        
        # 生成 JWT token
        token = generate_token(user[0])
        
        return jsonify({
            'message': '登入成功',
            'token': token,
            'user_id': user[0],  # 向後兼容
            'user': {
                'user_id': user[0],
                'user_name': user[1],
                'email': user[2],
                'student_id': user[5]
            },
            'is_admin': is_admin,
            'admin_role': admin_role
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/delete-account', methods=['DELETE'])
@token_required
def delete_account(user_id):
    """使用者軟刪除自己的帳號（設置 deleted_at，下架所有商品，保留歷史資料）"""
    conn = None
    try:
        # 需要再次驗證密碼
        data = request.get_json()
        password = data.get('password')
        
        if not password:
            return jsonify({'error': '請提供密碼以確認刪除'}), 400
        
        conn = DatabaseConfig.get_postgres_connection()
        # 確保連線在 autocommit 模式（檢查階段）
        conn.autocommit = True
        cursor = conn.cursor()
        
        # 驗證密碼並檢查是否已刪除
        cursor.execute("""
            SELECT password, user_name, deleted_at FROM "user" WHERE user_id = %s
        """, (user_id,))
        
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '使用者不存在'}), 404
        
        if user[2] is not None:  # deleted_at 不為 NULL，表示已刪除
            cursor.close()
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '帳號已被刪除'}), 400
        
        if not bcrypt.checkpw(password.encode('utf-8'), user[0].encode('utf-8')):
            cursor.close()
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '密碼錯誤'}), 401
        
        # 檢查是否有進行中的交易請求
        # 檢查作為請求者、目標商品的擁有者、或提供商品的擁有者
        cursor.execute("""
            SELECT COUNT(*) 
            FROM trade_request tr
            LEFT JOIN product p_target ON tr.target_product_id = p_target.product_id
            LEFT JOIN product p_offered ON tr.offered_product_id = p_offered.product_id
            WHERE (tr.requester_id = %s 
                   OR p_target.owner_id = %s 
                   OR p_offered.owner_id = %s)
            AND tr.status IN ('Pending', 'Accepted')
        """, (user_id, user_id, user_id))
        
        active_requests = cursor.fetchone()[0]
        
        if active_requests > 0:
            cursor.close()
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({
                'error': '無法刪除帳號：您有進行中的交易請求，請先處理完所有交易請求後再刪除'
            }), 400
        
        # 關閉檢查階段的 cursor
        cursor.close()
        
        # 開始事務（軟刪除階段）
        conn.autocommit = False
        cursor = conn.cursor()
        
        # 1. 設置 deleted_at 時間戳
        cursor.execute("""
            UPDATE "user" 
            SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
        """, (user_id,))
        
        # 2. 下架該用戶的所有商品（將狀態改為 removed）
        cursor.execute("""
            UPDATE product 
            SET status = 'removed', updated_at = CURRENT_TIMESTAMP
            WHERE owner_id = %s AND status IN ('available', 'reserved')
        """, (user_id,))
        
        products_deactivated = cursor.rowcount
        
        conn.commit()
        cursor.close()
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({
            'message': f'帳號 {user[1]} 已刪除',
            'note': f'帳號已標記為已刪除，無法再登入。已下架 {products_deactivated} 個商品。歷史交易紀錄、評價等資料已保留。'
        }), 200
        
    except Exception as e:
        import traceback
        print(f"刪除帳號錯誤: {str(e)}")
        print(traceback.format_exc())
        if conn:
            try:
                # 只有在事務模式下才需要 rollback
                if not conn.autocommit:
                    conn.rollback()
            except:
                pass
            try:
                if 'cursor' in locals() and cursor:
                    cursor.close()
            except:
                pass
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

