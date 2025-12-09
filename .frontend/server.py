#!/usr/bin/env python3
"""
自訂 HTTP 伺服器，禁用快取以解決 304 問題
"""
import http.server
import socketserver
from pathlib import Path
import sys

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自訂請求處理器，禁用快取"""
    
    def end_headers(self):
        # 禁用所有快取
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        # 允許 CORS（如果需要）
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
    
    def log_message(self, format, *args):
        # 簡化日誌輸出，只顯示重要請求
        message = format % args
        # 只顯示 HTML 頁面請求，不顯示 JS/CSS 等資源請求
        if any(ext in message for ext in ['.html', '.htm']):
            print(message)
        # 靜默處理其他請求（減少日誌輸出）
    
    def handle_one_request(self):
        """處理單個請求，捕獲連接中斷錯誤"""
        try:
            super().handle_one_request()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError) as e:
            # 客戶端中斷連接是正常的（例如用戶停止載入、切換頁面等）
            # 靜默處理，不顯示錯誤
            pass
        except Exception as e:
            # 其他錯誤才記錄
            self.log_error(f"處理請求時發生錯誤: {e}")
    
    def finish(self):
        """完成請求處理，捕獲連接中斷錯誤"""
        try:
            super().finish()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            # 靜默處理連接中斷
            pass

if __name__ == '__main__':
    PORT = 8000
    
    # 確保在正確的目錄
    frontend_dir = Path(__file__).parent
    import os
    os.chdir(frontend_dir)
    
    Handler = NoCacheHTTPRequestHandler
    
    # 使用 ThreadingMixIn 提高性能（處理並發請求）
    class ThreadedHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
        daemon_threads = True
        allow_reuse_address = True
    
    with ThreadedHTTPServer(("", PORT), Handler) as httpd:
        print(f"========================================")
        print(f"  前端服務已啟動")
        print(f"========================================")
        print(f"")
        print(f"  網址: http://localhost:{PORT}")
        print(f"  狀態: 已禁用快取（避免 304 問題）")
        print(f"  模式: 多線程（提升性能）")
        print(f"")
        print(f"  按 Ctrl+C 停止服務")
        print(f"========================================")
        print(f"")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n服務已停止")
            sys.exit(0)

