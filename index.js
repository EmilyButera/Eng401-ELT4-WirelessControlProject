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
        this.connectLocalBtn.addEventListener('click', () => this.toggleLocalConnection());
        this.clearLogBtn.addEventListener('click', () => this.clearLog());
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
        this.connectLocalBtn.textContent = '� Connect to Monitor Data';
        this.connectLocalBtn.disabled = false;
        this.addLogEntry('Disconnected from data source');
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
        // Connect to real hardware data from Computer A
        const pollInterval = setInterval(async () => {
            try {
                // Check connection status first
                const statusResponse = await fetch('http://localhost:9999/status', { 
                    method: 'GET',
                    timeout: 1000 
                });
                
                if (statusResponse.ok) {
                    const status = await statusResponse.json();
                    
                    if (status.pico_connected) {
                        // Get real data from Pico
                        const dataResponse = await fetch('http://localhost:9999/data', { 
                            method: 'GET',
                            timeout: 1000 
                        });
                        
                        if (dataResponse.ok) {
                            const data = await dataResponse.json();
                            this.handleLocalData(data);
                            
                            if (!this.isConnected) {
                                this.isConnected = true;
                                this.updateConnectionStatus('connected', 'Monitoring Pico Hardware');
                                this.connectLocalBtn.textContent = '🔌 Disconnect';
                                this.connectLocalBtn.disabled = false;
                                this.addLogEntry('Connected to Pico hardware - monitoring mode');
                            }
                        }
                    } else {
                        // Pico not connected
                        if (this.isConnected) {
                            this.addLogEntry('⚠️ Pico disconnected from Computer A');
                            this.updateConnectionStatus('connecting', 'Pico Disconnected');
                        }
                    }
                } else {
                    throw new Error('Computer A not responding');
                }
                
            } catch (error) {
                // Connection failed - offer demo mode
                if (!this.isConnected) {
                    console.log('Hardware bridge not available, starting demo mode');
                    this.startMockDataStream();
                    clearInterval(pollInterval);
                } else if (this.isConnected) {
                    this.addLogEntry(`❌ Connection lost: ${error.message}`);
                    this.updateConnectionStatus('connecting', 'Reconnecting...');
                }
            }
        }, 100); // Poll every 100ms for real-time data
        
        this.pollingInterval = pollInterval;
        
        // Set timeout for initial connection attempt
        setTimeout(() => {
            if (!this.isConnected) {
                console.log('No hardware detected, switching to demo mode');
                this.startMockDataStream();
                clearInterval(pollInterval);
            }
        }, 3000); // Give more time for hardware connection
    }
    
    startMockDataStream() {
        // Generate realistic mock data for demonstration
        let time = 0;
        
        this.isConnected = true;
        this.updateConnectionStatus('connected', 'Demo Mode - Simulated Data');
        this.connectLocalBtn.textContent = '🔌 Disconnect';
        this.connectLocalBtn.disabled = false;
        this.addLogEntry('Demo mode - showing simulated PID data for testing');
        
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
        // Handle data from Pico hardware
        this.updateDataDisplay(data);
        this.updateChart(data);
        this.addLogEntry(`Hardware Data: D:${data.desired_position} C:${data.current_position} S:${data.servo_command}`);
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
