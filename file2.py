import socket
 
PICO_IP = "192.168.0.29"  # Replace with Pico IP

PORT = 12345
 
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

s.settimeout(15)  # timeout 5 sec
 
try:

    s.connect((PICO_IP, PORT))

    print("Connection successful!")

except Exception as e:

    print("Cannot connect:", e)

finally:

    s.close()

 