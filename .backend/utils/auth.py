"""
認證工具函數（JWT 版本）
"""
from functools import wraps
from flask import request, jsonify
import jwt
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv('JWT_SECRET', 'a456233d5f2941d5')
JWT_EXPIRATION = int(os.getenv('JWT_EXPIRATION', '86400'))  # 預設 24 小時

def generate_token(user_id):
    """生成 JWT token"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(seconds=JWT_EXPIRATION),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_token(token):
    """驗證 JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def get_token_from_request():
    """從請求中取得 token"""
    # 從 Authorization header 取得
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = auth_header.split(' ')[1]  # Bearer <token>
            return token
        except IndexError:
            pass
    
    # 從 query 參數取得（向後兼容）
    token = request.args.get('token')
    if token:
        return token
    
    return None

def token_required(f):
    """需要 JWT token 的裝飾器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_token_from_request()
        
        if not token:
            return jsonify({'error': '需要提供認證 token'}), 401
        
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'error': '無效或過期的 token'}), 401
        
        # 將 user_id 傳遞給路由函數
        return f(user_id, *args, **kwargs)
    
    return decorated

# 向後兼容
def get_user_id():
    """從請求中取得 user_id（從 JWT token）"""
    token = get_token_from_request()
    if token:
        return verify_token(token)
    return None

def user_id_required(f):
    """需要 user_id 的裝飾器（別名）"""
    return token_required(f)
