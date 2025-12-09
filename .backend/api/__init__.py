"""
API 模組
"""
from flask import Flask, jsonify
from flask_cors import CORS

def create_app():
    """建立 Flask 應用程式"""
    app = Flask(__name__)
    
    # 啟用 CORS - 允許所有來源和方法
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    
    # 註冊藍圖
    from .routes import auth, products, trade_requests, transactions, reviews, messages, reports, admin
    
    app.register_blueprint(auth.bp, url_prefix='/api/auth')
    app.register_blueprint(products.bp, url_prefix='/api/products')
    app.register_blueprint(trade_requests.bp, url_prefix='/api/trade-requests')
    app.register_blueprint(transactions.bp, url_prefix='/api/transactions')
    app.register_blueprint(reviews.bp, url_prefix='/api/reviews')
    app.register_blueprint(messages.bp, url_prefix='/api/messages')
    app.register_blueprint(reports.bp, url_prefix='/api/reports')
    app.register_blueprint(admin.bp, url_prefix='/api/admin')
    
    # 根路由 - 用於測試
    @app.route('/')
    def index():
        return jsonify({
            'message': '校園生活用品交換與買賣平台 API',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/api/auth',
                'products': '/api/products',
                'trade-requests': '/api/trade-requests',
                'transactions': '/api/transactions',
                'reviews': '/api/reviews',
                'messages': '/api/messages',
                'reports': '/api/reports',
                'admin': '/api/admin'
            }
        })
    
    @app.route('/api')
    def api_index():
        return jsonify({
            'message': 'API 端點列表',
            'endpoints': {
                'auth': {
                    'register': 'POST /api/auth/register',
                    'login': 'POST /api/auth/login'
                },
                'products': {
                    'list': 'GET /api/products',
                    'get': 'GET /api/products/<id>',
                    'create': 'POST /api/products?user_id=<id>',
                    'update': 'PUT /api/products/<id>?user_id=<id>',
                    'delete': 'DELETE /api/products/<id>?user_id=<id>'
                }
            }
        })
    
    @app.teardown_appcontext
    def close_db(error):
        """關閉資料庫連線"""
        pass  # 連線池會自動管理
    
    return app

