# 🎛️ Real Hardware Setup Guide

## 🏗️ **System Architecture**

```
Raspberry Pi Pico  →  Computer A  →  Network  →  Computer B
(Sensors & Servo)     (Bridge)               (Web Interface)

📊 Sensor Data    USB Serial   HTTP API   Web Browser
🎯 Servo Control     ←─────      ←─────      ←─────
```

## 📋 **Required Components**

### **Hardware:**
- 🔧 **Raspberry Pi Pico** (running MicroPython)
- 📏 **Distance Sensor** (HC-SR04 or similar)
- 🎛️ **Servo Motor** 
- 📐 **Potentiometer** (for manual setpoint)
- 🔌 **USB Cable** (Pico to Computer A)

### **Software:**
- 🐍 **Python** (Computer A & B)
- 📦 **pyserial** library: `pip install pyserial`
- 🌐 **Web Browser** (Chrome/Edge recommended)

## 🚀 **Setup Instructions**

### **Step 1: Prepare the Pico (Hardware)**

1. **Flash MicroPython** to your Raspberry Pi Pico
2. **Upload the modified Isabel script** to the Pico
3. **Connect your sensors and servo** as per your existing wiring
4. **Connect Pico to Computer A** via USB

### **Step 2: Computer A (Data Bridge)**

**Computer A** reads sensor data from Pico and serves it to Computer B.

1. **Install Python dependencies:**
   ```bash
   pip install pyserial
   ```

2. **Run the hardware bridge:**
   ```bash
   python hardware_bridge.py
   ```
   *Note: The script will auto-detect the Pico's COM port*

3. **Manual port specification (if needed):**
   ```bash
   python hardware_bridge.py COM3  # Windows
   python hardware_bridge.py /dev/ttyACM0  # Linux
   ```

### **Step 3: Computer B (Web Interface)**

**Computer B** displays the web interface and controls the system.

1. **Get Computer A's IP address:**
   ```bash
   ipconfig  # Windows
   ifconfig  # Linux/Mac
   ```

2. **Start the web server:**
   ```bash
   python server.py
   ```

3. **Open browser and connect:**
   - Go to `http://localhost:8000/index.html`
   - Click "🖥️ Connect to Local Computer"

### **Step 4: Network Configuration (Different Computers)**

If Computer A and B are different machines:

1. **On Computer A:** Note your IP (e.g., 192.168.1.100)

2. **On Computer B:** Modify connection in browser console:
   ```javascript
   // Change localhost to Computer A's IP
   fetch('http://192.168.1.100:9999/data')
   ```

## 🔄 **Data Flow**

### **Pico → Computer A:**
```json
DATA:{"timestamp":123456,"desired_position":15.0,"current_position":14.8,"servo_command":0.52,"error":0.2,"P_output":0.012,"I_output":0.001,"D_output":0.003,"auto_mode":true,"emergency_stop":false}
```

### **Computer A → Computer B:**
- **GET /data** - Latest sensor readings
- **GET /status** - Pico connection status
- **POST /command** - Send setpoint/control commands

### **Computer B → Computer A → Pico:**
```json
{"type":"setpoint","value":20.0,"timestamp":1698123456}
{"type":"auto_mode","value":false,"timestamp":1698123456}
{"type":"emergency_stop","value":true,"timestamp":1698123456}
```

## 🛠️ **Troubleshooting**

### **Pico Connection Issues:**

1. **"Pico not found" error:**
   - Check USB connection
   - Verify Pico is in MicroPython mode
   - Try different USB port
   - Manually specify COM port

2. **"Serial connection error":**
   - Close other serial programs (Arduino IDE, etc.)
   - Check Windows Device Manager for correct port
   - Try unplugging and reconnecting Pico

### **Computer-to-Computer Issues:**

1. **"Connection refused" between computers:**
   - Check firewall settings
   - Ensure both computers on same network
   - Verify IP addresses are correct
   - Test with `ping` command

2. **"No data from Pico" in web interface:**
   - Verify Computer A shows "Pico connected"
   - Check that Isabel script is running on Pico
   - Look for data output in Computer A console

### **Web Interface Issues:**

1. **"Demo Mode" instead of real data:**
   - This is normal if no hardware detected
   - Check Computer A hardware bridge is running
   - Verify network connection between computers

## 📊 **Expected Console Output**

### **Computer A (hardware_bridge.py):**
```
🔍 Searching for Raspberry Pi Pico...
📱 Found Pico on COM3: USB Serial Device
🔌 Connecting to Pico on COM3...
✅ Successfully connected to Pico!
🌐 HTTP server started on http://localhost:9999
📊 Starting data collection from Pico...
📈 D: 15.0 C: 14.8 S: 0.52 E: 0.2
📤 Sent to Pico: {"type": "setpoint", "value": 20.0}
✅ Pico acknowledged: CMD_ACK:setpoint:20.0
```

### **Pico (Isabel script):**
```
DATA:{"timestamp":123456,"desired_position":20.0,"current_position":19.8,"servo_command":0.51,"error":0.2,"P_output":0.012,"I_output":0.001,"D_output":0.003,"auto_mode":false,"emergency_stop":false}
CMD_ACK:setpoint:20.0
```

## 🎯 **Success Indicators**

✅ **Hardware Connected:** Pico LED blinks, sensor readings in console  
✅ **Computer A Bridge:** "Connected to Pico" message, data streaming  
✅ **Computer B Interface:** "Connected to Pico Hardware" status  
✅ **Bidirectional Control:** Setpoint changes affect Pico servo  
✅ **Real-time Data:** Live charts updating with actual sensor data  

## 🔧 **Advanced Configuration**

### **Multiple Picos:**
```bash
python hardware_bridge.py COM3 --name "Cart1"
python hardware_bridge.py COM4 --name "Cart2" --port 9998
```

### **Remote Network Access:**
```bash
python hardware_bridge.py --host 0.0.0.0 --port 9999
# Allows connections from any computer on network
```

The system now provides **true hardware integration** with your Pico sensors and servo, while maintaining the beautiful web interface for remote monitoring and control! 🎉