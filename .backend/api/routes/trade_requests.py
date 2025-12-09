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
            
            # 檢查商品是否存在且可交易，並檢查擁有者是否已刪除
            cursor.execute("""
                SELECT p.status, p.owner_id, p.trade_option, u.deleted_at
                FROM product p
                JOIN "user" u ON p.owner_id = u.user_id
                WHERE p.product_id = %s
            """, (target_product_id,))
            
            product = cursor.fetchone()
            if not product:
                DatabaseConfig.return_postgres_connection(conn)
                return jsonify({'error': '商品不存在'}), 404
            
            # 檢查商品擁有者是否已刪除
            if product[3] is not None:
                DatabaseConfig.return_postgres_connection(conn)
                return jsonify({'error': '無法對已刪除帳號的商品提出請求'}), 403
            
            if product[0] != 'available':
                DatabaseConfig.return_postgres_connection(conn)
                return jsonify({'error': '商品不可交易'}), 400
            
            if product[1] == user_id:
                DatabaseConfig.return_postgres_connection(conn)
                return jsonify({'error': '不能對自己的商品提出請求'}), 400
            
            # 檢查是否已有待處理的請求（使用 SELECT FOR UPDATE 鎖定商品行）
            cursor.execute("""
                SELECT request_id, status
                FROM trade_request
                WHERE target_product_id = %s
                AND status IN ('Pending', 'Accepted')
                FOR UPDATE
            """, (target_product_id,))
            
            existing_request = cursor.fetchone()
            if existing_request:
                DatabaseConfig.return_postgres_connection(conn)
                return jsonify({'error': '該商品已有待處理的請求，無法再提出新的請求'}), 400
            
            # 再次檢查商品狀態（使用 SELECT FOR UPDATE 鎖定商品行）
            cursor.execute("""
                SELECT status
                FROM product
                WHERE product_id = %s
                FOR UPDATE
            """, (target_product_id,))
            
            product_status = cursor.fetchone()
            if not product_status or product_status[0] != 'available':
                DatabaseConfig.return_postgres_connection(conn)
                return jsonify({'error': '商品不可交易（可能已被預約或下架）'}), 400
            
            # 如果是交換請求，檢查交換商品是否存在且可交易
            if request_type == 'Trade' and offered_product_id:
                cursor.execute("""
                    SELECT status, owner_id
                    FROM product
                    WHERE product_id = %s
                    FOR UPDATE
                """, (offered_product_id,))
                
                offered_product = cursor.fetchone()
                if not offered_product:
                    DatabaseConfig.return_postgres_connection(conn)
                    return jsonify({'error': '交換商品不存在'}), 404
                
                if offered_product[0] != 'available':
                    DatabaseConfig.return_postgres_connection(conn)
                    return jsonify({'error': '交換商品不可交易（可能已被預約或下架）'}), 400
                
                if offered_product[1] != user_id:
                    DatabaseConfig.return_postgres_connection(conn)
                    return jsonify({'error': '交換商品不屬於您'}), 403
            
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
            
            # 立即將目標商品狀態更新為 reserved，防止其他使用者同時提出請求
            cursor.execute("""
                UPDATE product
                SET status = 'reserved', updated_at = CURRENT_TIMESTAMP
                WHERE product_id = %s
            """, (target_product_id,))
            
            # 如果是交換請求，也將交換商品狀態更新為 reserved
            if request_type == 'Trade' and offered_product_id:
                cursor.execute("""
                    UPDATE product
                    SET status = 'reserved', updated_at = CURRENT_TIMESTAMP
                    WHERE product_id = %s
                """, (offered_product_id,))
            
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
                SELECT tr.request_id, tr.requester_id, tr.target_product_id, tr.offered_product_id,
                       tr.request_type, tr.offer_price, tr.status, tr.message, tr.created_at, tr.updated_at,
                       tr.buyer_confirmed_handoff, tr.seller_confirmed_handoff,
                       p.product_name, p.owner_id, u.user_name as owner_name, u.deleted_at as owner_deleted_at
                FROM trade_request tr
                JOIN product p ON tr.target_product_id = p.product_id
                JOIN "user" u ON p.owner_id = u.user_id
                WHERE tr.requester_id = %s
                ORDER BY tr.created_at DESC
            """, (user_id,))
        else:
            # 我收到的請求
            cursor.execute("""
                SELECT tr.request_id, tr.requester_id, tr.target_product_id, tr.offered_product_id,
                       tr.request_type, tr.offer_price, tr.status, tr.message, tr.created_at, tr.updated_at,
                       tr.buyer_confirmed_handoff, tr.seller_confirmed_handoff,
                       p.product_name, p.owner_id, u.user_name as requester_name, u.deleted_at as requester_deleted_at
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
            # 欄位順序：0-9 是基本欄位，10-11 是確認狀態，12-14 是商品和用戶資訊
            buyer_confirmed = r[10] if len(r) > 10 and r[10] is not None else False
            seller_confirmed = r[11] if len(r) > 11 and r[11] is not None else False
            
            if request_type == 'sent':
                # 我提出的請求：對方是商品擁有者
                owner_name = r[14] if len(r) > 14 else None
                owner_deleted = r[15] if len(r) > 15 and r[15] is not None else False
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
                    'buyer_confirmed_handoff': buyer_confirmed,
                    'seller_confirmed_handoff': seller_confirmed,
                    'product_name': r[12] if len(r) > 12 else None,
                    'owner_id': r[13] if len(r) > 13 else None,
                    'owner_name': (owner_name + ' (已刪除)') if owner_name and owner_deleted else owner_name,
                    'owner_deleted': owner_deleted,
                    'requester_name': None
                })
            else:
                # 我收到的請求：對方是請求者
                requester_name = r[14] if len(r) > 14 else None
                requester_deleted = r[15] if len(r) > 15 and r[15] is not None else False
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
                    'buyer_confirmed_handoff': buyer_confirmed,
                    'seller_confirmed_handoff': seller_confirmed,
                    'product_name': r[12] if len(r) > 12 else None,
                    'owner_id': r[13] if len(r) > 13 else None,
                    'owner_name': None,
                    'requester_name': (requester_name + ' (已刪除)') if requester_name and requester_deleted else requester_name,
                    'requester_deleted': requester_deleted
                })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:request_id>/accept', methods=['POST'])
@token_required
def accept_trade_request(user_id, request_id):
    """接受交易請求（含併行控制）"""
    # 併行控制：取得鎖定
    request_lock.acquire()
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 檢查請求是否存在且屬於該使用者的商品（使用 SELECT FOR UPDATE 鎖定）
        cursor.execute("""
            SELECT tr.status, p.owner_id, tr.target_product_id, p.status as product_status
            FROM trade_request tr
            JOIN product p ON tr.target_product_id = p.product_id
            WHERE tr.request_id = %s
            FOR UPDATE OF tr, p
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
        
        # 檢查商品是否已被其他請求預約
        if request_data[3] != 'reserved':
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '商品狀態不正確，可能已被其他請求預約'}), 400
        
        # 更新請求狀態
        cursor.execute("""
            UPDATE trade_request
            SET status = 'Accepted', updated_at = CURRENT_TIMESTAMP
            WHERE request_id = %s
        """, (request_id,))
        
        # 確保商品狀態為 reserved（可能已經是 reserved，但再次確認）
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
    finally:
        # 釋放鎖定
        request_lock.release()

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
        
        # 取得商品 ID（包括目標商品和交換商品）
        cursor.execute("""
            SELECT target_product_id, offered_product_id, request_type
            FROM trade_request
            WHERE request_id = %s
        """, (request_id,))
        product_result = cursor.fetchone()
        target_product_id = product_result[0] if product_result else None
        offered_product_id = product_result[1] if product_result and len(product_result) > 1 else None
        request_type = product_result[2] if product_result and len(product_result) > 2 else None
        
        # 更新請求狀態
        cursor.execute("""
            UPDATE trade_request
            SET status = 'Rejected', updated_at = CURRENT_TIMESTAMP
            WHERE request_id = %s
        """, (request_id,))
        
        # 如果目標商品狀態是 reserved，恢復為 available
        if target_product_id:
            cursor.execute("""
                UPDATE product
                SET status = 'available', updated_at = CURRENT_TIMESTAMP
                WHERE product_id = %s AND status = 'reserved'
            """, (target_product_id,))
        
        # 如果是交換請求，也將交換商品恢復為 available
        if request_type == 'Trade' and offered_product_id:
            cursor.execute("""
                UPDATE product
                SET status = 'available', updated_at = CURRENT_TIMESTAMP
                WHERE product_id = %s AND status = 'reserved'
            """, (offered_product_id,))
        
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
            SELECT status, target_product_id
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
        
        # 取得完整的請求資訊（包括交換商品）
        cursor.execute("""
            SELECT target_product_id, offered_product_id, request_type
            FROM trade_request
            WHERE request_id = %s
        """, (request_id,))
        request_info = cursor.fetchone()
        target_product_id = request_info[0] if request_info else None
        offered_product_id = request_info[1] if request_info and len(request_info) > 1 else None
        request_type = request_info[2] if request_info and len(request_info) > 2 else None
        
        # 更新請求狀態
        cursor.execute("""
            UPDATE trade_request
            SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE request_id = %s
        """, (request_id,))
        
        # 如果目標商品狀態是 reserved，恢復為 available
        if target_product_id:
            cursor.execute("""
                UPDATE product
                SET status = 'available', updated_at = CURRENT_TIMESTAMP
                WHERE product_id = %s AND status = 'reserved'
            """, (target_product_id,))
        
        # 如果是交換請求，也將交換商品恢復為 available
        if request_type == 'Trade' and offered_product_id:
            cursor.execute("""
                UPDATE product
                SET status = 'available', updated_at = CURRENT_TIMESTAMP
                WHERE product_id = %s AND status = 'reserved'
            """, (offered_product_id,))
        
        conn.commit()
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({'message': '請求已取消'}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:request_id>/confirm-handoff', methods=['POST'])
@token_required
def confirm_handoff(user_id, request_id):
    """確認已面交（買家或賣家）"""
    conn = None
    request_lock.acquire()
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 獲取請求資訊（含確認狀態）
        cursor.execute("""
            SELECT tr.requester_id, tr.status, tr.buyer_confirmed_handoff, tr.seller_confirmed_handoff,
                   p.owner_id, tr.target_product_id, tr.request_type, tr.offer_price, tr.offered_product_id
            FROM trade_request tr
            JOIN product p ON tr.target_product_id = p.product_id
            WHERE tr.request_id = %s
            FOR UPDATE OF tr
        """, (request_id,))
        
        request_data = cursor.fetchone()
        if not request_data:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '請求不存在'}), 404
        
        requester_id = request_data[0]
        status = request_data[1]
        buyer_confirmed = request_data[2]
        seller_confirmed = request_data[3]
        owner_id = request_data[4]
        target_product_id = request_data[5]
        request_type = request_data[6]
        offer_price = request_data[7]
        offered_product_id = request_data[8]
        
        # 檢查請求狀態必須是 Accepted
        if status != 'Accepted':
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '請求尚未被接受，無法確認面交'}), 400
        
        # 判斷使用者是買家還是賣家
        is_buyer = (user_id == requester_id)
        is_seller = (user_id == owner_id)
        
        if not is_buyer and not is_seller:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '無權限確認此交易的面交'}), 403
        
        # 更新確認狀態
        if is_buyer:
            if buyer_confirmed:
                DatabaseConfig.return_postgres_connection(conn)
                return jsonify({'message': '您已經確認過面交了', 'already_confirmed': True}), 200
            cursor.execute("""
                UPDATE trade_request
                SET buyer_confirmed_handoff = TRUE, updated_at = CURRENT_TIMESTAMP
                WHERE request_id = %s
            """, (request_id,))
        else:  # is_seller
            if seller_confirmed:
                DatabaseConfig.return_postgres_connection(conn)
                return jsonify({'message': '您已經確認過面交了', 'already_confirmed': True}), 200
            cursor.execute("""
                UPDATE trade_request
                SET seller_confirmed_handoff = TRUE, updated_at = CURRENT_TIMESTAMP
                WHERE request_id = %s
            """, (request_id,))
        
        # 重新獲取確認狀態
        cursor.execute("""
            SELECT buyer_confirmed_handoff, seller_confirmed_handoff
            FROM trade_request
            WHERE request_id = %s
        """, (request_id,))
        
        updated_data = cursor.fetchone()
        new_buyer_confirmed = updated_data[0]
        new_seller_confirmed = updated_data[1]
        
        # 如果兩邊都確認了，完成交易
        if new_buyer_confirmed and new_seller_confirmed:
            # 更新請求狀態為 Completed
            cursor.execute("""
                UPDATE trade_request
                SET status = 'Completed', updated_at = CURRENT_TIMESTAMP
                WHERE request_id = %s
            """, (request_id,))
            
            # 更新商品狀態為 sold 或 exchanged
            if request_type == 'Purchase':
                cursor.execute("""
                    UPDATE product
                    SET status = 'sold', updated_at = CURRENT_TIMESTAMP
                    WHERE product_id = %s
                """, (target_product_id,))
            else:  # Trade
                cursor.execute("""
                    UPDATE product
                    SET status = 'exchanged', updated_at = CURRENT_TIMESTAMP
                    WHERE product_id = %s
                """, (target_product_id,))
                # 如果交換商品存在，也更新其狀態
                if offered_product_id:
                    cursor.execute("""
                        UPDATE product
                        SET status = 'exchanged', updated_at = CURRENT_TIMESTAMP
                        WHERE product_id = %s
                    """, (offered_product_id,))
            
            # 建立交易紀錄
            cursor.execute("""
                INSERT INTO transaction 
                (request_id, target_product_id, offered_product_id, total_price, payment_status)
                VALUES (%s, %s, %s, %s, 'Paid')
                RETURNING transaction_id
            """, (request_id, target_product_id, offered_product_id, offer_price))
            
            transaction_id = cursor.fetchone()[0]
            
            conn.commit()
            DatabaseConfig.return_postgres_connection(conn)
            
            # 獲取交易參與者資訊（買家和賣家）
            cursor.execute("""
                SELECT tr.requester_id, p.owner_id
                FROM trade_request tr
                JOIN product p ON tr.target_product_id = p.product_id
                WHERE tr.request_id = %s
            """, (request_id,))
            participants = cursor.fetchone()
            buyer_id = participants[0] if participants else None
            seller_id = participants[1] if participants else None
            
            return jsonify({
                'message': '交易已完成！已記錄到交易紀錄',
                'transaction_id': transaction_id,
                'completed': True,
                'both_confirmed': True,
                'buyer_id': buyer_id,
                'seller_id': seller_id,
                'needs_review': True  # 需要評價
            }), 200
        else:
            # 只有一方確認
            conn.commit()
            DatabaseConfig.return_postgres_connection(conn)
            
            return jsonify({
                'message': '已確認面交，等待對方確認',
                'completed': False,
                'both_confirmed': False,
                'buyer_confirmed': new_buyer_confirmed,
                'seller_confirmed': new_seller_confirmed
            }), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500
    finally:
        request_lock.release()

