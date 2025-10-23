# 🎛️ Interactive PID Control System - Quick Start

## 🚀 **New Features Added:**
- **Setpoint Control** - Change desired position from HTML interface
- **Auto/Manual Modes** - Switch between automatic oscillation and manual control
- **Emergency Stop** - Safety override to halt system immediately
- **Real-time Bidirectional Communication** - Send commands to Python script

## 📋 **How to Run the Interactive System:**

### Step 1: Start the Python Simulator
```bash
cd "C:\Users\EmilyButera\Documents\GitHub\Eng401-ELT4-WirelessControlProject"
python computer_simulator.py
```
**You should see:**
```
🎛️ Wireless Control Project - Interactive Simulator
🌐 Command server started on http://localhost:9999
📡 Ready to receive commands from HTML interface
🟢 Interactive simulation running...
```

### Step 2: Start the Web Interface
**Open a NEW terminal window:**
```bash
cd "C:\Users\EmilyButera\Documents\GitHub\Eng401-ELT4-WirelessControlProject"
python server.py
```

### Step 3: Connect in Browser
1. **Browser opens automatically** to `http://localhost:8000/index.html`
2. **Click "🖥️ Connect to Local Computer"** (blue button)
3. **You should see "Connected to Local Computer" status**

### Step 4: Control the System! 
🎯 **Use the new control panel:**

- **Setpoint Slider** - Drag to change desired position (2-33 cm)
- **Number Input** - Type exact values  
- **Quick Presets** - Click buttons for common positions (5, 10, 15, 20, 25, 30 cm)
- **Send Setpoint** - Apply your changes to the Python script
- **Auto Mode Toggle** - Switch between auto oscillation and manual control
- **Emergency Stop** - Immediately halt system for safety

## 🎮 **Control Modes:**

### **Auto Mode (Default):**
- ✅ System oscillates between 5-25 cm automatically 
- 🔄 Good for demonstration and testing
- 🎛️ Setpoint controls are ignored in this mode

### **Manual Mode:**
- 🎯 System follows YOUR setpoint commands
- 📤 Use slider/input to set desired position
- 📊 Watch PID controller track your setpoint!

### **Emergency Stop:**
- 🛑 **Immediately stops all movement**
- 🔒 Disables all controls until reset
- ⚠️ **Use for safety if needed**

## 📊 **What You'll See:**

### **Python Console Output:**
```
 15.0,  14.8,  0.52 | AUTO   | 🔄 RUN
 16.2,  15.1,  0.51 | MANUAL | 🎯 RUN  
  5.0,   5.3,  0.54 | MANUAL | 🛑 STOP
```
- **Columns:** Desired Position, Current Position, Servo Command
- **Mode:** AUTO (oscillating) or MANUAL (your control)
- **Status:** 🔄 Auto, 🎯 Manual, 🛑 Emergency Stop

### **HTML Interface:**
- 📊 **Real-time data cards** showing all values
- 📈 **Live chart** of position tracking  
- 🎛️ **Interactive controls** for setpoint
- 📄 **Data log** of all commands and responses

## 🔧 **Example Usage:**

1. **Start in Auto Mode** - Watch system oscillate
2. **Switch to Manual** - Click "Auto Mode" button
3. **Set Setpoint to 10 cm** - Use slider or type "10"  
4. **Send Command** - Click "📤 Send Setpoint"
5. **Watch PID Controller** - System moves to 10 cm
6. **Try Different Values** - Use preset buttons
7. **Emergency Test** - Click "🛑 Emergency Stop" to halt

## 🛠️ **Troubleshooting:**

**"Connection Failed":**
- Make sure Python simulator is running first
- Check both terminals are in the correct directory

**"Controls Disabled":**
- Click "🖥️ Connect to Local Computer" first
- If in Emergency Stop, click "🔄 Reset System"

**"Demo Mode" instead of real connection:**
- Python simulator might not be running
- Demo mode still works for testing the interface

## 🎯 **System Architecture:**

```
Python Script                 HTML Interface
(Port 9999)                   (Port 8000)
    ↕️                           ↕️
📊 Sends data      ←──────→    📊 Displays data
📤 Receives commands ←──────→  🎛️ Sends commands
```

**Data Flow:**
- Python → HTML: Position data, PID values, system status  
- HTML → Python: Setpoint changes, mode switches, emergency stop

The system now provides **full interactive control** of the PID loop from the web interface! 🎉