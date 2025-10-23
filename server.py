#!/usr/bin/env python3
"""
Simple HTTP Server for Wireless Control Project
Serves the HTML interface on localhost to enable Web Bluetooth API
"""

import http.server
import socketserver
import webbrowser
import os
import sys

# Configuration
PORT = 8000
HOST = "localhost"

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow Bluetooth API
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def start_server():
    """Start the local HTTP server"""
    # Change to the directory containing the HTML files
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Create the server
    handler = CustomHTTPRequestHandler
    httpd = socketserver.TCPServer((HOST, PORT), handler)
    
    print("=" * 60)
    print("🚀 Wireless Control Project Server Starting...")
    print("=" * 60)
    print(f"📍 Server Address: http://{HOST}:{PORT}")
    print(f"📁 Serving files from: {script_dir}")
    print("=" * 60)
    print("🌐 Opening browser automatically...")
    print("🔗 Manual URL: http://localhost:8000/index.html")
    print("=" * 60)
    print("⚠️  IMPORTANT NOTES:")
    print("   • Web Bluetooth requires Chrome or Edge browser")
    print("   • Make sure your Bluetooth device is discoverable")
    print("   • Keep this terminal window open while using the app")
    print("=" * 60)
    print("🛑 To stop the server: Press Ctrl+C")
    print("=" * 60)
    
    # Open the browser automatically
    url = f"http://{HOST}:{PORT}/index.html"
    try:
        webbrowser.open(url)
        print("✅ Browser opened successfully!")
    except Exception as e:
        print(f"❌ Could not open browser automatically: {e}")
        print(f"📝 Please manually open: {url}")
    
    print("\n🟢 Server is running... Waiting for connections...")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
        httpd.shutdown()
        httpd.server_close()
        print("✅ Server closed successfully")

if __name__ == "__main__":
    try:
        start_server()
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Port {PORT} is already in use!")
            print("💡 Try one of these solutions:")
            print(f"   1. Use a different port: python server.py --port 8001")
            print(f"   2. Stop the existing server on port {PORT}")
            print(f"   3. Open http://localhost:{PORT}/index.html in your browser")
        else:
            print(f"❌ Server error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)