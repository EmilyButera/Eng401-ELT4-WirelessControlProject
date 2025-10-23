class BluetoothDataMonitor {
    constructor() {
        this.device = null;
        this.characteristic = null;
        this.isConnected = false;
        this.chart = null;
        this.dataBuffer = [];
        this.maxDataPoints = 50;
        
        this.initializeElements();
        this.initializeChart();
        this.bindEvents();
    }
    
    initializeElements() {
        this.connectBtn = document.getElementById('connectBtn');
        this.connectLocalBtn = document.getElementById('connectLocalBtn');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.desiredPosition = document.getElementById('desiredPosition');
        this.currentPosition = document.getElementById('currentPosition');
        this.servoCommand = document.getElementById('servoCommand');
        this.error = document.getElementById('error');
        this.pOutput = document.getElementById('pOutput');
        this.iOutput = document.getElementById('iOutput');
        this.dOutput = document.getElementById('dOutput');
        this.dataLog = document.getElementById('dataLog');
        this.clearLogBtn = document.getElementById('clearLog');
        
        // Setpoint control elements
        this.setpointSlider = document.getElementById('setpointSlider');
        this.setpointInput = document.getElementById('setpointInput');
        this.currentSetpoint = document.getElementById('currentSetpoint');
        this.sendSetpointBtn = document.getElementById('sendSetpoint');
        this.autoModeBtn = document.getElementById('autoMode');
        this.emergencyStopBtn = document.getElementById('emergencyStop');
        this.presetBtns = document.querySelectorAll('.preset-btn');
        this.controlPanel = document.querySelector('.control-panel');
        
        // Control state
        this.autoMode = true;
        this.emergencyStop = false;
        this.currentSetpointValue = 15.0;
    }
    
    initializeChart() {
        const ctx = document.getElementById('positionChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Desired Position',
                        data: [],
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderWidth: 2,
                        fill: false
                    },
                    {
                        label: 'Current Position',
                        data: [],
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        borderWidth: 2,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Position (cm)'
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                animation: {
                    duration: 0
                }
            }
        });
    }
    
    bindEvents() {
        this.connectBtn.addEventListener('click', () => this.toggleConnection());
        this.connectLocalBtn.addEventListener('click', () => this.toggleLocalConnection());
        this.clearLogBtn.addEventListener('click', () => this.clearLog());
        
        // Setpoint control events
        this.setpointSlider.addEventListener('input', (e) => this.updateSetpoint(parseFloat(e.target.value)));
        this.setpointInput.addEventListener('input', (e) => this.updateSetpoint(parseFloat(e.target.value)));
        this.sendSetpointBtn.addEventListener('click', () => this.sendSetpointCommand());
        this.autoModeBtn.addEventListener('click', () => this.toggleAutoMode());
        this.emergencyStopBtn.addEventListener('click', () => this.triggerEmergencyStop());
        
        // Preset button events
        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = parseFloat(e.target.dataset.value);
                this.updateSetpoint(value);
                this.sendSetpointCommand();
                this.highlightPreset(value);
            });
        });
        
        // Initialize control panel state
        this.updateControlPanelState();
    }
    
    async toggleConnection() {
        if (this.isConnected) {
            await this.disconnect();
        } else {
            await this.connect();
        }
    }
    
    async connect() {
        try {
            this.updateConnectionStatus('connecting', 'Connecting...');
            this.connectBtn.disabled = true;
            
            // Check if Web Bluetooth is supported
            if (!navigator.bluetooth) {
                throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome or Edge.');
            }
            
            // Request Bluetooth device
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e'] }, // Nordic UART Service
                    { namePrefix: 'ESP32' },
                    { namePrefix: 'Arduino' },
                    { namePrefix: 'Pico' }
                ],
                optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']
            });
            
            // Connect to GATT server
            const server = await this.device.gatt.connect();
            
            // Get the service
            const service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
            
            // Get the characteristic for receiving data
            this.characteristic = await service.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
            
            // Start notifications
            await this.characteristic.startNotifications();
            this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
                this.handleData(event.target.value);
            });
            
            // Handle disconnection
            this.device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnection();
            });
            
            this.isConnected = true;
            this.updateConnectionStatus('connected', 'Connected');
            this.connectBtn.textContent = '🔌 Disconnect';
            this.connectBtn.disabled = false;
            
            this.addLogEntry('Connected to device successfully');
            
        } catch (error) {
            console.error('Connection failed:', error);
            this.updateConnectionStatus('disconnected', 'Connection Failed');
            this.connectBtn.disabled = false;
            this.addLogEntry(`Connection failed: ${error.message}`);
            
            // Show user-friendly error messages
            if (error.message.includes('User cancelled')) {
                alert('Connection cancelled by user');
            } else if (error.message.includes('Web Bluetooth')) {
                alert('This browser doesn\'t support Web Bluetooth. Please use Chrome or Edge.');
            } else {
                alert(`Failed to connect: ${error.message}`);
            }
        }
    }
    
    async disconnect() {
        try {
            if (this.device && this.device.gatt.connected) {
                await this.device.gatt.disconnect();
            }
            this.handleDisconnection();
        } catch (error) {
            console.error('Disconnection error:', error);
            this.handleDisconnection();
        }
    }
    
    handleDisconnection() {
        this.isConnected = false;
        this.device = null;
        this.characteristic = null;
        this.updateConnectionStatus('disconnected', 'Disconnected');
        this.connectBtn.textContent = '📶 Connect to Device';
        this.connectBtn.disabled = false;
        this.addLogEntry('Device disconnected');
    }
    
    handleData(value) {
        try {
            // Convert ArrayBuffer to string
            const decoder = new TextDecoder();
            const dataString = decoder.decode(value);
            
            // Parse JSON data
            const data = JSON.parse(dataString);
            
            // Update UI with new data
            this.updateDataDisplay(data);
            this.updateChart(data);
            this.addLogEntry(`Data: D:${data.desired_position} C:${data.current_position} S:${data.servo_command}`);
            
        } catch (error) {
            console.error('Data parsing error:', error);
            this.addLogEntry(`Data error: ${error.message}`);
        }
    }
    
    updateDataDisplay(data) {
        // Update main data cards with animation
        this.updateValueWithAnimation(this.desiredPosition, data.desired_position.toFixed(1));
        this.updateValueWithAnimation(this.currentPosition, data.current_position.toFixed(1));
        this.updateValueWithAnimation(this.servoCommand, (data.servo_command * 100).toFixed(1));
        this.updateValueWithAnimation(this.error, data.error.toFixed(2));
        
        // Update PID outputs
        this.pOutput.textContent = data.P_output.toFixed(3);
        this.iOutput.textContent = data.I_output.toFixed(3);
        this.dOutput.textContent = data.D_output.toFixed(3);
    }
    
    updateValueWithAnimation(element, value) {
        element.textContent = value;
        element.classList.add('value-update');
        setTimeout(() => {
            element.classList.remove('value-update');
        }, 500);
    }
    
    updateChart(data) {
        const currentTime = new Date().toLocaleTimeString();
        
        // Add new data point
        this.chart.data.labels.push(currentTime);
        this.chart.data.datasets[0].data.push(data.desired_position);
        this.chart.data.datasets[1].data.push(data.current_position);
        
        // Remove old data points if we have too many
        if (this.chart.data.labels.length > this.maxDataPoints) {
            this.chart.data.labels.shift();
            this.chart.data.datasets[0].data.shift();
            this.chart.data.datasets[1].data.shift();
        }
        
        // Update chart
        this.chart.update('none'); // No animation for real-time updates
    }
    
    updateConnectionStatus(statusClass, statusText) {
        this.connectionStatus.className = `status ${statusClass}`;
        this.connectionStatus.textContent = statusText;
    }
    
    addLogEntry(message) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `${timestamp}: ${message}`;
        
        this.dataLog.appendChild(entry);
        this.dataLog.scrollTop = this.dataLog.scrollHeight;
        
        // Limit log entries to prevent memory issues
        const entries = this.dataLog.children;
        if (entries.length > 100) {
            this.dataLog.removeChild(entries[0]);
        }
    }
    
    clearLog() {
        this.dataLog.innerHTML = '';
        this.addLogEntry('Log cleared');
    }
    
    async toggleLocalConnection() {
        if (this.isConnected) {
            await this.disconnectLocal();
        } else {
            await this.connectToLocalComputer();
        }
    }
    
    async disconnectLocal() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        if (this.mockInterval) {
            clearInterval(this.mockInterval);
        }
        
        this.isConnected = false;
        this.updateConnectionStatus('disconnected', 'Disconnected');
        this.connectLocalBtn.textContent = '🖥️ Connect to Local Computer';
        this.connectLocalBtn.disabled = false;
        this.updateControlPanelState();
        this.addLogEntry('Disconnected from local computer');
    }
    
    // Computer-to-Computer Connection via HTTP API
    async connectToLocalComputer() {
        try {
            this.updateConnectionStatus('connecting', 'Connecting to Local Computer...');
            this.connectLocalBtn.disabled = true;
            
            // Connect to the Python simulator via WebSocket simulation (using fetch for polling)
            this.startPollingConnection();
            
        } catch (error) {
            console.error('Local connection failed:', error);
            this.updateConnectionStatus('disconnected', 'Local Connection Failed');
            this.connectLocalBtn.disabled = false;
            this.addLogEntry(`Local connection failed: ${error.message}`);
        }
    }
    
    startPollingConnection() {
        // Simulate continuous data polling from local server
        const pollInterval = setInterval(async () => {
            try {
                // Try to fetch data from local Python server (if running)
                const response = await fetch('http://localhost:9999/data', { 
                    method: 'GET',
                    timeout: 1000 
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.handleLocalData(data);
                    
                    if (!this.isConnected) {
                        this.isConnected = true;
                        this.updateConnectionStatus('connected', 'Connected to Local Computer');
                        this.connectLocalBtn.textContent = '🔌 Disconnect';
                        this.connectLocalBtn.disabled = false;
                        this.updateControlPanelState();
                        this.addLogEntry('Connected to local computer successfully');
                    }
                }
            } catch (error) {
                // If no connection available, try mock data for demonstration
                if (!this.isConnected) {
                    this.startMockDataStream();
                    clearInterval(pollInterval);
                }
            }
        }, 100); // Poll every 100ms
        
        this.pollingInterval = pollInterval;
        
        // Set timeout for connection attempt
        setTimeout(() => {
            if (!this.isConnected) {
                this.startMockDataStream();
                clearInterval(pollInterval);
            }
        }, 2000);
    }
    
    startMockDataStream() {
        // Generate realistic mock data for demonstration
        let time = 0;
        
        this.isConnected = true;
        this.updateConnectionStatus('connected', 'Connected (Demo Mode)');
        this.connectLocalBtn.textContent = '🔌 Disconnect';
        this.connectLocalBtn.disabled = false;
        this.updateControlPanelState();
        this.addLogEntry('Connected in demo mode - showing simulated data');
        
        this.mockInterval = setInterval(() => {
            time += 0.03;
            
            // Generate realistic PID control data
            const desired = 15 + 8 * Math.sin(time * 0.1);
            const noise = (Math.random() - 0.5) * 0.5;
            const current = desired + noise + 2 * Math.sin(time * 0.05);
            const error = desired - current;
            
            const mockData = {
                timestamp: Date.now() * 1000,
                desired_position: desired,
                current_position: current,
                servo_command: 0.54 + error * 0.01,
                error: error,
                P_output: 0.06 * error,
                I_output: Math.sin(time * 0.02) * 0.1,
                D_output: Math.cos(time * 0.03) * 0.05
            };
            
            this.updateDataDisplay(mockData);
            this.updateChart(mockData);
            
        }, 30); // 30ms updates
    }
    
    handleLocalData(data) {
        // Handle data from local Python computer
        this.updateDataDisplay(data);
        this.updateChart(data);
        this.addLogEntry(`Local Data: D:${data.desired_position} C:${data.current_position} S:${data.servo_command}`);
    }
    
    // Setpoint Control Methods
    updateSetpoint(value) {
        if (value < 2) value = 2;
        if (value > 33) value = 33;
        
        this.currentSetpointValue = value;
        this.setpointSlider.value = value;
        this.setpointInput.value = value;
        this.currentSetpoint.textContent = value.toFixed(1);
        
        this.highlightPreset(value);
    }
    
    highlightPreset(value) {
        this.presetBtns.forEach(btn => {
            if (parseFloat(btn.dataset.value) === value) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    async sendSetpointCommand() {
        if (!this.isConnected) {
            alert('Please connect to a device first!');
            return;
        }
        
        if (this.emergencyStop) {
            alert('System is in emergency stop mode. Reset first.');
            return;
        }
        
        const command = {
            type: 'setpoint',
            value: this.currentSetpointValue,
            timestamp: Date.now(),
            auto_mode: this.autoMode
        };
        
        try {
            // Send command to Python script
            await this.sendCommand(command);
            this.addLogEntry(`📤 Setpoint sent: ${this.currentSetpointValue.toFixed(1)} cm`);
            
            // Visual feedback
            this.sendSetpointBtn.textContent = '✅ Sent!';
            this.sendSetpointBtn.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
            
            setTimeout(() => {
                this.sendSetpointBtn.textContent = '📤 Send Setpoint';
                this.sendSetpointBtn.style.background = '';
            }, 1500);
            
        } catch (error) {
            console.error('Failed to send setpoint:', error);
            this.addLogEntry(`❌ Failed to send setpoint: ${error.message}`);
            
            this.sendSetpointBtn.textContent = '❌ Failed';
            this.sendSetpointBtn.style.background = '#f44336';
            
            setTimeout(() => {
                this.sendSetpointBtn.textContent = '📤 Send Setpoint';
                this.sendSetpointBtn.style.background = '';
            }, 1500);
        }
    }
    
    async sendCommand(command) {
        if (this.mockInterval) {
            // For demo mode, just log the command
            console.log('Demo mode - Command would be sent:', command);
            return;
        }
        
        // Send to local Python server
        const response = await fetch('http://localhost:9999/command', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(command)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    toggleAutoMode() {
        this.autoMode = !this.autoMode;
        this.updateControlPanelState();
        
        const command = {
            type: 'auto_mode',
            value: this.autoMode,
            timestamp: Date.now()
        };
        
        this.sendCommand(command).catch(console.error);
        this.addLogEntry(`🔄 Auto mode: ${this.autoMode ? 'ON' : 'OFF'}`);
    }
    
    triggerEmergencyStop() {
        this.emergencyStop = !this.emergencyStop;
        this.updateControlPanelState();
        
        const command = {
            type: 'emergency_stop',
            value: this.emergencyStop,
            timestamp: Date.now()
        };
        
        this.sendCommand(command).catch(console.error);
        this.addLogEntry(`🛑 Emergency stop: ${this.emergencyStop ? 'ACTIVE' : 'RESET'}`);
        
        if (this.emergencyStop) {
            this.addLogEntry('⚠️ System stopped for safety - all movement disabled');
        } else {
            this.addLogEntry('✅ Emergency stop reset - system operational');
        }
    }
    
    updateControlPanelState() {
        // Update auto mode button
        if (this.autoMode) {
            this.autoModeBtn.textContent = '🔄 Auto Mode ON';
            this.autoModeBtn.classList.add('auto-active');
        } else {
            this.autoModeBtn.textContent = '⏸️ Manual Mode';
            this.autoModeBtn.classList.remove('auto-active');
        }
        
        // Update emergency stop button
        if (this.emergencyStop) {
            this.emergencyStopBtn.textContent = '🔄 Reset System';
            this.emergencyStopBtn.style.background = 'linear-gradient(45deg, #ff9800, #f57c00)';
            this.controlPanel.classList.add('disabled');
        } else {
            this.emergencyStopBtn.textContent = '🛑 Emergency Stop';
            this.emergencyStopBtn.style.background = '';
            this.controlPanel.classList.remove('disabled');
        }
        
        // Enable/disable controls based on connection
        const isDisabled = !this.isConnected || this.emergencyStop;
        this.sendSetpointBtn.disabled = isDisabled;
        this.setpointSlider.disabled = isDisabled;
        this.setpointInput.disabled = isDisabled;
        this.presetBtns.forEach(btn => btn.disabled = isDisabled);
    }
}

// Alternative connection method for devices that use Serial Bluetooth
class SerialBluetoothMonitor {
    constructor() {
        this.port = null;
        this.reader = null;
        this.isConnected = false;
        
        // Check if Web Serial API is supported
        if ('serial' in navigator) {
            this.setupSerialConnection();
        }
    }
    
    setupSerialConnection() {
        // Add alternative connection button for Serial API
        const connectPanel = document.querySelector('.connection-panel');
        const serialBtn = document.createElement('button');
        serialBtn.textContent = '🔗 Connect via Serial';
        serialBtn.className = 'connect-btn';
        serialBtn.style.marginLeft = '10px';
        
        serialBtn.addEventListener('click', async () => {
            if (!this.isConnected) {
                await this.connectSerial();
            } else {
                await this.disconnectSerial();
            }
        });
        
        connectPanel.appendChild(serialBtn);
        this.serialBtn = serialBtn;
    }
    
    async connectSerial() {
        try {
            // Request serial port
            this.port = await navigator.serial.requestPort();
            
            // Open the port with the same baud rate as the device
            await this.port.open({ baudRate: 9600 });
            
            this.isConnected = true;
            this.serialBtn.textContent = '🔌 Disconnect Serial';
            
            // Start reading data
            this.startReading();
            
        } catch (error) {
            console.error('Serial connection failed:', error);
            alert(`Serial connection failed: ${error.message}`);
        }
    }
    
    async startReading() {
        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
        this.reader = textDecoder.readable.getReader();
        
        try {
            while (true) {
                const { value, done } = await this.reader.read();
                if (done) break;
                
                // Process received data
                const lines = value.split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        this.processSerialData(line.trim());
                    }
                }
            }
        } catch (error) {
            console.error('Reading error:', error);
        } finally {
            this.reader.releaseLock();
        }
    }
    
    processSerialData(data) {
        try {
            // Try to parse as JSON first
            const parsedData = JSON.parse(data);
            monitor.handleData(new TextEncoder().encode(data));
        } catch (error) {
            // If not JSON, try to parse as comma-separated values
            const values = data.split(',').map(v => parseFloat(v.trim()));
            if (values.length >= 3) {
                const mockData = {
                    desired_position: values[0],
                    current_position: values[1],
                    servo_command: values[2],
                    error: values[0] - values[1],
                    P_output: 0,
                    I_output: 0,
                    D_output: 0
                };
                monitor.updateDataDisplay(mockData);
                monitor.updateChart(mockData);
            }
        }
    }
    
    async disconnectSerial() {
        if (this.reader) {
            await this.reader.cancel();
        }
        if (this.port) {
            await this.port.close();
        }
        this.isConnected = false;
        this.serialBtn.textContent = '🔗 Connect via Serial';
    }
}

// Initialize the application
let monitor;
let serialMonitor;

document.addEventListener('DOMContentLoaded', () => {
    monitor = new BluetoothDataMonitor();
    
    // Initialize serial monitor if supported
    if ('serial' in navigator) {
        serialMonitor = new SerialBluetoothMonitor();
    }
    
    // Add browser compatibility warning
    if (!navigator.bluetooth && !navigator.serial) {
        const warning = document.createElement('div');
        warning.style.cssText = `
            background: #ff9800;
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            text-align: center;
            font-weight: bold;
        `;
        warning.innerHTML = `
            ⚠️ This browser doesn't support Web Bluetooth or Web Serial APIs.<br>
            Please use Chrome or Edge for the best experience.
        `;
        document.querySelector('.container').insertBefore(warning, document.querySelector('.connection-panel'));
    }
});
