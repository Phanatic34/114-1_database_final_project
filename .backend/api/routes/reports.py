"""
檢舉相關 API
"""
from flask import Blueprint, request, jsonify
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))
from config.database import DatabaseConfig
from utils.auth import token_required

bp = Blueprint('reports', __name__)

@bp.route('', methods=['POST'])
@token_required
def create_report(user_id):
    """提出檢舉"""
    try:
        data = request.get_json()
        reported_product_id = data.get('reported_product_id')
        reported_user_id = data.get('reported_user_id')
        report_type = data.get('report_type')
        description = data.get('description')
        
        if not report_type or not description:
            return jsonify({'error': '缺少必要欄位'}), 400
        
        if not reported_product_id and not reported_user_id:
            return jsonify({'error': '必須檢舉商品或使用者'}), 400
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO report 
            (reporter_id, reported_product_id, reported_user_id, report_type, description)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING report_id
        """, (user_id, reported_product_id, reported_user_id, report_type, description))
        
        report_id = cursor.fetchone()[0]
        conn.commit()
        
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({
            'message': '檢舉已提交',
            'report_id': report_id
        }), 201
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

