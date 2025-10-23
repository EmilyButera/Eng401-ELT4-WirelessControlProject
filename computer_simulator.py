"""
Computer-Based Data Simulator for Wireless Control Project
This script simulates the PID control system data for testing the HTML interface
when running on a regular computer instead of a microcontroller.
"""

import time
import json
import math
import random
from datetime import datetime
import socket
import threading
import http.server
import socketserver
import urllib.parse

class PIDControlSimulator:
    def __init__(self):
        # PID Constants (same as original)
        self.Kp = 0.06
        self.Ki = 0.0558139535
        self.Kd = 0.016125
        
        # System state
        self.servo_base_position = 0.54
        self.lastError = 0
        self.errorSum = 0
        self.lastTime = time.time()
        
        # Simulation parameters
        self.desired_position = 15.0  # cm
        self.current_position = 10.0  # cm
        self.servo_command = self.servo_base_position
        
        # Control state
        self.auto_mode = True
        self.emergency_stop = False
        self.manual_setpoint = 15.0
        
        # Communication
        self.websocket_port = 8765
        self.clients = []
        self.command_queue = []
        self.command_lock = threading.Lock()
        
    def simulate_sensor_data(self):
        """Simulate realistic sensor readings"""
        # Process any pending commands
        self.process_commands()
        
        # Determine desired position based on mode
        if self.emergency_stop:
            # In emergency stop, servo should return to neutral
            self.servo_command = self.servo_base_position
            return
        elif self.auto_mode:
            # Auto mode: oscillating setpoint for demonstration
            time_factor = time.time() * 0.1
            self.desired_position = 15 + 10 * math.sin(time_factor)  # Oscillating between 5-25 cm
        else:
            # Manual mode: use setpoint from HTML interface
            self.desired_position = self.manual_setpoint
        
        # Add some noise to simulate real sensor readings
        noise = random.uniform(-0.5, 0.5)
        
        # Simulate cart movement based on servo command (only if not in emergency stop)
        if not self.emergency_stop:
            servo_effect = (self.servo_command - self.servo_base_position) * 20
            self.current_position += servo_effect * 0.1 + noise
        
        # Keep within realistic bounds
        self.current_position = max(2, min(33, self.current_position))
        
    def calculate_pid(self):
        """Calculate PID control output"""
        now = time.time()
        timeChange = now - self.lastTime
        
        if timeChange <= 0:
            return
            
        # Calculate error
        error = self.desired_position - self.current_position
        
        # PID calculations (only if not in emergency stop)
        if not self.emergency_stop:
            P_output = self.Kp * error
            
            self.errorSum += error * timeChange
            I_output = self.Ki * self.errorSum
            
            D_output = self.Kd * (error - self.lastError) / timeChange if timeChange > 0 else 0
            
            # Calculate servo correction
            servo_correction = P_output + I_output + D_output
            self.servo_command = self.servo_base_position - servo_correction
            
            # Limit servo command
            self.servo_command = max(0.18, min(0.90, self.servo_command))
        else:
            # Emergency stop - freeze PID and return servo to neutral
            P_output = 0
            I_output = 0
            D_output = 0
            self.servo_command = self.servo_base_position
        
        # Update for next iteration
        self.lastError = error
        self.lastTime = now
        
        return {
            "timestamp": int(time.time() * 1000000),  # microseconds
            "desired_position": round(self.desired_position, 1),
            "current_position": round(self.current_position, 1),
            "servo_command": round(self.servo_command, 2),
            "error": round(error, 2),
            "P_output": round(P_output, 3),
            "I_output": round(I_output, 3),
            "D_output": round(D_output, 3),
            "auto_mode": self.auto_mode,
            "emergency_stop": self.emergency_stop
        }
    
    def add_command(self, command):
        """Add a command to the queue for processing"""
        with self.command_lock:
            self.command_queue.append(command)
            
    def process_commands(self):
        """Process any pending commands from the HTML interface"""
        with self.command_lock:
            while self.command_queue:
                command = self.command_queue.pop(0)
                self.execute_command(command)
                
    def execute_command(self, command):
        """Execute a command from the HTML interface"""
        cmd_type = command.get('type')
        value = command.get('value')
        
        if cmd_type == 'setpoint':
            self.manual_setpoint = float(value)
            print(f"📍 Setpoint updated to: {self.manual_setpoint:.1f} cm")
            
        elif cmd_type == 'auto_mode':
            self.auto_mode = bool(value)
            print(f"🔄 Auto mode: {'ON' if self.auto_mode else 'OFF'}")
            
        elif cmd_type == 'emergency_stop':
            self.emergency_stop = bool(value)
            if self.emergency_stop:
                print("🛑 EMERGENCY STOP ACTIVATED - System halted for safety")
                # Reset integral term to prevent windup
                self.errorSum = 0
            else:
                print("✅ Emergency stop reset - System operational")
                
        else:
            print(f"❓ Unknown command type: {cmd_type}")

class CommandServer:
    """HTTP server to handle commands from HTML interface"""
    
    def __init__(self, simulator, port=9999):
        self.simulator = simulator
        self.port = port
        
    def start_server(self):
        """Start the HTTP command server"""
        
        class CommandHandler(http.server.BaseHTTPRequestHandler):
            def __init__(self, *args, simulator=None, **kwargs):
                self.simulator = simulator
                super().__init__(*args, **kwargs)
                
            def do_GET(self):
                """Handle GET requests for data polling"""
                if self.path == '/data':
                    # Return current system data
                    data = self.simulator.calculate_pid()
                    if data:
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps(data).encode())
                    else:
                        self.send_error(503, "No data available")
                else:
                    self.send_error(404, "Not found")
                    
            def do_POST(self):
                """Handle POST requests for commands"""
                if self.path == '/command':
                    try:
                        content_length = int(self.headers['Content-Length'])
                        post_data = self.rfile.read(content_length)
                        command = json.loads(post_data.decode())
                        
                        # Add command to simulator queue
                        self.simulator.add_command(command)
                        
                        # Send success response
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        response = {"status": "success", "message": "Command received"}
                        self.wfile.write(json.dumps(response).encode())
                        
                    except Exception as e:
                        self.send_error(400, f"Bad request: {e}")
                else:
                    self.send_error(404, "Not found")
                    
            def do_OPTIONS(self):
                """Handle preflight CORS requests"""
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
                
            def log_message(self, format, *args):
                """Suppress default logging"""
                pass
        
        # Create handler with simulator reference
        def handler(*args, **kwargs):
            return CommandHandler(*args, simulator=self.simulator, **kwargs)
        
        try:
            with socketserver.TCPServer(("", self.port), handler) as httpd:
                print(f"🌐 Command server started on http://localhost:{self.port}")
                print("📡 Ready to receive commands from HTML interface")
                httpd.serve_forever()
        except Exception as e:
            print(f"❌ Command server error: {e}")

class BluetoothServer:
    """Simulate Bluetooth communication using socket server"""
    
    def __init__(self, simulator, host='localhost', port=9999):
        self.simulator = simulator
        self.host = host
        self.port = port
        self.server_socket = None
        self.clients = []
        self.running = False
        
    def start_server(self):
        """Start the Bluetooth simulation server"""
        try:
            self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_socket.bind((self.host, self.port))
            self.server_socket.listen(5)
            self.running = True
            
            print(f"🔵 Bluetooth Simulator Server started on {self.host}:{self.port}")
            print("📱 Waiting for HTML interface connections...")
            
            while self.running:
                try:
                    client_socket, address = self.server_socket.accept()
                    self.clients.append(client_socket)
                    print(f"📲 Client connected from {address}")
                    
                    # Start a thread to handle this client
                    client_thread = threading.Thread(
                        target=self.handle_client, 
                        args=(client_socket,)
                    )
                    client_thread.daemon = True
                    client_thread.start()
                    
                except Exception as e:
                    if self.running:
                        print(f"❌ Accept error: {e}")
                        
        except Exception as e:
            print(f"❌ Server start error: {e}")
            
    def handle_client(self, client_socket):
        """Handle individual client connections"""
        try:
            while self.running:
                # Get data from simulator
                data = self.simulator.calculate_pid()
                if data:
                    json_data = json.dumps(data) + "\n"
                    client_socket.send(json_data.encode())
                    
                time.sleep(0.03)  # 30ms delay same as original
                
        except Exception as e:
            print(f"📱 Client disconnected: {e}")
        finally:
            if client_socket in self.clients:
                self.clients.remove(client_socket)
            client_socket.close()
            
    def broadcast_data(self, data):
        """Send data to all connected clients"""
        json_data = json.dumps(data) + "\n"
        disconnected_clients = []
        
        for client in self.clients:
            try:
                client.send(json_data.encode())
            except:
                disconnected_clients.append(client)
                
        # Remove disconnected clients
        for client in disconnected_clients:
            self.clients.remove(client)
            client.close()
            
    def stop_server(self):
        """Stop the server"""
        self.running = False
        if self.server_socket:
            self.server_socket.close()

def main():
    """Main execution function"""
    print("🎛️  Wireless Control Project - Interactive Simulator")
    print("=" * 60)
    print("📊 Starting PID Control System with Remote Control...")
    
    # Create simulator
    simulator = PIDControlSimulator()
    
    # Create command server for bidirectional communication
    command_server = CommandServer(simulator)
    
    try:
        # Start command server in a separate thread
        server_thread = threading.Thread(target=command_server.start_server)
        server_thread.daemon = True
        server_thread.start()
        
        print("🟢 Interactive simulation running...")
        print("💡 Instructions:")
        print("   1. This script is now running the PID simulation")
        print("   2. Open the HTML interface: python server.py")
        print("   3. Click '🖥️ Connect to Local Computer' in the browser")
        print("   4. Use the setpoint controls to change desired position")
        print("   5. Press Ctrl+C to stop")
        print("=" * 60)
        print("📊 Data: Desired, Current, Servo | 🎛️ Mode | 🛑 Status")
        print("-" * 60)
        
        # Main simulation loop
        while True:
            # Update simulation
            simulator.simulate_sensor_data()
            
            # Get current data
            data = simulator.calculate_pid()
            if data:
                # Enhanced console output with status
                mode_str = "AUTO" if simulator.auto_mode else "MANUAL"
                stop_str = "STOP" if simulator.emergency_stop else "RUN"
                status_emoji = "🛑" if simulator.emergency_stop else ("🔄" if simulator.auto_mode else "🎯")
                
                print(f"{data['desired_position']:5.1f}, {data['current_position']:5.1f}, {data['servo_command']:5.2f} | {mode_str:6} | {status_emoji} {stop_str}")
            
            time.sleep(0.03)  # 30ms delay
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping simulation...")
        print("✅ Simulation stopped")

if __name__ == "__main__":
    main()