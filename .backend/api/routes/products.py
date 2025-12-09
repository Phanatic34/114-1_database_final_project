"""
商品相關 API
"""
from flask import Blueprint, request, jsonify
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))
from config.database import DatabaseConfig
from utils.auth import token_required

bp = Blueprint('products', __name__)

@bp.route('', methods=['GET'])
def get_products():
    """查詢商品列表"""
    try:
        status = request.args.get('status', 'available')
        category_id = request.args.get('category_id')
        search = request.args.get('search')
        trade_option = request.args.get('trade_option')
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT p.*, u.user_name, c.category_name
            FROM product p
            JOIN "user" u ON p.owner_id = u.user_id
            JOIN category c ON p.category_id = c.category_id
            WHERE p.status = %s
        """
        params = [status]
        
        if category_id:
            query += " AND p.category_id = %s"
            params.append(category_id)
        
        if trade_option:
            query += " AND (p.trade_option = %s OR p.trade_option = 'both')"
            params.append(trade_option)
        
        if search:
            query += " AND (p.product_name LIKE %s OR p.description LIKE %s)"
            params.extend([f'%{search}%', f'%{search}%'])
        
        query += " ORDER BY p.post_date DESC"
        
        cursor.execute(query, params)
        products = cursor.fetchall()
        
        DatabaseConfig.return_postgres_connection(conn)
        
        result = []
        # product 表 14 個欄位 (0-13)，然後 user_name=14, category_name=15
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
                'post_date': p[11].isoformat() if p[11] else None
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """查詢單一商品詳情"""
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT p.*, u.user_name, u.email, u.phone, c.category_name
            FROM product p
            JOIN "user" u ON p.owner_id = u.user_id
            JOIN category c ON p.category_id = c.category_id
            WHERE p.product_id = %s
        """, (product_id,))
        
        product = cursor.fetchone()
        DatabaseConfig.return_postgres_connection(conn)
        
        if not product:
            return jsonify({'error': '商品不存在'}), 404
        
        # product 表欄位順序：
        # 0: product_id, 1: owner_id, 2: category_id, 3: product_name
        # 4: price, 5: trade_option, 6: condition, 7: description
        # 8: trade_item, 9: status, 10: image_url, 11: post_date
        # 12: created_at, 13: updated_at
        # JOIN 結果: 14: user_name, 15: email, 16: phone, 17: category_name
        return jsonify({
            'product_id': product[0],
            'owner_id': product[1],
            'owner_name': product[14],
            'owner_email': product[15],
            'owner_phone': product[16],
            'category_id': product[2],
            'category_name': product[17],
            'product_name': product[3],
            'price': product[4],
            'trade_option': product[5],
            'condition': product[6],
            'description': product[7],
            'trade_item': product[8],
            'status': product[9],
            'image_url': product[10],
            'post_date': product[11].isoformat() if product[11] else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['POST'])
@token_required
def create_product(user_id):
    """新增商品"""
    try:
        data = request.get_json()
        print(f"收到商品建立請求: {data}")  # 調試用
        
        required_fields = ['category_id', 'product_name', 'condition', 'trade_option']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({'error': f'缺少必要欄位: {", ".join(missing_fields)}'}), 400
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO product (owner_id, category_id, product_name, price, trade_option, 
                                condition, description, trade_item, image_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING product_id
        """, (
            user_id,
            data['category_id'],
            data['product_name'],
            data.get('price'),
            data['trade_option'],
            data['condition'],
            data.get('description'),
            data.get('trade_item'),
            data.get('image_url')
        ))
        
        product_id = cursor.fetchone()[0]
        conn.commit()
        
        DatabaseConfig.return_postgres_connection(conn)
        
        print(f"商品建立成功，product_id: {product_id}")  # 調試用
        return jsonify({
            'message': '商品新增成功',
            'product_id': product_id
        }), 201
        
    except Exception as e:
        print(f"商品建立錯誤: {str(e)}")  # 調試用
        import traceback
        traceback.print_exc()
        if 'conn' in locals():
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:product_id>', methods=['PUT'])
@token_required
def update_product(user_id, product_id):
    """更新商品"""
    try:
        data = request.get_json()
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 檢查商品是否屬於該使用者
        cursor.execute("SELECT owner_id FROM product WHERE product_id = %s", (product_id,))
        product = cursor.fetchone()
        
        if not product:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '商品不存在'}), 404
        
        if product[0] != user_id:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '無權限修改此商品'}), 403
        
        # 更新商品
        update_fields = []
        params = []
        
        if 'product_name' in data:
            update_fields.append("product_name = %s")
            params.append(data['product_name'])
        if 'price' in data:
            update_fields.append("price = %s")
            params.append(data['price'])
        if 'condition' in data:
            update_fields.append("condition = %s")
            params.append(data['condition'])
        if 'description' in data:
            update_fields.append("description = %s")
            params.append(data['description'])
        if 'trade_item' in data:
            update_fields.append("trade_item = %s")
            params.append(data['trade_item'])
        if 'image_url' in data:
            update_fields.append("image_url = %s")
            params.append(data['image_url'])
        
        if not update_fields:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '沒有要更新的欄位'}), 400
        
        params.append(product_id)
        query = f"UPDATE product SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP WHERE product_id = %s"
        
        cursor.execute(query, params)
        conn.commit()
        
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({'message': '商品更新成功'}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:product_id>', methods=['DELETE'])
@token_required
def delete_product(user_id, product_id):
    """刪除商品（下架）"""
    try:
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        # 檢查商品是否屬於該使用者
        cursor.execute("SELECT owner_id FROM product WHERE product_id = %s", (product_id,))
        product = cursor.fetchone()
        
        if not product:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '商品不存在'}), 404
        
        if product[0] != user_id:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '無權限刪除此商品'}), 403
        
        # 更新狀態為 removed
        cursor.execute("""
            UPDATE product 
            SET status = 'removed', updated_at = CURRENT_TIMESTAMP
            WHERE product_id = %s
        """, (product_id,))
        
        conn.commit()
        DatabaseConfig.return_postgres_connection(conn)
        
        return jsonify({'message': '商品已下架'}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

