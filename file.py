import socket
 
PICO_IP = "192.168.0.29"  # IP printed by Pico

PORT = 12345
 
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

s.connect((PICO_IP, PORT))

print("Connected to Pico!")
 
while True:

    data = s.recv(1024)

    if not data:

        break

    print(data.decode().strip())

 
