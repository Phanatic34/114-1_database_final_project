"""
訊息相關 API
"""
from flask import Blueprint, request, jsonify
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))
from config.database import DatabaseConfig
from utils.auth import token_required

bp = Blueprint('messages', __name__)

@bp.route('', methods=['POST'])
@token_required
def send_message(user_id):
    """發送訊息"""
    try:
        data = request.get_json()
        request_id = data.get('request_id')
        receiver_id = data.get('receiver_id')
        content = data.get('content')
        
        if not all([request_id, receiver_id, content]):
            return jsonify({'error': '缺少必要欄位'}), 400
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 檢查請求是否存在
        cursor.execute("""
            SELECT tr.requester_id, p.owner_id
            FROM trade_request tr
            JOIN product p ON tr.target_product_id = p.product_id
            WHERE tr.request_id = %s
        """, (request_id,))
        
        request_data = cursor.fetchone()
        if not request_data:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '請求不存在'}), 404
        
        # 檢查是否為交易參與者
        if user_id not in [request_data[0], request_data[1]]:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '無權限發送訊息'}), 403
        
        # 檢查接收者是否為交易參與者
        if receiver_id not in [request_data[0], request_data[1]]:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '無效的接收者'}), 400
        
        # 新增訊息
        cursor.execute("""
            INSERT INTO message (request_id, sender_id, receiver_id, content)
            VALUES (%s, %s, %s, %s)
            RETURNING message_id
        """, (request_id, user_id, receiver_id, content))
        
        message_id = cursor.fetchone()[0]
        conn.commit()
        
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({
            'message': '訊息發送成功',
            'message_id': message_id
        }), 201
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

@bp.route('/request/<int:request_id>', methods=['GET'])
@token_required
def get_messages(user_id, request_id):
    """查詢對話紀錄"""
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 檢查是否為交易參與者
        cursor.execute("""
            SELECT tr.requester_id, p.owner_id
            FROM trade_request tr
            JOIN product p ON tr.target_product_id = p.product_id
            WHERE tr.request_id = %s
        """, (request_id,))
        
        request_data = cursor.fetchone()
        if not request_data:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '請求不存在'}), 404
        
        if user_id not in [request_data[0], request_data[1]]:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '無權限查看此對話'}), 403
        
        # 查詢訊息
        cursor.execute("""
            SELECT m.*, u1.user_name as sender_name, u2.user_name as receiver_name
            FROM message m
            JOIN "user" u1 ON m.sender_id = u1.user_id
            JOIN "user" u2 ON m.receiver_id = u2.user_id
            WHERE m.request_id = %s
            ORDER BY m.sent_at ASC
        """, (request_id,))
        
        messages = cursor.fetchall()
        
        # 標記為已讀
        cursor.execute("""
            UPDATE message
            SET is_read = TRUE
            WHERE request_id = %s AND receiver_id = %s AND is_read = FALSE
        """, (request_id, user_id))
        
        conn.commit()
        DatabaseConfig.return_postgres_connection(conn)
        
        result = []
        for m in messages:
            result.append({
                'message_id': m[0],
                'request_id': m[1],
                'sender_id': m[2],
                'sender_name': m[7],
                'receiver_id': m[3],
                'receiver_name': m[8],
                'content': m[4],
                'is_read': m[5],
                'sent_at': m[6].isoformat() if m[6] else None
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

