"""
商品相關 API
"""
from flask import Blueprint, request, jsonify
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))
from config.database import DatabaseConfig
from utils.auth import token_required, get_user_id
from models.mongodb_models import SearchLog

bp = Blueprint('products', __name__)

@bp.route('', methods=['GET'])
def get_products():
    """查詢商品列表"""
    try:
        status = request.args.get('status', 'available')
        category_id = request.args.get('category_id')
        search = request.args.get('search')
        trade_option = request.args.get('trade_option')
        owner_id = request.args.get('owner_id')
        
        conn = DatabaseConfig.get_postgres_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT p.*, u.user_name, c.category_name
            FROM product p
            JOIN "user" u ON p.owner_id = u.user_id
            JOIN category c ON p.category_id = c.category_id
            WHERE p.status = %s AND u.deleted_at IS NULL
        """
        params = [status]
        
        if owner_id:
            query += " AND p.owner_id = %s"
            params.append(owner_id)
        
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
        
        # 如果有搜尋關鍵字，記錄到 MongoDB
        if search:
            try:
                # 嘗試獲取用戶 ID（如果已登入）
                user_id = get_user_id()
                
                # 準備篩選條件
                filters = {}
                if category_id:
                    filters['category_id'] = category_id
                if trade_option:
                    filters['trade_option'] = trade_option
                if owner_id:
                    filters['owner_id'] = owner_id
                if status:
                    filters['status'] = status
                
                # 記錄搜尋行為到 MongoDB
                SearchLog.log_search(
                    user_id=user_id,
                    keywords=search,
                    filters=filters,
                    result_count=len(result)
                )
            except Exception as e:
                # 如果記錄失敗，不影響主要功能，只記錄錯誤
                print(f"記錄搜尋行為失敗: {str(e)}")
        
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
            SELECT p.*, u.user_name, u.email, u.phone, c.category_name, u.deleted_at
            FROM product p
            JOIN "user" u ON p.owner_id = u.user_id
            JOIN category c ON p.category_id = c.category_id
            WHERE p.product_id = %s
        """, (product_id,))
        
        product = cursor.fetchone()
        
        if not product:
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '商品不存在'}), 404
        
        # 獲取賣家統計數據（交易成功次數和檢舉成功次數）
        owner_id = product[1]
        
        # 計算交易成功次數（該用戶作為賣家的完成交易數）
        cursor.execute("""
            SELECT COUNT(*)
            FROM transaction t
            JOIN product p ON t.target_product_id = p.product_id
            WHERE p.owner_id = %s
        """, (owner_id,))
        successful_transactions_as_seller = cursor.fetchone()[0] or 0
        
        # 計算交易成功次數（該用戶作為買家的完成交易數）
        cursor.execute("""
            SELECT COUNT(*)
            FROM transaction t
            JOIN trade_request tr ON t.request_id = tr.request_id
            WHERE tr.requester_id = %s
        """, (owner_id,))
        successful_transactions_as_buyer = cursor.fetchone()[0] or 0
        
        # 總交易成功次數 = 作為賣家 + 作為買家
        successful_transactions = successful_transactions_as_seller + successful_transactions_as_buyer
        
        # 計算被檢舉次數（該用戶被檢舉的次數，只計算已處理成功的檢舉）
        cursor.execute("""
            SELECT COUNT(*)
            FROM report
            WHERE reported_user_id = %s AND status = 'Resolved'
        """, (owner_id,))
        total_reports = cursor.fetchone()[0] or 0
        
        # 同時計算被檢舉商品的次數（該用戶擁有的商品被檢舉的次數，只計算已處理成功的檢舉）
        cursor.execute("""
            SELECT COUNT(*)
            FROM report r
            JOIN product p ON r.reported_product_id = p.product_id
            WHERE p.owner_id = %s AND r.status = 'Resolved'
        """, (owner_id,))
        product_reports = cursor.fetchone()[0] or 0
        
        # 總檢舉次數 = 被檢舉為使用者的次數 + 被檢舉商品的次數
        total_reports_count = total_reports + product_reports
        
        # 計算好評率：按讚/(按讚+倒讚)*100%，不做評價的不計入
        cursor.execute("""
            SELECT 
                COUNT(CASE WHEN rating = 5 THEN 1 END) as positive_reviews,
                COUNT(CASE WHEN rating = 1 THEN 1 END) as negative_reviews
            FROM review
            WHERE reviewee_id = %s
        """, (owner_id,))
        review_stats = cursor.fetchone()
        positive_reviews = review_stats[0] or 0
        negative_reviews = review_stats[1] or 0
        total_reviews = positive_reviews + negative_reviews  # 只計算有評價的
        # 好評率 = 按讚/(按讚+倒讚)*100%
        positive_rate = round((positive_reviews / total_reviews * 100), 1) if total_reviews > 0 else 0
        
        DatabaseConfig.return_postgres_connection(conn)
        
        # product 表欄位順序：
        # 0: product_id, 1: owner_id, 2: category_id, 3: product_name
        # 4: price, 5: trade_option, 6: condition, 7: description
        # 8: trade_item, 9: status, 10: image_url, 11: post_date
        # 12: created_at, 13: updated_at
        # JOIN 結果: 14: user_name, 15: email, 16: phone, 17: category_name, 18: deleted_at
        owner_deleted = product[18] is not None
        return jsonify({
            'product_id': product[0],
            'owner_id': product[1],
            'owner_name': product[14] + (' (已刪除)' if owner_deleted else ''),
            'owner_email': product[15],
            'owner_phone': product[16],
            'owner_deleted': owner_deleted,
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
            'post_date': product[11].isoformat() if product[11] else None,
            'seller_stats': {
                'successful_transactions': successful_transactions,
                'successful_transactions_as_seller': successful_transactions_as_seller,
                'successful_transactions_as_buyer': successful_transactions_as_buyer,
                'total_reports': total_reports_count,
                'total_reviews': total_reviews,
                'positive_reviews': positive_reviews,
                'positive_rate': positive_rate
            }
        }), 200
        
    except Exception as e:
        if conn:
            DatabaseConfig.return_postgres_connection(conn)
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
        
        # 驗證：如果價格為 0 或 null，trade_option 不能是 'sale'
        price = data.get('price')
        trade_option = data['trade_option']
        if (price is None or price == 0) and trade_option == 'sale':
            return jsonify({'error': '價格為 0 的商品只能設定為「以物易物」或「兩者皆可」，不能僅設定為「販售」'}), 400
        
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
            price,
            trade_option,
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
        
        # 驗證：如果價格為 0 或 null，trade_option 不能是 'sale'
        price = data.get('price') if 'price' in data else None
        trade_option = data.get('trade_option')
        
        # 如果更新了價格或交易選項，需要驗證
        if 'price' in data or 'trade_option' in data:
            # 獲取當前的價格和交易選項
            if price is None:
                cursor.execute("SELECT price, trade_option FROM product WHERE product_id = %s", (product_id,))
                current_data = cursor.fetchone()
                current_price = price if price is not None else current_data[0]
                current_trade_option = trade_option if trade_option else current_data[1]
            else:
                current_price = price
                current_trade_option = trade_option if trade_option else None
                if current_trade_option is None:
                    cursor.execute("SELECT trade_option FROM product WHERE product_id = %s", (product_id,))
                    current_trade_option = cursor.fetchone()[0]
            
            # 驗證邏輯
            final_price = current_price
            final_trade_option = current_trade_option
            
            if (final_price is None or final_price == 0) and final_trade_option == 'sale':
                DatabaseConfig.return_postgres_connection(conn)
                return jsonify({'error': '價格為 0 的商品只能設定為「以物易物」或「兩者皆可」，不能僅設定為「販售」'}), 400
        
        # 更新商品
        update_fields = []
        params = []
        
        if 'product_name' in data:
            update_fields.append("product_name = %s")
            params.append(data['product_name'])
        if 'price' in data:
            update_fields.append("price = %s")
            params.append(data['price'])
        if 'trade_option' in data:
            update_fields.append("trade_option = %s")
            params.append(data['trade_option'])
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
    """刪除商品（完全刪除，會連帶刪除相關資料）"""
    conn = None
    cursor = None
    try:
        # 第一階段：檢查和驗證（使用 autocommit 模式）
        conn = DatabaseConfig.get_postgres_connection()
        conn.autocommit = True  # 使用 autocommit 模式進行檢查
        cursor = conn.cursor()
        
        # 檢查商品是否屬於該使用者
        cursor.execute("SELECT owner_id, status FROM product WHERE product_id = %s", (product_id,))
        product = cursor.fetchone()
        
        if not product:
            cursor.close()
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '商品不存在'}), 404
        
        if product[0] != user_id:
            cursor.close()
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({'error': '無權限刪除此商品'}), 403
        
        # 檢查商品是否有進行中的交易請求（只檢查 Pending 或 Accepted）
        # Cancelled 和 Rejected 狀態的請求不應該阻止刪除
        cursor.execute("""
            SELECT COUNT(*) 
            FROM trade_request 
            WHERE (target_product_id = %s OR offered_product_id = %s)
            AND status IN ('Pending', 'Accepted')
        """, (product_id, product_id))
        
        active_requests = cursor.fetchone()[0]
        
        if active_requests > 0:
            cursor.close()
            DatabaseConfig.return_postgres_connection(conn)
            return jsonify({
                'error': '無法刪除商品：該商品有進行中的交易請求，請先處理完所有交易請求後再刪除'
            }), 400
        
        # 檢查是否有已完成的交易（Completed）
        cursor.execute("""
            SELECT COUNT(*) 
            FROM trade_request 
            WHERE (target_product_id = %s OR offered_product_id = %s)
            AND status = 'Completed'
        """, (product_id, product_id))
        
        completed_transactions = cursor.fetchone()[0]
        
        # 如果商品狀態是 reserved 但沒有進行中的請求，先改回 available
        # 這可能是因為之前的請求被取消或拒絕，但商品狀態沒有正確更新
        if product[1] == 'reserved' and active_requests == 0:
            cursor.execute("""
                UPDATE product 
                SET status = 'available', updated_at = CURRENT_TIMESTAMP
                WHERE product_id = %s
            """, (product_id,))
        
        cursor.close()
        DatabaseConfig.return_postgres_connection(conn)
        
        # 第二階段：執行刪除（使用事務）
        conn = DatabaseConfig.get_postgres_connection()
        conn.autocommit = False  # 開始事務
        cursor = conn.cursor()
        
        # 根據 CASCADE 設定，刪除商品會自動：
        # 1. 刪除 trade_request（target_product_id 或 offered_product_id = 此商品）
        # 2. 刪除 transaction（target_product_id 或 offered_product_id = 此商品）
        # 3. 刪除 trade_wish（offered_product_id = 此商品）
        # 4. report.reported_product_id 會設為 NULL（SET NULL）
        
        if completed_transactions > 0:
            # 有已完成交易，只更新狀態為 removed，不真正刪除
            cursor.execute("""
                UPDATE product 
                SET status = 'removed', updated_at = CURRENT_TIMESTAMP
                WHERE product_id = %s
            """, (product_id,))
            
            conn.commit()
            cursor.close()
            DatabaseConfig.return_postgres_connection(conn)
            
            return jsonify({
                'message': '商品已下架（保留交易紀錄）',
                'note': '該商品有已完成交易，已改為下架狀態而非完全刪除'
            }), 200
        else:
            # 沒有已完成交易，可以完全刪除
            # 刪除商品（CASCADE 會自動處理相關資料）
            cursor.execute("DELETE FROM product WHERE product_id = %s", (product_id,))
            
            deleted_count = cursor.rowcount
            
            if deleted_count == 0:
                conn.rollback()
                cursor.close()
                DatabaseConfig.return_postgres_connection(conn)
                return jsonify({'error': '刪除失敗'}), 500
            
            conn.commit()
            cursor.close()
            DatabaseConfig.return_postgres_connection(conn)
            
            return jsonify({
                'message': '商品已完全刪除',
                'note': '相關的交易請求、訊息等資料已一併刪除'
            }), 200
        
    except Exception as e:
        if conn:
            try:
                if not conn.autocommit:
                    conn.rollback()
            except:
                pass
            try:
                if cursor:
                    cursor.close()
            except:
                pass
            DatabaseConfig.return_postgres_connection(conn)
        return jsonify({'error': str(e)}), 500

