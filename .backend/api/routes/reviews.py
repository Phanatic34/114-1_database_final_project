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
        
        if not all([transaction_id, reviewee_id, rating]):
            return jsonify({'error': '缺少必要欄位'}), 400
        
        if not (1 <= rating <= 5):
            return jsonify({'error': '評分必須在 1-5 之間'}), 400
        
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

