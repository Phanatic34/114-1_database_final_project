"""
管理員相關 API
"""
from flask import Blueprint, request, jsonify
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))
from config.database import DatabaseConfig
from utils.auth import token_required

bp = Blueprint('admin', __name__)

def is_admin(user_id):
    """檢查是否為管理員"""
    conn = DatabaseConfig.get_postgres_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT admin_id FROM admin WHERE user_id = %s", (user_id,))
    is_admin = cursor.fetchone() is not None
    
    DatabaseConfig.return_postgres_connection(conn)
    return is_admin

@bp.route('/products/<int:product_id>', methods=['DELETE'])
@token_required
def delete_product(user_id, product_id):
    """管理員刪除商品"""
    if not is_admin(user_id):
        return jsonify({'error': '無權限'}), 403
    
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
@token_required
def update_product_status(user_id, product_id):
    """管理員更新商品狀態"""
    if not is_admin(user_id):
        return jsonify({'error': '無權限'}), 403
    
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

@bp.route('/reports', methods=['GET'])
@token_required
def get_pending_reports(user_id):
    """查詢待處理檢舉"""
    if not is_admin(user_id):
        return jsonify({'error': '無權限'}), 403
    
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
@token_required
def resolve_report(user_id, report_id):
    """處理檢舉"""
    if not is_admin(user_id):
        return jsonify({'error': '無權限'}), 403
    
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

