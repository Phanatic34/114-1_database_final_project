"""
使用者認證相關 API
"""
from flask import Blueprint, request, jsonify
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))
from config.database import DatabaseConfig
from utils.auth import generate_token
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
            SELECT user_id, user_name, email, password, status, student_id
            FROM "user"
            WHERE email = %s
        """, (email,))
        
        user = cursor.fetchone()
        DatabaseConfig.return_postgres_connection(conn)
        
        if not user:
            return jsonify({'error': 'Email 或密碼錯誤'}), 401
        
        if user[4] != 'active':
            return jsonify({'error': '帳號已被停權'}), 403
        
        # 驗證密碼
        if not bcrypt.checkpw(password.encode('utf-8'), user[3].encode('utf-8')):
            return jsonify({'error': 'Email 或密碼錯誤'}), 401
        
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
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

