import socket
import struct
import time
import argparse
from datetime import datetime

# CRC16 for Teltonika
def crc16(data: bytes) -> int:
    crc = 0x0000
    for byte in data:
        crc ^= byte
        for _ in range(8):
            if crc & 1:
                crc = (crc >> 1) ^ 0xA001
            else:
                crc >>= 1
    return crc

def create_imei_packet(imei: str) -> bytes:
    imei_bytes = imei.encode('ascii')
    length = len(imei_bytes)
    return struct.pack('>H', length) + imei_bytes

def create_avl_data(lat, lon, speed, is_panic=False, is_ignition_on=True):
    timestamp = int(time.time() * 1000)
    priority = 1 # High priority if panic else normal
    
    # Coordinates in 1e7
    lat_int = int(lat * 1e7)
    lon_int = int(lon * 1e7)
    altitude = 3800
    angle = 90
    satellites = 12
    
    # IO elements
    # 239 (Ignition) -> 1 byte
    # 240 (Movement) -> 1 byte
    # 252 (Unplug/Panic) -> 1 byte
    
    io_elements = []
    
    # 1 byte IOs
    io1 = []
    io1.append(struct.pack('>BB', 239, 1 if is_ignition_on else 0))
    io1.append(struct.pack('>BB', 240, 1 if speed > 0 else 0))
    if is_panic:
        io1.append(struct.pack('>BB', 252, 1))
        
    io1_bytes = b''.join(io1)
    
    total_io = len(io1)
    
    event_id = 252 if is_panic else 0
    
    # N1, N2, N4, N8
    io_blocks = struct.pack('>B', event_id) + \
                struct.pack('>B', total_io) + \
                struct.pack('>B', len(io1)) + io1_bytes + \
                struct.pack('>B', 0) + \
                struct.pack('>B', 0) + \
                struct.pack('>B', 0)
                
    avl_data = struct.pack('>Q', timestamp) + \
               struct.pack('>B', priority) + \
               struct.pack('>i', lon_int) + \
               struct.pack('>i', lat_int) + \
               struct.pack('>h', altitude) + \
               struct.pack('>h', angle) + \
               struct.pack('>B', satellites) + \
               struct.pack('>H', speed) + \
               io_blocks
               
    return avl_data

def create_codec8_packet(records: list):
    codec_id = 0x08
    num_records = len(records)
    
    records_bytes = b''.join(records)
    
    data_part = struct.pack('>B', codec_id) + \
                struct.pack('>B', num_records) + \
                records_bytes + \
                struct.pack('>B', num_records)
                
    data_length = len(data_part)
    
    preamble = struct.pack('>I', 0)
    data_length_bytes = struct.pack('>I', data_length)
    
    crc = crc16(data_part)
    crc_bytes = struct.pack('>I', crc)
    
    return preamble + data_length_bytes + data_part + crc_bytes

def main():
    parser = argparse.ArgumentParser(description="Teltonika FMC130 Emulator")
    parser.add_argument("--host", default="127.0.0.1", help="TCP server host")
    parser.add_argument("--port", type=int, default=5000, help="TCP server port")
    parser.add_argument("--imei", default="123456789012345", help="IMEI of the device")
    parser.add_argument("--panico", action="store_true", help="Inject a panic alert in the first packet")
    args = parser.parse_args()
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.connect((args.host, args.port))
        print(f"Connected to {args.host}:{args.port}")
        
        # 1. Send Handshake
        handshake = create_imei_packet(args.imei)
        sock.sendall(handshake)
        
        response = sock.recv(1)
        if response != b'\x01':
            print("Server rejected IMEI")
            return
            
        print("IMEI accepted. Starting AVL data transmission...")
        
        lat = -15.5
        lon = -70.1
        speed = 40
        
        # 2. Send Data
        count = 0
        while True:
            is_panic = args.panico if count == 0 else False
            
            # Simulate movement
            lat += 0.0001
            lon += 0.0001
            
            avl = create_avl_data(lat, lon, speed, is_panic=is_panic)
            packet = create_codec8_packet([avl])
            
            sock.sendall(packet)
            
            # Read ACK (4 bytes)
            ack = sock.recv(4)
            if len(ack) == 4:
                num_received = struct.unpack('>I', ack)[0]
                print(f"[{datetime.now()}] Sent 1 record. Server ACK: {num_received}")
            else:
                print("Invalid ACK length")
                break
                
            count += 1
            time.sleep(5)
            
    except ConnectionRefusedError:
        print(f"Connection refused to {args.host}:{args.port}")
    except KeyboardInterrupt:
        print("\nEmulator stopped")
    finally:
        sock.close()

if __name__ == "__main__":
    main()
