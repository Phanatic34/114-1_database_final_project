"""
評價相關 API
"""
from flask import Blueprint, request, jsonify
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))
from config.database import DatabaseConfig
from utils.auth import token_required

bp = Blueprint('reviews', __name__)

@bp.route('', methods=['POST'])
@token_required
def create_review(user_id):
    """新增評價"""
    try:
        data = request.get_json()
        transaction_id = data.get('transaction_id')
        reviewee_id = data.get('reviewee_id')
        rating = data.get('rating')
        comment = data.get('comment')
        
        if not all([transaction_id, reviewee_id]):
            return jsonify({'error': '缺少必要欄位'}), 400
        
        # rating 是可選的：1 = 倒讚，5 = 點讚，None/null = 不做評價
        # 如果不提供 rating，表示不做評價，不創建 review 記錄
        if rating is None:
            # 不做評價，直接返回成功（不創建記錄）
            return jsonify({
                'message': '已選擇不做評價',
                'skipped': True
            }), 200
        
        # 如果提供了 rating，必須是 1 或 5
        if rating not in (1, 5):
            return jsonify({'error': '評分必須為 1（倒讚）或 5（點讚）'}), 400
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 檢查交易是否存在且屬於該使用者
        cursor.execute("""
            SELECT t.transaction_id, tr.requester_id, p.owner_id
            FROM transaction t
            JOIN trade_request tr ON t.request_id = tr.request_id
            JOIN product p ON t.target_product_id = p.product_id
            WHERE t.transaction_id = %s
        """, (transaction_id,))
        
        transaction = cursor.fetchone()
        if not transaction:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '交易不存在'}), 404
        
        # 檢查是否為交易參與者
        if transaction[1] != user_id and transaction[2] != user_id:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '無權限評價此交易'}), 403
        
        # 檢查是否已評價過
        cursor.execute("""
            SELECT review_id
            FROM review
            WHERE transaction_id = %s AND reviewer_id = %s AND reviewee_id = %s
        """, (transaction_id, user_id, reviewee_id))
        
        if cursor.fetchone():
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '已評價過此交易'}), 400
        
        # 新增評價
        cursor.execute("""
            INSERT INTO review (transaction_id, reviewer_id, reviewee_id, rating, comment)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING review_id
        """, (transaction_id, user_id, reviewee_id, rating, comment))
        
        review_id = cursor.fetchone()[0]
        conn.commit()
        
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({
            'message': '評價新增成功',
            'review_id': review_id
        }), 201
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

@bp.route('/transaction/<int:transaction_id>/status', methods=['GET'])
@token_required
def get_review_status(user_id, transaction_id):
    """查詢交易的評價狀態（檢查雙方是否都已評價）"""
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 獲取交易參與者
        cursor.execute("""
            SELECT tr.requester_id, p.owner_id
            FROM transaction t
            JOIN trade_request tr ON t.request_id = tr.request_id
            JOIN product p ON t.target_product_id = p.product_id
            WHERE t.transaction_id = %s
        """, (transaction_id,))
        
        transaction = cursor.fetchone()
        if not transaction:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '交易不存在'}), 404
        
        buyer_id = transaction[0]
        seller_id = transaction[1]
        
        # 檢查是否為交易參與者
        if user_id != buyer_id and user_id != seller_id:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '無權限查看此交易'}), 403
        
        # 檢查雙方是否都已評價
        cursor.execute("""
            SELECT reviewer_id, reviewee_id
            FROM review
            WHERE transaction_id = %s
        """, (transaction_id,))
        
        reviews = cursor.fetchall()
        buyer_reviewed = any(r[0] == buyer_id for r in reviews)
        seller_reviewed = any(r[0] == seller_id for r in reviews)
        user_reviewed = any(r[0] == user_id for r in reviews)
        
        # 確定對方 ID
        other_user_id = buyer_id if user_id == seller_id else seller_id
        
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({
            'transaction_id': transaction_id,
            'buyer_id': buyer_id,
            'seller_id': seller_id,
            'buyer_reviewed': buyer_reviewed,
            'seller_reviewed': seller_reviewed,
            'user_reviewed': user_reviewed,
            'other_user_id': other_user_id,
            'both_reviewed': buyer_reviewed and seller_reviewed
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/user/<int:user_id_param>', methods=['GET'])
def get_user_reviews(user_id_param):
    """查詢使用者的評價"""
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT r.*, u.user_name as reviewer_name, t.transaction_id
            FROM review r
            JOIN "user" u ON r.reviewer_id = u.user_id
            JOIN transaction t ON r.transaction_id = t.transaction_id
            WHERE r.reviewee_id = %s
            ORDER BY r.created_at DESC
        """, (user_id_param,))
        
        reviews = cursor.fetchall()
        DatabaseConfig.return_postgres_connection(conn)
        
        result = []
        for r in reviews:
            result.append({
                'review_id': r[0],
                'transaction_id': r[1],
                'reviewer_id': r[2],
                'reviewer_name': r[6],
                'reviewee_id': r[3],
                'rating': r[4],
                'comment': r[5],
                'created_at': r[6].isoformat() if len(r) > 6 and r[6] else None
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

