"""
管理員相關 API
根據 outline.tex 實作完整的管理員功能
"""
from flask import Blueprint, request, jsonify
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))
from config.database import DatabaseConfig
from utils.auth import token_required
from functools import wraps

bp = Blueprint('admin', __name__)

def is_admin(user_id):
    """檢查是否為管理員"""
    conn = DatabaseConfig.get_postgres_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT admin_id, role FROM admin WHERE user_id = %s", (user_id,))
    result = cursor.fetchone()
    
    DatabaseConfig.return_postgres_connection(conn)
    return result is not None

def get_admin_role(user_id):
    """取得管理員角色"""
    conn = DatabaseConfig.get_postgres_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT role FROM admin WHERE user_id = %s", (user_id,))
    result = cursor.fetchone()
    
    DatabaseConfig.return_postgres_connection(conn)
    return result[0] if result else None

def admin_required(f):
    """管理員權限裝飾器"""
    @wraps(f)
    @token_required
    def decorated(user_id, *args, **kwargs):
        if not is_admin(user_id):
            return jsonify({'error': '需要管理員權限'}), 403
        return f(user_id, *args, **kwargs)
    return decorated

# ========== 用戶管理 ==========

@bp.route('/users', methods=['GET'])
@admin_required
def get_users(user_id):
    """查詢所有使用者"""
    try:
        status = request.args.get('status')  # 可選：'active' 或 'suspended'
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        if status:
            cursor.execute("""
                SELECT user_id, user_name, student_id, email, phone, 
                       register_date, status, created_at
                FROM "user"
                WHERE status = %s
                ORDER BY register_date DESC
            """, (status,))
        else:
            cursor.execute("""
                SELECT user_id, user_name, student_id, email, phone, 
                       register_date, status, created_at
                FROM "user"
                ORDER BY register_date DESC
            """)
        
        users = cursor.fetchall()
        DatabaseConfig.return_postgres_connection(conn)
        
        result = []
        for u in users:
            result.append({
                'user_id': u[0],
                'user_name': u[1],
                'student_id': u[2],
                'email': u[3],
                'phone': u[4],
                'register_date': u[5].isoformat() if u[5] else None,
                'status': u[6],
                'created_at': u[7].isoformat() if u[7] else None
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/users/<int:target_user_id>', methods=['GET'])
@admin_required
def get_user(user_id, target_user_id):
    """查詢單一使用者資訊"""
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT user_id, user_name, student_id, email, phone, 
                   register_date, status, created_at
            FROM "user"
            WHERE user_id = %s
        """, (target_user_id,))
        
        u = cursor.fetchone()
        DatabaseConfig.return_postgres_connection(conn)
        
        if not u:
            return jsonify({'error': '使用者不存在'}), 404
        
        return jsonify({
            'user_id': u[0],
            'user_name': u[1],
            'student_id': u[2],
            'email': u[3],
            'phone': u[4],
            'register_date': u[5].isoformat() if u[5] else None,
            'status': u[6],
            'created_at': u[7].isoformat() if u[7] else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/users/<int:target_user_id>/suspend', methods=['POST'])
@admin_required
def suspend_user(user_id, target_user_id):
    """停權使用者"""
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE "user"
            SET status = 'suspended', updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
        """, (target_user_id,))
        
        conn.commit()
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({'message': '使用者已停權'}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

@bp.route('/users/<int:target_user_id>/activate', methods=['POST'])
@admin_required
def activate_user(user_id, target_user_id):
    """恢復使用者帳號"""
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE "user"
            SET status = 'active', updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
        """, (target_user_id,))
        
        conn.commit()
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({'message': '使用者帳號已恢復'}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

# ========== 商品管理 ==========

@bp.route('/products', methods=['GET'])
@admin_required
def get_all_products(user_id):
    """查詢所有商品（管理員用）"""
    try:
        status = request.args.get('status')
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        if status:
            query = """
                SELECT p.*, u.user_name, c.category_name
                FROM product p
                JOIN "user" u ON p.owner_id = u.user_id
                JOIN category c ON p.category_id = c.category_id
                WHERE p.status = %s
                ORDER BY p.post_date DESC
            """
            cursor.execute(query, (status,))
        else:
            query = """
                SELECT p.*, u.user_name, c.category_name
                FROM product p
                JOIN "user" u ON p.owner_id = u.user_id
                JOIN category c ON p.category_id = c.category_id
                ORDER BY p.post_date DESC
            """
            cursor.execute(query)
        
        products = cursor.fetchall()
        DatabaseConfig.return_postgres_connection(conn)
        
        result = []
        for p in products:
            result.append({
                'product_id': p[0],
                'owner_id': p[1],
                'owner_name': p[14],
                'category_id': p[2],
                'category_name': p[15],
                'product_name': p[3],
                'price': p[4],
                'trade_option': p[5],
                'condition': p[6],
                'description': p[7],
                'trade_item': p[8],
                'status': p[9],
                'image_url': p[10],
                'post_date': p[11].isoformat() if p[11] else None,
                'created_at': p[12].isoformat() if p[12] else None,
                'updated_at': p[13].isoformat() if p[13] else None
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/products/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product(user_id, product_id):
    """管理員刪除商品"""
    
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM product WHERE product_id = %s", (product_id,))
        conn.commit()
        
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({'message': '商品已刪除'}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

@bp.route('/products/<int:product_id>/status', methods=['PUT'])
@admin_required
def update_product_status(user_id, product_id):
    """管理員更新商品狀態"""
    
    try:
        data = request.get_json()
        status = data.get('status')
        
        if not status:
            return jsonify({'error': '缺少狀態參數'}), 400
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE product
            SET status = %s, updated_at = CURRENT_TIMESTAMP
            WHERE product_id = %s
        """, (status, product_id))
        
        conn.commit()
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({'message': '商品狀態已更新'}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

# ========== 分類管理 ==========

@bp.route('/categories', methods=['GET'])
@admin_required
def get_categories(user_id):
    """查詢所有分類"""
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT category_id, category_name, created_at
            FROM category
            ORDER BY category_id
        """)
        
        categories = cursor.fetchall()
        DatabaseConfig.return_postgres_connection(conn)
        
        result = []
        for c in categories:
            result.append({
                'category_id': c[0],
                'category_name': c[1],
                'created_at': c[2].isoformat() if c[2] else None
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/categories', methods=['POST'])
@admin_required
def create_category(user_id):
    """新增分類"""
    try:
        data = request.get_json()
        category_name = data.get('category_name')
        
        if not category_name:
            return jsonify({'error': '缺少分類名稱'}), 400
        
        # 檢查分類名稱是否有效
        valid_categories = ['Textbooks', 'Electronics', 'Clothing', 'Stationery', 'Daily_Use', 'Others']
        if category_name not in valid_categories:
            return jsonify({'error': f'無效的分類名稱，必須是以下之一: {", ".join(valid_categories)}'}), 400
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 檢查是否已存在
        cursor.execute("SELECT category_id FROM category WHERE category_name = %s", (category_name,))
        if cursor.fetchone():
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '分類已存在'}), 400
        
        cursor.execute("""
            INSERT INTO category (category_name)
            VALUES (%s)
            RETURNING category_id
        """, (category_name,))
        
        category_id = cursor.fetchone()[0]
        conn.commit()
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({
            'message': '分類新增成功',
            'category_id': category_id
        }), 201
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

@bp.route('/categories/<int:category_id>', methods=['PUT'])
@admin_required
def update_category(user_id, category_id):
    """修改分類"""
    try:
        data = request.get_json()
        category_name = data.get('category_name')
        
        if not category_name:
            return jsonify({'error': '缺少分類名稱'}), 400
        
        # 檢查分類名稱是否有效
        valid_categories = ['Textbooks', 'Electronics', 'Clothing', 'Stationery', 'Daily_Use', 'Others']
        if category_name not in valid_categories:
            return jsonify({'error': f'無效的分類名稱，必須是以下之一: {", ".join(valid_categories)}'}), 400
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 檢查分類是否存在
        cursor.execute("SELECT category_id FROM category WHERE category_id = %s", (category_id,))
        if not cursor.fetchone():
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '分類不存在'}), 404
        
        cursor.execute("""
            UPDATE category
            SET category_name = %s
            WHERE category_id = %s
        """, (category_name, category_id))
        
        conn.commit()
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({'message': '分類已更新'}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

@bp.route('/categories/<int:category_id>', methods=['DELETE'])
@admin_required
def delete_category(user_id, category_id):
    """刪除分類"""
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 檢查是否有商品使用此分類
        cursor.execute("SELECT COUNT(*) FROM product WHERE category_id = %s", (category_id,))
        count = cursor.fetchone()[0]
        
        if count > 0:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': f'無法刪除，仍有 {count} 個商品使用此分類'}), 400
        
        cursor.execute("DELETE FROM category WHERE category_id = %s", (category_id,))
        conn.commit()
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({'message': '分類已刪除'}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

# ========== 交易監控 ==========

@bp.route('/transactions', methods=['GET'])
@admin_required
def get_all_transactions(user_id):
    """查詢所有交易紀錄"""
    try:
        status = request.args.get('status')  # 可選：'Paid', 'Unpaid', 'NA'
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        if status:
            query = """
                SELECT t.*, tr.request_type, 
                       p1.product_name as target_product_name,
                       p2.product_name as offered_product_name,
                       u1.user_name as buyer_name,
                       u2.user_name as seller_name
                FROM transaction t
                JOIN trade_request tr ON t.request_id = tr.request_id
                JOIN product p1 ON t.target_product_id = p1.product_id
                LEFT JOIN product p2 ON t.offered_product_id = p2.product_id
                JOIN "user" u1 ON tr.requester_id = u1.user_id
                JOIN "user" u2 ON p1.owner_id = u2.user_id
                WHERE t.payment_status = %s
                ORDER BY t.complete_date DESC
            """
            cursor.execute(query, (status,))
        else:
            query = """
                SELECT t.*, tr.request_type, 
                       p1.product_name as target_product_name,
                       p2.product_name as offered_product_name,
                       u1.user_name as buyer_name,
                       u2.user_name as seller_name
                FROM transaction t
                JOIN trade_request tr ON t.request_id = tr.request_id
                JOIN product p1 ON t.target_product_id = p1.product_id
                LEFT JOIN product p2 ON t.offered_product_id = p2.product_id
                JOIN "user" u1 ON tr.requester_id = u1.user_id
                JOIN "user" u2 ON p1.owner_id = u2.user_id
                ORDER BY t.complete_date DESC
            """
            cursor.execute(query)
        
        transactions = cursor.fetchall()
        DatabaseConfig.return_postgres_connection(conn)
        
        result = []
        for t in transactions:
            result.append({
                'transaction_id': t[0],
                'request_id': t[1],
                'request_type': t[8],
                'target_product_id': t[2],
                'target_product_name': t[9],
                'offered_product_id': t[3],
                'offered_product_name': t[10],
                'total_price': t[4],
                'complete_date': t[5].isoformat() if t[5] else None,
                'payment_status': t[6],
                'buyer_name': t[11],
                'seller_name': t[12],
                'created_at': t[7].isoformat() if t[7] else None
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== 系統統計 ==========

@bp.route('/statistics', methods=['GET'])
@admin_required
def get_statistics(user_id):
    """取得平台統計資料"""
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 總使用者數
        cursor.execute("SELECT COUNT(*) FROM \"user\" WHERE status = 'active'")
        total_users = cursor.fetchone()[0]
        
        # 總商品數
        cursor.execute("SELECT COUNT(*) FROM product WHERE status = 'available'")
        total_products = cursor.fetchone()[0]
        
        # 總交易數
        cursor.execute("SELECT COUNT(*) FROM transaction")
        total_transactions = cursor.fetchone()[0]
        
        # 待處理檢舉數
        cursor.execute("SELECT COUNT(*) FROM report WHERE status = 'Pending'")
        pending_reports = cursor.fetchone()[0]
        
        # 各分類商品數
        cursor.execute("""
            SELECT c.category_name, COUNT(p.product_id) as count
            FROM category c
            LEFT JOIN product p ON c.category_id = p.category_id AND p.status = 'available'
            GROUP BY c.category_id, c.category_name
            ORDER BY count DESC
        """)
        category_stats = []
        for row in cursor.fetchall():
            category_stats.append({
                'category_name': row[0],
                'count': row[1]
            })
        
        # 最近一週新增商品數
        cursor.execute("""
            SELECT COUNT(*) FROM product
            WHERE post_date >= CURRENT_DATE - INTERVAL '7 days'
        """)
        products_last_week = cursor.fetchone()[0]
        
        # 最近一週交易數
        cursor.execute("""
            SELECT COUNT(*) FROM transaction
            WHERE complete_date >= CURRENT_DATE - INTERVAL '7 days'
        """)
        transactions_last_week = cursor.fetchone()[0]
        
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({
            'total_users': total_users,
            'total_products': total_products,
            'total_transactions': total_transactions,
            'pending_reports': pending_reports,
            'category_statistics': category_stats,
            'products_last_week': products_last_week,
            'transactions_last_week': transactions_last_week
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== 檢舉管理 ==========

@bp.route('/reports', methods=['GET'])
@admin_required
def get_pending_reports(user_id):
    """查詢待處理檢舉"""
    
    try:
        status = request.args.get('status', 'Pending')
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT r.*, u1.user_name as reporter_name,
                   u2.user_name as reported_user_name, p.product_name
            FROM report r
            JOIN "user" u1 ON r.reporter_id = u1.user_id
            LEFT JOIN "user" u2 ON r.reported_user_id = u2.user_id
            LEFT JOIN product p ON r.reported_product_id = p.product_id
            WHERE r.status = %s
            ORDER BY r.created_at DESC
        """, (status,))
        
        reports = cursor.fetchall()
        DatabaseConfig.return_postgres_connection(conn)
        
        result = []
        for r in reports:
            result.append({
                'report_id': r[0],
                'reporter_id': r[1],
                'reporter_name': r[9],
                'reported_product_id': r[2],
                'reported_product_name': r[11],
                'reported_user_id': r[3],
                'reported_user_name': r[10],
                'report_type': r[4],
                'description': r[5],
                'status': r[6],
                'created_at': r[7].isoformat() if r[7] else None,
                'resolved_at': r[8].isoformat() if r[8] else None
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/reports/<int:report_id>/resolve', methods=['POST'])
@admin_required
def resolve_report(user_id, report_id):
    """處理檢舉"""
    
    try:
        data = request.get_json()
        status = data.get('status')  # 'Resolved' or 'Rejected'
        
        if not status or status not in ('Resolved', 'Rejected'):
            return jsonify({'error': '無效的狀態'}), 400
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE report
            SET status = %s, resolved_at = CURRENT_TIMESTAMP
            WHERE report_id = %s
        """, (status, report_id))
        
        conn.commit()
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({'message': '檢舉已處理'}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

