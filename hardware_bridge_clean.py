"""
Hardware Data Bridge - Computer A to Computer B Communication
This script runs on Computer A, reads real sensor data from the Pico via USB serial,
and serves it to Computer B over the network for the HTML interface.
"""

import serial
import json
import time
import threading
import sys
from datetime import datetime
import http.server
import socketserver

class PicoDataBridge:
    def __init__(self, port='COM3', baudrate=115200):
        self.serial_port = port
        self.baudrate = baudrate
        self.serial_connection = None
        self.latest_data = None
        self.running = False
        
        # Connection state
        self.pico_connected = False
        self.data_lock = threading.Lock()
        
    def find_pico_port(self):
        """Automatically find the Pico's serial port"""
        try:
            import serial.tools.list_ports
            
            # Look for common Pico identifiers
            pico_keywords = ['Pico', 'MicroPython', 'USB Serial', 'CH340', 'CP210']
            
            ports = list(serial.tools.list_ports.comports())
            print(f"🔍 Scanning {len(ports)} available ports...")
            
            for port in ports:
                port_info = f"{port.device} - {port.description}"
                print(f"   📍 {port_info}")
                
                # Check if this looks like a Pico
                if any(keyword.lower() in port.description.lower() for keyword in pico_keywords):
                    print(f"✅ Found potential Pico at {port.device}")
                    if self.test_port_connection(port.device):
                        return port.device
            
            # If no obvious Pico found, try all ports
            print("🔄 Testing all available ports...")
            for port in ports:
                if self.test_port_connection(port.device):
                    return port.device
                    
            return None
            
        except ImportError:
            print("⚠️ pyserial not fully installed, using default port")
            return self.serial_port
        except Exception as e:
            print(f"❌ Port scanning error: {e}")
            return self.serial_port
    
    def test_port_connection(self, port):
        """Test if a port has Pico data"""
        try:
            with serial.Serial(port, self.baudrate, timeout=1) as test_conn:
                # Try to read a few lines
                for _ in range(3):
                    line = test_conn.readline().decode().strip()
                    if line and ('{' in line or 'desired_position' in line):
                        print(f"✅ Found Pico data on {port}")
                        return True
                return False
        except:
            return False
    
    def connect_to_pico(self):
        """Connect to the Pico via USB serial"""
        try:
            # Try to find Pico automatically
            detected_port = self.find_pico_port()
            if detected_port:
                self.serial_port = detected_port
            
            print(f"🔌 Connecting to Pico on {self.serial_port}...")
            self.serial_connection = serial.Serial(
                self.serial_port, 
                self.baudrate, 
                timeout=1
            )
            
            # Test the connection
            print("🧪 Testing Pico connection...")
            test_attempts = 0
            while test_attempts < 5:
                try:
                    line = self.serial_connection.readline().decode().strip()
                    if line and '{' in line:
                        print("✅ Pico connection verified - receiving JSON data")
                        self.pico_connected = True
                        return True
                    test_attempts += 1
                    time.sleep(0.5)
                except:
                    test_attempts += 1
            
            print("⚠️ Connected to port but no valid data received")
            print("💡 Make sure the Isabel script is running on your Pico")
            return True  # Keep connection open in case data starts flowing
            
        except serial.SerialException as e:
            print(f"❌ Serial connection failed: {e}")
            print("💡 Check that:")
            print("   1. Pico is connected via USB")
            print("   2. Correct COM port (Windows) or device (Mac/Linux)")
            print("   3. No other programs are using the serial port")
            return False
        except Exception as e:
            print(f"❌ Unexpected connection error: {e}")
            return False
    
    def read_pico_data(self):
        """Read data from Pico in a background thread"""
        consecutive_errors = 0
        max_errors = 10
        
        while self.running:
            try:
                if self.serial_connection and self.serial_connection.is_open:
                    line = self.serial_connection.readline().decode().strip()
                    
                    if line:
                        try:
                            # Parse JSON data from Pico
                            data = json.loads(line)
                            
                            # Validate data structure
                            required_fields = ['timestamp', 'desired_position', 'current_position', 'servo_command']
                            if all(field in data for field in required_fields):
                                with self.data_lock:
                                    self.latest_data = data
                                    self.pico_connected = True
                                consecutive_errors = 0
                            else:
                                print(f"⚠️ Invalid data structure: {line}")
                                
                        except json.JSONDecodeError:
                            # Not JSON - might be debug output from Pico
                            if len(line) < 100:  # Avoid spam
                                print(f"📝 Pico debug: {line}")
                    else:
                        # No data received
                        time.sleep(0.01)
                        
                else:
                    print("❌ Serial connection lost")
                    self.pico_connected = False
                    break
                    
            except Exception as e:
                consecutive_errors += 1
                if consecutive_errors >= max_errors:
                    print(f"❌ Too many consecutive errors ({consecutive_errors}), stopping data reader")
                    self.pico_connected = False
                    break
                else:
                    print(f"⚠️ Data read error: {e}")
                    time.sleep(0.1)
    
    def get_latest_data(self):
        """Get the latest data from Pico"""
        with self.data_lock:
            return self.latest_data.copy() if self.latest_data else None
    
    def start_network_server(self):
        """Start network server for Computer B communication"""
        
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
                    
            def do_OPTIONS(self):
                """Handle CORS preflight requests"""
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
                
            def log_message(self, format, *args):
                """Suppress HTTP request logging"""
                pass
        
        def handler(*args, **kwargs):
            return DataHandler(*args, bridge=self, **kwargs)
        
        try:
            port = 9999
            with socketserver.TCPServer(("", port), handler) as httpd:
                print(f"🌐 Network server started on port {port}")
                print("📡 Computer B can connect via HTTP API")
                print("⚠️  Read-only mode - no control commands accepted")
                print("💻 Access from Computer B: http://[Computer-A-IP]:9999/data")
                httpd.serve_forever()
        except Exception as e:
            print(f"❌ Network server error: {e}")
    
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
        
        # Start network server (blocking)
        print("🚀 Pico-to-Network bridge is running...")
        print("💡 Instructions:")
        print("   1. Make sure your Pico is running the Isabel script")
        print("   2. Control your system using the physical potentiometer on the Pico")
        print("   3. Find Computer A's IP address on your network")
        print("   4. On Computer B, update the IP in index.js and open index.html")
        print("   5. Click 'Connect to Computer A' to view real-time data")
        print("   6. Press Ctrl+C to stop")
        print("=" * 60)
        
        try:
            self.start_network_server()
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
    """Main entry point"""
    bridge = PicoDataBridge()
    
    try:
        bridge.start()
    except KeyboardInterrupt:
        print("\n🛑 Bridge interrupted by user")
        bridge.stop()
    except Exception as e:
        print(f"❌ Bridge error: {e}")
        bridge.stop()

if __name__ == "__main__":
    main()