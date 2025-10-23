# Wireless Control Project - Server Setup

## 🚀 Quick Start Guide

The DNS_PROBE_FINISHED_NXDOMAIN error occurs because the Web Bluetooth API requires the HTML file to be served through a web server (localhost or HTTPS), not opened directly as a file.

### Option 1: Use the Automated Server (Recommended)

**For Windows:**
1. Double-click `start_server.bat`
2. The browser will automatically open to `http://localhost:8000/index.html`
3. Keep the terminal window open while using the app

**For Manual Start:**
```bash
python server.py
```

### Option 2: Alternative Server Methods

**Using Python (if you have it installed):**
```bash
# Python 3
python -m http.server 8000

# Then open: http://localhost:8000/index.html
```

**Using Node.js (if you have it installed):**
```bash
# Install a simple server
npm install -g http-server

# Run the server
http-server -p 8000

# Then open: http://localhost:8000/index.html
```

**Using VS Code Live Server Extension:**
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Option 3: Direct File Access (Limited functionality)

If you must open the file directly:
1. Open Chrome or Edge
2. Go to `chrome://flags/` or `edge://flags/`
3. Search for "Insecure origins treated as secure"
4. Add `file://` to the list
5. Restart browser
6. Open the HTML file directly

**Note:** This method may have limited Bluetooth functionality.

## 🔧 Troubleshooting

### Common Issues:

1. **Port 8000 already in use:**
   - Try a different port: `python server.py --port 8001`
   - Or kill the existing process

2. **Python not found:**
   - Install Python from https://python.org
   - Make sure Python is added to PATH

3. **Browser doesn't support Web Bluetooth:**
   - Use Chrome or Edge (latest versions)
   - Safari and Firefox don't support Web Bluetooth

4. **Bluetooth device not found:**
   - Make sure your device is in pairing mode
   - Check if your device uses the correct Bluetooth service UUID
   - Try the "Connect via Serial" option for USB connections

## 📱 Browser Compatibility

| Browser | Web Bluetooth | Web Serial | Recommended |
|---------|---------------|------------|-------------|
| Chrome  | ✅ Yes        | ✅ Yes     | ✅ Best     |
| Edge    | ✅ Yes        | ✅ Yes     | ✅ Good     |
| Firefox | ❌ No         | ❌ No      | ❌ No       |
| Safari  | ❌ No         | ❌ No      | ❌ No       |

## 🔐 Security Notes

- The server only runs locally on your machine
- No external network access is required
- All data stays on your local network
- The server automatically opens the correct URL

## 📞 Need Help?

If you're still having issues:
1. Make sure you're using Chrome or Edge browser
2. Check that your device is broadcasting Bluetooth data
3. Verify the Bluetooth service UUID matches your device
4. Try the USB Serial connection as an alternative