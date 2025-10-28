"""
Complete Hardware Bridge - Works with or without Pico for testing
This runs on Computer A and serves data to Computer B
"""

import json
import time
import threading
import http.server
import socketserver
import sys
from datetime import datetime
import math

class SmartPicoBridge:
    def __init__(self, port='COM12', baudrate=115200):
        self.serial_port = port
        self.baudrate = baudrate
        self.serial_connection = None
        self.latest_data = None
        self.running = False
        self.pico_connected = False
        self.data_lock = threading.Lock()
        self.use_simulation = False
        
        # Simulation data for testing
        self.sim_time = 0
        
    def try_pico_connection(self):
        """Try to connect to real Pico, fall back to simulation if failed"""
        try:
            import serial
            import serial.tools.list_ports
            
            # Check if COM port exists
            ports = [p.device for p in serial.tools.list_ports.comports()]
            print(f"🔍 Available ports: {ports}")
            
            if self.serial_port not in ports:
                print(f"⚠️ {self.serial_port} not found in available ports")
                return False
                
            # Try to connect
            print(f"🔌 Attempting to connect to Pico on {self.serial_port}...")
            self.serial_connection = serial.Serial(self.serial_port, self.baudrate, timeout=1)
            
            # Test for data
            print("🧪 Testing for Pico data...")
            for _ in range(3):
                line = self.serial_connection.readline().decode().strip()
                if line and ('{' in line or 'DATA:' in line):
                    print("✅ Real Pico detected and working!")
                    self.pico_connected = True
                    return True
                time.sleep(0.5)
            
            print("⚠️ Port connected but no valid data received")
            self.serial_connection.close()
            return False
            
        except ImportError:
            print("❌ pyserial not installed")
            return False
        except Exception as e:
            print(f"❌ Pico connection failed: {e}")
            return False
    
    def generate_simulation_data(self):
        """Generate realistic simulation data for testing"""
        self.sim_time += 0.1
        
        # Simulate potentiometer input (desired position)
        desired = 15 + 10 * math.sin(self.sim_time * 0.1)
        
        # Simulate sensor readings with some noise
        actual = desired + 2 * math.sin(self.sim_time * 0.3) + 0.5 * math.sin(self.sim_time)
        
        # Calculate PID outputs
        error = desired - actual
        p_out = 0.06 * error
        i_out = 0.05 * error * self.sim_time * 0.01
        d_out = 0.016 * error * 10
        
        servo_cmd = max(0.18, min(0.9, 0.54 + (p_out + i_out + d_out)))
        
        return {
            "timestamp": int(time.time() * 1000),
            "desired_position": round(desired, 1),
            "current_position": round(actual, 1),
            "servo_command": round(servo_cmd, 3),
            "error": round(error, 1),
            "p_output": round(p_out, 3),
            "i_output": round(i_out, 3),
            "d_output": round(d_out, 3)
        }
    
    def read_pico_data(self):
        """Read data from Pico or generate simulation data"""
        while self.running:
            try:
                if self.pico_connected and self.serial_connection:
                    # Read from real Pico
                    line = self.serial_connection.readline().decode().strip()
                    if line:
                        # Handle DATA: prefix
                        json_line = line[5:] if line.startswith("DATA:") else line
                        
                        try:
                            data = json.loads(json_line)
                            with self.data_lock:
                                self.latest_data = data
                        except json.JSONDecodeError:
                            print(f"📝 Pico: {line}")
                
                elif self.use_simulation:
                    # Generate simulation data
                    data = self.generate_simulation_data()
                    with self.data_lock:
                        self.latest_data = data
                    time.sleep(0.1)
                
                else:
                    time.sleep(0.1)
                    
            except Exception as e:
                print(f"⚠️ Data read error: {e}")
                time.sleep(0.1)
    
    def get_latest_data(self):
        """Get the latest data"""
        with self.data_lock:
            return self.latest_data.copy() if self.latest_data else None
    
    def start_server(self):
        """Start HTTP server for Computer B"""
        class DataHandler(http.server.BaseHTTPRequestHandler):
            def __init__(self, *args, bridge=None, **kwargs):
                self.bridge = bridge
                super().__init__(*args, **kwargs)
                
            def do_GET(self):
                if self.path == '/data':
                    data = self.bridge.get_latest_data()
                    if data:
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps(data).encode())
                    else:
                        self.send_error(503, "No data available")
                        
                elif self.path == '/status':
                    status = {
                        "pico_connected": self.bridge.pico_connected,
                        "simulation_mode": self.bridge.use_simulation,
                        "port": self.bridge.serial_port,
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
        
        def handler(*args, **kwargs):
            return DataHandler(*args, bridge=self, **kwargs)
        
        port = 9999
        try:
            with socketserver.TCPServer(("", port), handler) as httpd:
                print(f"🌐 Server running on all interfaces, port {port}")
                print(f"📡 Computer B should connect to: http://172.28.0.181:{port}")
                if self.pico_connected:
                    print("✅ Serving REAL Pico data")
                elif self.use_simulation:
                    print("🎯 Serving SIMULATION data for testing")
                else:
                    print("⏳ Waiting for data source...")
                print("=" * 60)
                httpd.serve_forever()
        except Exception as e:
            print(f"❌ Server error: {e}")
    
    def start(self):
        """Start the complete bridge system"""
        print("🌉 Smart Pico Bridge Starting...")
        print("=" * 60)
        
        # Try to connect to real Pico first
        if self.try_pico_connection():
            print("🎉 Using REAL Pico data!")
        else:
            print("🤖 Real Pico not available, using simulation for testing")
            self.use_simulation = True
        
        self.running = True
        
        # Start data thread
        data_thread = threading.Thread(target=self.read_pico_data, daemon=True)
        data_thread.start()
        
        # Start server
        try:
            self.start_server()
        except KeyboardInterrupt:
            print("\n🛑 Bridge stopped")
            self.running = False
            if self.serial_connection:
                self.serial_connection.close()

def main():
    bridge = SmartPicoBridge()
    bridge.start()

if __name__ == "__main__":
    main()