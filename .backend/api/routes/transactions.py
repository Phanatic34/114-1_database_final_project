"""
交易紀錄相關 API
"""
from flask import Blueprint, request, jsonify
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))
from config.database import DatabaseConfig
from utils.auth import token_required

bp = Blueprint('transactions', __name__)

@bp.route('', methods=['GET'])
@token_required
def get_transactions(user_id):
    """查詢交易紀錄"""
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT t.*, p1.product_name as target_product_name,
                   p2.product_name as offered_product_name,
                   tr.request_type, tr.requester_id, p1.owner_id
            FROM transaction t
            JOIN trade_request tr ON t.request_id = tr.request_id
            JOIN product p1 ON t.target_product_id = p1.product_id
            LEFT JOIN product p2 ON t.offered_product_id = p2.product_id
            WHERE tr.requester_id = %s OR p1.owner_id = %s
            ORDER BY t.complete_date DESC
        """, (user_id, user_id))
        
        transactions = cursor.fetchall()
        DatabaseConfig.return_postgres_connection(conn)
        
        result = []
        for t in transactions:
            result.append({
                'transaction_id': t[0],
                'request_id': t[1],
                'target_product_id': t[2],
                'target_product_name': t[6],
                'offered_product_id': t[3],
                'offered_product_name': t[7],
                'total_price': t[4],
                'complete_date': t[5].isoformat() if t[5] else None,
                'payment_status': t[6],
                'request_type': t[8],
                'is_buyer': t[9] == user_id,
                'is_seller': t[10] == user_id
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['POST'])
@token_required
def complete_transaction(user_id):
    """完成交易（建立交易紀錄）"""
    try:
        data = request.get_json()
        request_id = data.get('request_id')
        
        if not request_id:
            return jsonify({'error': '缺少必要欄位'}), 400
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 檢查請求是否存在且已被接受
        cursor.execute("""
            SELECT tr.*, p.owner_id
            FROM trade_request tr
            JOIN product p ON tr.target_product_id = p.product_id
            WHERE tr.request_id = %s
        """, (request_id,))
        
        request_data = cursor.fetchone()
        if not request_data:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '請求不存在'}), 404
        
        if request_data[6] != 'Accepted':
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '請求尚未被接受'}), 400
        
        # 檢查權限（必須是買家或賣家）
        if request_data[1] != user_id and request_data[8] != user_id:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '無權限完成此交易'}), 403
        
        # 建立交易紀錄
        cursor.execute("""
            INSERT INTO transaction 
            (request_id, target_product_id, offered_product_id, total_price, payment_status)
            SELECT tr.request_id, tr.target_product_id, tr.offered_product_id,
                   tr.offer_price, 'Unpaid'
            FROM trade_request tr
            WHERE tr.request_id = %s
            RETURNING transaction_id
        """, (request_id,))
        
        transaction_id = cursor.fetchone()[0]
        
        # 更新請求狀態
        cursor.execute("""
            UPDATE trade_request
            SET status = 'Completed', updated_at = CURRENT_TIMESTAMP
            WHERE request_id = %s
        """, (request_id,))
        
        # 更新商品狀態
        status = 'exchanged' if request_data[3] else 'sold'
        cursor.execute("""
            UPDATE product
            SET status = %s, updated_at = CURRENT_TIMESTAMP
            WHERE product_id = %s
        """, (status, request_data[2]))
        
        conn.commit()
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({
            'message': '交易完成',
            'transaction_id': transaction_id
        }), 201
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

