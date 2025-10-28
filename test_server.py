"""
Simple test server to check if Computer B can reach Computer A
Run this on Computer A instead of the full bridge
"""

import http.server
import socketserver
import json
import time

class TestHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/data':
            # Send test data
            test_data = {
                "timestamp": int(time.time()),
                "desired_position": 10.5,
                "current_position": 8.2,
                "servo_command": 0.65,
                "error": 2.3,
                "p_output": 0.15,
                "i_output": 0.02,
                "d_output": 0.01
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(test_data).encode())
            
        elif self.path == '/status':
            status = {
                "pico_connected": True,
                "port": "TEST",
                "timestamp": time.time()
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(status).encode())
        else:
            self.send_error(404)
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        pass  # Suppress logs

if __name__ == "__main__":
    PORT = 9999
    print(f"🧪 Test server starting on port {PORT}")
    print("🌐 Computer B should connect to: http://172.28.0.181:9999")
    print("📡 This sends fake data to test the connection")
    print("Press Ctrl+C to stop")
    
    with socketserver.TCPServer(("", PORT), TestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Test server stopped")