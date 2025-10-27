# Two-Computer Pico Data Monitoring System

## System Architecture
- **Computer A**: Connected to Raspberry Pi Pico via USB, runs Python bridge
- **Computer B**: Runs web interface, connects to Computer A over network
- **Data Flow**: Pico → USB → Computer A → Network → Computer B → Web Display

## Setup Instructions

### Computer A Setup (Data Collection)

1. **Connect Hardware**
   - Connect Raspberry Pi Pico to Computer A via USB cable
   - Make sure the Pico is running the Isabel script
   - Verify sensors (distance sensor, potentiometer) and servo are connected

2. **Install Python Dependencies**
   ```bash
   pip install pyserial
   ```

3. **Run the Hardware Bridge**
   ```bash
   python hardware_bridge.py
   ```

4. **Note Computer A's IP Address**
   - The bridge will display: "Access from Computer B: http://[Computer-A-IP]:9999/data"
   - Find your IP with: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Example IP: `192.168.1.100`

### Computer B Setup (Web Interface)

1. **Update Configuration**
   - Open `index.js` in a text editor
   - Find line with `const COMPUTER_A_IP = '192.168.1.100';`
   - Replace `192.168.1.100` with Computer A's actual IP address

2. **Open Web Interface**
   - Open `index.html` in a web browser
   - Click "🌐 Connect to Computer A"
   - You should see real-time data from the Pico

## Troubleshooting

### Computer A Issues
- **Port not found**: Try different USB ports, check cable
- **No data**: Verify Isabel script is running on Pico
- **Server error**: Check port 9999 isn't being used by another program

### Computer B Issues
- **Cannot connect**: Verify Computer A IP address in index.js
- **Network error**: Ensure both computers are on same network
- **No data**: Check that Computer A bridge is running

### Network Issues
- **Firewall**: Make sure port 9999 is allowed through firewall
- **Different networks**: Both computers must be on same WiFi/network
- **Router restrictions**: Some routers block computer-to-computer communication

## Testing the Connection

### On Computer A:
1. Bridge should show: "✅ Pico connection verified"
2. Bridge should show: "🌐 Network server started on port 9999"

### On Computer B:
1. Browser should connect successfully
2. Real-time charts should update
3. Data log should display sensor readings

## Data Format
The system transmits JSON data containing:
```json
{
  "timestamp": 1234567890,
  "desired_position": 50.5,
  "current_position": 48.2,
  "servo_command": 1520,
  "error": 2.3,
  "p_output": 11.5,
  "i_output": 2.1,
  "d_output": 0.8
}
```

## IP Address Examples
- Home WiFi: `192.168.1.xxx` or `192.168.0.xxx`
- Office: `10.0.0.xxx` or `172.16.xxx.xxx`
- Hotspot: Varies by device

## Security Note
This system uses unencrypted HTTP for simplicity. Both computers should be on a trusted network.