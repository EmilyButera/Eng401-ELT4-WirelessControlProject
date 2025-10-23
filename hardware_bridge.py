"""
Hardware Data Bridge - Connects Raspberry Pi Pico to Web Interface
This script runs on Computer A, reads real sensor data from the Pico via USB serial,
and serves it to Computer B over the network for the HTML interface.
"""

import serial
import json
import time
import threading
import http.server
import socketserver
import sys
from datetime import datetime
import urllib.parse

class PicoDataBridge:
    def __init__(self, port='COM3', baudrate=115200):
        self.serial_port = port
        self.baudrate = baudrate
        self.serial_connection = None
        self.latest_data = None
        self.command_queue = []
        self.running = False
        
        # Network server settings
        self.http_port = 9999
        
        # Connection state
        self.pico_connected = False
        self.data_lock = threading.Lock()
        
    def find_pico_port(self):
        """Automatically find the Pico's COM port"""
        import serial.tools.list_ports
        
        print("🔍 Searching for Raspberry Pi Pico...")
        ports = serial.tools.list_ports.comports()
        
        for port in ports:
            # Look for Pico-specific identifiers
            if any(keyword in port.description.lower() for keyword in 
                   ['pico', 'raspberry pi', 'micropython', 'circuitpython']):
                print(f"📱 Found Pico on {port.device}: {port.description}")
                return port.device
                
        # If not found, list all available ports
        print("❓ Pico not auto-detected. Available ports:")
        for port in ports:
            print(f"   {port.device}: {port.description}")
            
        return None
    
    def connect_to_pico(self):
        """Connect to the Raspberry Pi Pico via USB serial"""
        try:
            # Auto-detect port if needed
            if self.serial_port == 'AUTO':
                detected_port = self.find_pico_port()
                if detected_port:
                    self.serial_port = detected_port
                else:
                    print("❌ Could not auto-detect Pico port. Please specify manually.")
                    return False
            
            print(f"🔌 Connecting to Pico on {self.serial_port}...")
            self.serial_connection = serial.Serial(
                port=self.serial_port,
                baudrate=self.baudrate,
                timeout=1
            )
            
            # Wait for connection to stabilize
            time.sleep(2)
            
            # Test connection
            if self.serial_connection.is_open:
                print("✅ Successfully connected to Pico!")
                self.pico_connected = True
                return True
            else:
                print("❌ Failed to open serial connection")
                return False
                
        except serial.SerialException as e:
            print(f"❌ Serial connection error: {e}")
            print("💡 Make sure the Pico is connected and the correct port is specified")
            return False
        except Exception as e:
            print(f"❌ Connection error: {e}")
            return False
    
    def send_command_to_pico(self, command):
        """Send a command to the Pico"""
        if not self.pico_connected or not self.serial_connection:
            return False
            
        try:
            command_json = json.dumps(command) + "\n"
            self.serial_connection.write(command_json.encode())
            print(f"📤 Sent to Pico: {command}")
            return True
        except Exception as e:
            print(f"❌ Error sending command: {e}")
            return False
    
    def read_pico_data(self):
        """Continuously read data from the Pico"""
        print("📊 Starting data collection from Pico...")
        
        while self.running and self.pico_connected:
            try:
                if self.serial_connection and self.serial_connection.in_waiting > 0:
                    line = self.serial_connection.readline().decode().strip()
                    
                    if line:
                        # Parse different types of messages from Pico
                        if line.startswith("DATA:"):
                            # Sensor data
                            try:
                                data_json = line[5:]  # Remove "DATA:" prefix
                                data = json.loads(data_json)
                                
                                with self.data_lock:
                                    self.latest_data = data
                                    
                                # Print formatted data to console
                                print(f"📈 D:{data['desired_position']:5.1f} C:{data['current_position']:5.1f} S:{data['servo_command']:5.2f} E:{data['error']:5.1f}")
                                
                            except json.JSONDecodeError:
                                print(f"❓ Invalid JSON from Pico: {line}")
                                
                        elif line.startswith("CMD_ACK:"):
                            # Command acknowledgment
                            print(f"✅ Pico acknowledged: {line}")
                            
                        else:
                            # Regular debug output from Pico
                            print(f"🎛️  Pico: {line}")
                
                # Process any pending commands to send to Pico
                while self.command_queue:
                    command = self.command_queue.pop(0)
                    self.send_command_to_pico(command)
                
                time.sleep(0.01)  # Small delay to prevent overwhelming
                
            except Exception as e:
                print(f"❌ Error reading from Pico: {e}")
                self.pico_connected = False
                break
    
    def add_command(self, command):
        """Add a command to send to the Pico"""
        self.command_queue.append(command)
    
    def get_latest_data(self):
        """Get the latest data from Pico"""
        with self.data_lock:
            return self.latest_data.copy() if self.latest_data else None
    
    def start_http_server(self):
        """Start HTTP server for Computer B communication"""
        
        class DataHandler(http.server.BaseHTTPRequestHandler):
            def __init__(self, *args, bridge=None, **kwargs):
                self.bridge = bridge
                super().__init__(*args, **kwargs)
                
            def do_GET(self):
                """Handle GET requests for data"""
                if self.path == '/data':
                    data = self.bridge.get_latest_data()
                    if data:
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps(data).encode())
                    else:
                        self.send_error(503, "No data available from Pico")
                        
                elif self.path == '/status':
                    status = {
                        "pico_connected": self.bridge.pico_connected,
                        "port": self.bridge.serial_port,
                        "timestamp": time.time()
                    }
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(status).encode())
                else:
                    self.send_error(404, "Not found")
                    
            def do_POST(self):
                """Handle POST requests for commands"""
                if self.path == '/command':
                    try:
                        content_length = int(self.headers['Content-Length'])
                        post_data = self.rfile.read(content_length)
                        command = json.loads(post_data.decode())
                        
                        # Add command to queue for Pico
                        self.bridge.add_command(command)
                        
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        response = {"status": "success", "message": "Command queued for Pico"}
                        self.wfile.write(json.dumps(response).encode())
                        
                    except Exception as e:
                        self.send_error(400, f"Bad request: {e}")
                else:
                    self.send_error(404, "Not found")
                    
            def do_OPTIONS(self):
                """Handle CORS preflight requests"""
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
                
            def log_message(self, format, *args):
                """Suppress HTTP request logging"""
                pass
        
        def handler(*args, **kwargs):
            return DataHandler(*args, bridge=self, **kwargs)
        
        try:
            with socketserver.TCPServer(("", self.http_port), handler) as httpd:
                print(f"🌐 HTTP server started on http://localhost:{self.http_port}")
                print("📡 Computer B can now connect to get real Pico data")
                httpd.serve_forever()
        except Exception as e:
            print(f"❌ HTTP server error: {e}")
    
    def start(self):
        """Start the data bridge"""
        print("🌉 Starting Pico Data Bridge...")
        print("=" * 60)
        
        # Connect to Pico
        if not self.connect_to_pico():
            print("❌ Failed to connect to Pico. Exiting.")
            return
        
        self.running = True
        
        # Start data reading thread
        data_thread = threading.Thread(target=self.read_pico_data)
        data_thread.daemon = True
        data_thread.start()
        
        # Start HTTP server (blocking)
        print("🚀 Bridge is running...")
        print("💡 Instructions:")
        print("   1. Make sure your Pico is running the modified Isabel script")
        print("   2. On Computer B, run: python server.py")
        print("   3. Connect to the web interface")
        print("   4. Press Ctrl+C to stop")
        print("=" * 60)
        
        try:
            self.start_http_server()
        except KeyboardInterrupt:
            print("\n🛑 Stopping bridge...")
            self.stop()
    
    def stop(self):
        """Stop the data bridge"""
        self.running = False
        if self.serial_connection:
            self.serial_connection.close()
        print("✅ Bridge stopped")

def main():
    """Main function"""
    print("🎛️  Wireless Control Project - Hardware Data Bridge")
    print("🔗 Connecting Raspberry Pi Pico to Web Interface")
    print("=" * 60)
    
    # Configuration
    port = 'AUTO'  # Auto-detect Pico port
    
    # Allow manual port specification
    if len(sys.argv) > 1:
        port = sys.argv[1]
        print(f"📌 Using specified port: {port}")
    else:
        print("🔍 Auto-detecting Pico port...")
    
    # Create and start bridge
    bridge = PicoDataBridge(port=port)
    bridge.start()

if __name__ == "__main__":
    main()