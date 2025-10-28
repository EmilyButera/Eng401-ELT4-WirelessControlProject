import http.server
import socketserver
import json
import time
import threading
import math
import random

class SimpleDataServer:
    def __init__(self):
        self.running = True
        self.sim_time = 0
        self.current_data = None
        self.lock = threading.Lock()
        
    def generate_data(self):
        """Generate realistic PID control data"""
        while self.running:
            self.sim_time += 0.1
            
            # Realistic PID control simulation
            desired = 15 + 8 * math.sin(self.sim_time * 0.05)
            actual = desired + 3 * math.sin(self.sim_time * 0.2) + random.random() * 0.5 - 0.25
            error = desired - actual
            
            data = {
                "timestamp": int(time.time() * 1000),
                "desired_position": round(desired, 1),
                "current_position": round(actual, 1), 
                "servo_command": round(max(0.18, min(0.9, 0.54 + error * 0.02)), 3),
                "error": round(error, 1),
                "p_output": round(0.06 * error, 3),
                "i_output": round(0.05 * error * 0.01, 3),
                "d_output": round(0.016 * error, 3)
            }
            
            with self.lock:
                self.current_data = data
                
            time.sleep(0.1)

class RequestHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/data':
            with server.lock:
                data = server.current_data
                
            if data:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode())
            else:
                self.send_error(503, "No data")
                
        elif self.path == '/status':
            status = {"connected": True, "timestamp": time.time()}
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
        pass

if __name__ == "__main__":
    server = SimpleDataServer()
    
    # Start data generation
    data_thread = threading.Thread(target=server.generate_data, daemon=True)
    data_thread.start()
    
    # Start HTTP server
    PORT = 9999
    print(f"🚀 STABLE SERVER RUNNING ON PORT {PORT}")
    print(f"🌐 Computer B connect to: http://172.28.0.181:{PORT}")
    print("📊 Serving simulated PID data for testing")
    print("Press Ctrl+C to stop")
    
    try:
        with socketserver.TCPServer(("", PORT), RequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        server.running = False