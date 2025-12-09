"""
交易請求相關 API
"""
from flask import Blueprint, request, jsonify
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))
from config.database import DatabaseConfig
from utils.auth import token_required
import threading

bp = Blueprint('trade_requests', __name__)

# 併行控制鎖
request_lock = threading.Lock()

@bp.route('', methods=['POST'])
@token_required
def create_trade_request(user_id):
    """建立交易請求（含併行控制）"""
    try:
        data = request.get_json()
        target_product_id = data.get('target_product_id')
        request_type = data.get('request_type')  # 'Purchase' or 'Trade'
        offer_price = data.get('offer_price')
        offered_product_id = data.get('offered_product_id')
        message = data.get('message')
        
        if not target_product_id or not request_type:
            return jsonify({'error': '缺少必要欄位'}), 400
        
        if request_type == 'Purchase' and not offer_price:
            return jsonify({'error': '購買請求需要提供出價'}), 400
        
        if request_type == 'Trade' and not offered_product_id:
            return jsonify({'error': '交換請求需要提供交換商品'}), 400
        
        # 併行控制：取得鎖定
        request_lock.acquire()
        try:
            conn = DatabaseConfig.get_postgres_connection()
            cursor = conn.cursor()
            
            # 檢查商品是否存在且可交易
            cursor.execute("""
                SELECT status, owner_id, trade_option
                FROM product
                WHERE product_id = %s
            """, (target_product_id,))
            
            product = cursor.fetchone()
            if not product:
                DatabaseConfig.return_postgres_connection(conn)
                return jsonify({'error': '商品不存在'}), 404
            
            if product[0] != 'available':
                DatabaseConfig.return_postgres_connection(conn)
                return jsonify({'error': '商品不可交易'}), 400
            
            if product[1] == user_id:
                DatabaseConfig.return_postgres_connection(conn)
                return jsonify({'error': '不能對自己的商品提出請求'}), 400
            
            # 檢查是否已有待處理的請求
            cursor.execute("""
                SELECT request_id
                FROM trade_request
                WHERE target_product_id = %s
                AND status IN ('Pending', 'Accepted')
            """, (target_product_id,))
            
            if cursor.fetchone():
                DatabaseConfig.return_postgres_connection(conn)
                return jsonify({'error': '該商品已有待處理的請求'}), 400
            
            # 建立交易請求
            cursor.execute("""
                INSERT INTO trade_request 
                (requester_id, target_product_id, offered_product_id, 
                 request_type, offer_price, message)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING request_id
            """, (user_id, target_product_id, offered_product_id, 
                  request_type, offer_price, message))
            
            request_id = cursor.fetchone()[0]
            conn.commit()
            
            DatabaseConfig.return_postgres_connection(conn)
            
            return jsonify({
                'message': '交易請求建立成功',
                'request_id': request_id
            }), 201
            
        finally:
            # 釋放鎖定
            request_lock.release()
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['GET'])
@token_required
def get_trade_requests(user_id):
    """查詢交易請求（我提出的或收到的）"""
    try:
        request_type = request.args.get('type')  # 'sent' or 'received'
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        if request_type == 'sent':
            # 我提出的請求
            cursor.execute("""
                SELECT tr.*, p.product_name, u.user_name as owner_name
                FROM trade_request tr
                JOIN product p ON tr.target_product_id = p.product_id
                JOIN "user" u ON p.owner_id = u.user_id
                WHERE tr.requester_id = %s
                ORDER BY tr.created_at DESC
            """, (user_id,))
        else:
            # 我收到的請求
            cursor.execute("""
                SELECT tr.*, p.product_name, u.user_name as requester_name
                FROM trade_request tr
                JOIN product p ON tr.target_product_id = p.product_id
                JOIN "user" u ON tr.requester_id = u.user_id
                WHERE p.owner_id = %s
                ORDER BY tr.created_at DESC
            """, (user_id,))
        
        requests = cursor.fetchall()
        DatabaseConfig.return_postgres_connection(conn)
        
        result = []
        for r in requests:
            result.append({
                'request_id': r[0],
                'requester_id': r[1],
                'target_product_id': r[2],
                'offered_product_id': r[3],
                'request_type': r[4],
                'offer_price': r[5],
                'status': r[6],
                'message': r[7],
                'created_at': r[8].isoformat() if r[8] else None,
                'updated_at': r[9].isoformat() if r[9] else None,
                'product_name': r[10],
                'other_user_name': r[11]
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:request_id>/accept', methods=['POST'])
@token_required
def accept_trade_request(user_id, request_id):
    """接受交易請求"""
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 檢查請求是否存在且屬於該使用者的商品
        cursor.execute("""
            SELECT tr.status, p.owner_id, tr.target_product_id
            FROM trade_request tr
            JOIN product p ON tr.target_product_id = p.product_id
            WHERE tr.request_id = %s
        """, (request_id,))
        
        request_data = cursor.fetchone()
        if not request_data:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '請求不存在'}), 404
        
        if request_data[1] != user_id:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '無權限接受此請求'}), 403
        
        if request_data[0] != 'Pending':
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '請求狀態不正確'}), 400
        
        # 更新請求狀態
        cursor.execute("""
            UPDATE trade_request
            SET status = 'Accepted', updated_at = CURRENT_TIMESTAMP
            WHERE request_id = %s
        """, (request_id,))
        
        # 更新商品狀態為 reserved
        cursor.execute("""
            UPDATE product
            SET status = 'reserved', updated_at = CURRENT_TIMESTAMP
            WHERE product_id = %s
        """, (request_data[2],))
        
        conn.commit()
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({'message': '請求已接受'}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:request_id>/reject', methods=['POST'])
@token_required
def reject_trade_request(user_id, request_id):
    """拒絕交易請求"""
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 檢查請求是否存在且屬於該使用者的商品
        cursor.execute("""
            SELECT tr.status, p.owner_id
            FROM trade_request tr
            JOIN product p ON tr.target_product_id = p.product_id
            WHERE tr.request_id = %s
        """, (request_id,))
        
        request_data = cursor.fetchone()
        if not request_data:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '請求不存在'}), 404
        
        if request_data[1] != user_id:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '無權限拒絕此請求'}), 403
        
        # 更新請求狀態
        cursor.execute("""
            UPDATE trade_request
            SET status = 'Rejected', updated_at = CURRENT_TIMESTAMP
            WHERE request_id = %s
        """, (request_id,))
        
        conn.commit()
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({'message': '請求已拒絕'}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:request_id>/cancel', methods=['POST'])
@token_required
def cancel_trade_request(user_id, request_id):
    """取消交易請求"""
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 檢查請求是否存在且屬於該使用者
        cursor.execute("""
            SELECT status
            FROM trade_request
            WHERE request_id = %s AND requester_id = %s
        """, (request_id, user_id))
        
        request_data = cursor.fetchone()
        if not request_data:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '請求不存在或無權限'}), 404
        
        if request_data[0] not in ('Pending', 'Accepted'):
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '無法取消此請求'}), 400
        
        # 更新請求狀態
        cursor.execute("""
            UPDATE trade_request
            SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE request_id = %s
        """, (request_id,))
        
        conn.commit()
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({'message': '請求已取消'}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

