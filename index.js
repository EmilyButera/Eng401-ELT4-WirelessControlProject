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
        // Stop polling if active
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        this.isConnected = false;
        this.updateConnectionStatus('disconnected', 'Disconnected');
        this.connectLocalBtn.textContent = '🌐 Connect to Computer A';
        this.connectLocalBtn.disabled = false;
        this.addLogEntry('Disconnected from Computer A');
    }
    
    // Computer-to-Computer Connection via Network
    async connectToLocalComputer() {
        try {
            this.updateConnectionStatus('connecting', 'Connecting to Computer A via Network...');
            this.connectLocalBtn.disabled = true;
            
            // Start polling connection to Computer A
            this.startNetworkPolling();
            
        } catch (error) {
            console.error('Network connection failed:', error);
            this.updateConnectionStatus('disconnected', 'Network Connection Failed');
            this.connectLocalBtn.disabled = false;
            this.addLogEntry(`Network connection failed: ${error.message}`);
        }
    }
    
    startNetworkPolling() {
        // Computer A IP address - UPDATE THIS with your Computer A's actual IP
        const COMPUTER_A_IP = '192.168.1.100'; // CHANGE THIS TO COMPUTER A'S IP ADDRESS
        const API_BASE = `http://${COMPUTER_A_IP}:9999`;
        
        // Connect to real hardware data from Computer A
        const pollInterval = setInterval(async () => {
            try {
                // Check connection status first
                const statusResponse = await fetch(`${API_BASE}/status`, { 
                    method: 'GET',
                    signal: AbortSignal.timeout(1000)
                });
                
                if (statusResponse.ok) {
                    const status = await statusResponse.json();
                    
                    if (status.pico_connected) {
                        // Get real data from Pico
                        const dataResponse = await fetch(`${API_BASE}/data`, { 
                            method: 'GET',
                            signal: AbortSignal.timeout(1000)
                        });
                        
                        if (dataResponse.ok) {
                            const data = await dataResponse.json();
                            this.handleLocalData(data);
                            
                            if (!this.isConnected) {
                                this.isConnected = true;
                                this.updateConnectionStatus('connected', 'Monitoring Pico Hardware via Network');
                                this.connectLocalBtn.textContent = '🔌 Disconnect';
                                this.connectLocalBtn.disabled = false;
                                this.addLogEntry('✅ Connected to Pico hardware via Computer A - monitoring mode');
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
                // Connection failed
                if (!this.isConnected) {
                    console.log('Computer A bridge not available');
                    this.updateConnectionStatus('disconnected', 'Computer A Not Found');
                    this.connectLocalBtn.disabled = false;
                    this.addLogEntry('❌ Cannot connect to Computer A. Please check:');
                    this.addLogEntry(`   1. Computer A is running hardware_bridge.py`);
                    this.addLogEntry(`   2. Update COMPUTER_A_IP in index.js to Computer A's IP`);
                    this.addLogEntry(`   3. Both computers are on the same network`);
                    this.addLogEntry(`   4. Pico is connected to Computer A via USB`);
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
                console.error('Network connection timeout');
                this.updateConnectionStatus('disconnected', 'Computer A Required');
                this.connectLocalBtn.disabled = false;
                this.addLogEntry('❌ Unable to connect to Computer A. Please verify:');
                this.addLogEntry('   1. Computer A IP address is correct in index.js');
                this.addLogEntry('   2. Computer A is running hardware_bridge.py');
                this.addLogEntry('   3. Pico is connected to Computer A via USB');
                this.addLogEntry('   4. Isabel script is running on the Pico');
                this.addLogEntry('⚠️ This system requires real hardware - no simulation mode');
                clearInterval(pollInterval);
            }
        }, 5000); // Give time for hardware connection
    }
    

    
    handleLocalData(data) {
        // Handle data from Pico hardware
        this.updateDataDisplay(data);
        this.updateChart(data);
        this.addLogEntry(`Hardware Data: D:${data.desired_position} C:${data.current_position} S:${data.servo_command}`);
    }
    

}



// Initialize the hardware monitoring application
let monitor;

document.addEventListener('DOMContentLoaded', () => {
    monitor = new BluetoothDataMonitor();
    
    // Add hardware requirement notice
    const notice = document.createElement('div');
    notice.style.cssText = `
        background: #2196F3;
        color: white;
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 20px;
        text-align: center;
        font-weight: bold;
    `;
    notice.innerHTML = `
        🔧 Hardware Required: This interface displays real data from your Raspberry Pi Pico.<br>
        No simulation mode available - connect your physical sensors and servo.
    `;
    document.querySelector('.container').insertBefore(notice, document.querySelector('.connection-panel'));
});
