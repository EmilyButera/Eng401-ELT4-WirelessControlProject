import serial
import time

# Simple test to see what's coming from the Pico
try:
    print("Connecting to COM12...")
    ser = serial.Serial('COM12', 115200, timeout=1)
    print("Connected! Listening for data...")
    
    for i in range(20):  # Listen for 20 lines
        line = ser.readline().decode().strip()
        if line:
            print(f"Received: {line}")
        else:
            print("No data...")
        time.sleep(0.5)
    
    ser.close()
    print("Test complete.")
    
except Exception as e:
    print(f"Error: {e}")