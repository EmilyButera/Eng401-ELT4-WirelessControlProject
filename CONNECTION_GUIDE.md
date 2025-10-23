# 🔗 Connection Setup Guide

## 📋 **Quick Setup Options**

### Option 1: Same Computer (Easiest)
**Both Python script and HTML interface on the same computer**

1. **Start the Python Simulator:**
   ```bash
   python computer_simulator.py
   ```

2. **Start the Web Server (in another terminal):**
   ```bash
   python server.py
   ```

3. **Open Browser:**
   - Go to `http://localhost:8000/index.html`
   - Click "🖥️ Connect to Local Computer"

---

### Option 2: Different Computers (Network)
**Python script on Computer A, HTML interface on Computer B**

**Computer A (Data Source):**
```bash
python computer_simulator.py
```

**Computer B (Display):**
```bash
python server.py
```
- Open `http://localhost:8000/index.html`
- Click "🖥️ Connect to Local Computer"
- Modify connection to point to Computer A's IP

---

### Option 3: Microcontroller (Original Setup)
**If using Raspberry Pi Pico/ESP32 with the original Isabel script**

1. **Upload the modified Isabel script to your microcontroller**
2. **On any computer:**
   ```bash
   python server.py
   ```
3. **Open browser and click "📶 Connect to Device"**
4. **Select your Bluetooth device from the list**

---

## 🖥️ **Computer-to-Computer Architecture**

```
┌─────────────────┐    Network/Socket    ┌─────────────────┐
│   Computer A    │◄─────────────────────►│   Computer B    │
│                 │                       │                 │
│ Python Script   │    JSON Data Stream   │ HTML Interface  │
│ (Data Source)   │                       │ (Display)       │
│                 │                       │                 │
│ Port: 9999      │                       │ Port: 8000      │
└─────────────────┘                       └─────────────────┘
```

## 🔧 **Connection Methods Supported**

| Method | Use Case | Complexity | Reliability |
|--------|----------|------------|-------------|
| **Local Socket** | Same computer | ⭐ Easy | ⭐⭐⭐ High |
| **Network Socket** | Different computers | ⭐⭐ Medium | ⭐⭐ Good |
| **Web Bluetooth** | Microcontroller | ⭐⭐⭐ Hard | ⭐ Variable |
| **Demo Mode** | Testing/Demo | ⭐ Easy | ⭐⭐⭐ Perfect |

## 🚀 **Step-by-Step Instructions**

### For Same Computer Setup:

1. **Open Terminal 1:**
   ```bash
   cd "C:\Users\EmilyButera\Documents\GitHub\Eng401-ELT4-WirelessControlProject"
   python computer_simulator.py
   ```

2. **Open Terminal 2:**
   ```bash
   cd "C:\Users\EmilyButera\Documents\GitHub\Eng401-ELT4-WirelessControlProject"
   python server.py
   ```

3. **Your browser will automatically open to the interface**

4. **Click "🖥️ Connect to Local Computer"**

### For Different Computers:

1. **On Computer A (find its IP address):**
   ```bash
   ipconfig  # Windows
   # Note the IP address (e.g., 192.168.1.100)
   ```

2. **Start the Python simulator on Computer A:**
   ```bash
   python computer_simulator.py
   ```

3. **On Computer B, modify the connection IP in the browser console:**
   ```javascript
   // In browser developer console, change the connection URL:
   fetch('http://192.168.1.100:9999/data')
   ```

## 🛠️ **Troubleshooting**

### Common Issues:

1. **"Connection refused" error:**
   - Make sure the Python simulator is running first
   - Check that port 9999 is not blocked by firewall

2. **"Demo Mode" instead of real connection:**
   - This is normal if no Python script is running
   - The interface will show simulated data for testing

3. **Cross-computer connection fails:**
   - Check firewall settings on both computers
   - Ensure both computers are on the same network
   - Use the computer's actual IP address, not localhost

### Port Information:
- **Python Data Server:** Port 9999
- **HTML Web Server:** Port 8000
- **Make sure both ports are available**

## 📊 **What You'll See**

Once connected, the interface displays:
- 📊 Real-time position data
- 🎯 PID control values  
- 📈 Live charts
- 📄 Data logging
- 🔄 Connection status

The Python script outputs the same data to console as before, plus serves it over the network for the HTML interface to display.