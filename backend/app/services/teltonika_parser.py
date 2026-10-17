import struct
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

def calculate_liion_battery_percentage(mv: int) -> int:
    """
    Calibrates internal Li-ion battery voltage (mV) to State of Charge (SoC %)
    matching Teltonika official FMB series discharge curve (3.7V nominal ~60%).
    """
    if mv >= 4150:
        return 100
    elif mv >= 3980:
        return 80 + int((mv - 3980) / (4150 - 3980) * 20)
    elif mv >= 3880:
        return 70 + int((mv - 3880) / (3980 - 3880) * 10)
    elif mv >= 3700:
        # At 3710mV this yields 60%, exactly matching Teltonika Configurator
        return 60 + int((mv - 3700) / (3880 - 3700) * 10)
    elif mv >= 3650:
        return 50 + int((mv - 3650) / (3700 - 3650) * 10)
    elif mv >= 3600:
        return 40 + int((mv - 3600) / (3650 - 3600) * 10)
    elif mv >= 3550:
        return 25 + int((mv - 3550) / (3600 - 3550) * 15)
    elif mv >= 3450:
        return 10 + int((mv - 3450) / (3550 - 3450) * 15)
    elif mv > 3300:
        return max(1, int((mv - 3300) / (3450 - 3300) * 9))
    else:
        return 0

class TeltonikaCodec8Parser:
    @staticmethod
    def parse_imei(data: bytes) -> str:
        """
        Extracts IMEI from the initial connection packet.
        Format: <2 bytes length> <length bytes ASCII string>
        """
        try:
            if len(data) >= 2:
                imei_length = struct.unpack('>H', data[:2])[0]
                if len(data) >= 2 + imei_length:
                    return data[2:2+imei_length].decode('ascii')
        except Exception as e:
            logger.error(f"Error parsing IMEI: {e}")
        return ""

    @staticmethod
    def calculate_crc16(data: bytes) -> int:
        """
        Calculates Teltonika CRC-16 (IBM / Modbus style) over data part.
        Polynomial: 0xA001
        """
        crc = 0x0000
        for byte in data:
            crc ^= byte
            for _ in range(8):
                if crc & 1:
                    crc = (crc >> 1) ^ 0xA001
                else:
                    crc >>= 1
        return crc & 0xFFFF

    @staticmethod
    def parse_avl_data(data: bytes, verify_crc: bool = False) -> list[dict]:
        """
        Decodes the binary block of AVL records (Codec 8 / Codec 8 Extended).
        Optionally verifies the 4-byte CRC16 at the end of the packet.
        """
        records = []
        if len(data) < 45: # Minimum possible length for a valid packet with 1 record
            return records
            
        preamble = struct.unpack('>I', data[:4])[0]
        if preamble != 0:
            raise ValueError(f"Invalid preamble: expected 0x00000000, got {hex(preamble)}")
            
        data_length = struct.unpack('>I', data[4:8])[0]
        
        # Verify CRC if requested and full packet is provided
        if verify_crc and len(data) >= 8 + data_length + 4:
            data_part = data[8:8 + data_length]
            received_crc = struct.unpack('>I', data[8 + data_length:8 + data_length + 4])[0]
            computed_crc = TeltonikaCodec8Parser.calculate_crc16(data_part)
            if received_crc != computed_crc:
                raise ValueError(f"CRC verification failed: computed {hex(computed_crc)}, received {hex(received_crc)}")
                
        codec_id = data[8]
        
        if codec_id not in (0x08, 0x8E):
            raise ValueError(f"Unsupported Codec ID: {hex(codec_id)}")
            
        number_of_data1 = data[9]
        offset = 10
        
        for _ in range(number_of_data1):
            if offset + 24 > len(data):
                break
                
            timestamp_ms = struct.unpack('>Q', data[offset:offset+8])[0]
            timestamp = datetime.fromtimestamp(timestamp_ms / 1000.0, tz=timezone.utc)
            offset += 8
            
            priority = data[offset]
            offset += 1
            
            longitude_int = struct.unpack('>i', data[offset:offset+4])[0]
            longitude = longitude_int / 10000000.0
            offset += 4
            
            latitude_int = struct.unpack('>i', data[offset:offset+4])[0]
            latitude = latitude_int / 10000000.0
            offset += 4
            
            altitude = struct.unpack('>h', data[offset:offset+2])[0]
            offset += 2
            
            angle = struct.unpack('>h', data[offset:offset+2])[0]
            offset += 2
            
            satellites = data[offset]
            offset += 1
            
            speed = struct.unpack('>h', data[offset:offset+2])[0]
            offset += 2
            
            # IO Element
            if codec_id == 0x08:
                io_event_id = data[offset]
                # total_io_count
                offset += 2 
            else: # Codec 8 Extended
                io_event_id = struct.unpack('>H', data[offset:offset+2])[0]
                # total_io_count
                offset += 4
            
            io_dict = {}
            
            def parse_io_elements(count, length, codec_id):
                nonlocal offset
                for _ in range(count):
                    if codec_id == 0x08:
                        io_id = data[offset]
                        offset += 1
                    else:
                        io_id = struct.unpack('>H', data[offset:offset+2])[0]
                        offset += 2
                        
                    if length == 1:
                        val = struct.unpack('>B', data[offset:offset+1])[0]
                    elif length == 2:
                        val = struct.unpack('>H', data[offset:offset+2])[0]
                    elif length == 4:
                        val = struct.unpack('>I', data[offset:offset+4])[0]
                    elif length == 8:
                        val = struct.unpack('>Q', data[offset:offset+8])[0]
                    else:
                        val = 0
                    
                    io_dict[io_id] = val
                    offset += length

            if codec_id == 0x08:
                n1 = data[offset]; offset += 1
                parse_io_elements(n1, 1, codec_id)
                n2 = data[offset]; offset += 1
                parse_io_elements(n2, 2, codec_id)
                n4 = data[offset]; offset += 1
                parse_io_elements(n4, 4, codec_id)
                n8 = data[offset]; offset += 1
                parse_io_elements(n8, 8, codec_id)
            else: # Codec 8 Extended
                n1 = struct.unpack('>H', data[offset:offset+2])[0]; offset += 2
                parse_io_elements(n1, 1, codec_id)
                n2 = struct.unpack('>H', data[offset:offset+2])[0]; offset += 2
                parse_io_elements(n2, 2, codec_id)
                n4 = struct.unpack('>H', data[offset:offset+2])[0]; offset += 2
                parse_io_elements(n4, 4, codec_id)
                n8 = struct.unpack('>H', data[offset:offset+2])[0]; offset += 2
                parse_io_elements(n8, 8, codec_id)
                nx = struct.unpack('>H', data[offset:offset+2])[0]; offset += 2
                for _ in range(nx):
                    io_id = struct.unpack('>H', data[offset:offset+2])[0]
                    offset += 2
                    var_len = struct.unpack('>H', data[offset:offset+2])[0]
                    offset += 2
                    val = data[offset:offset+var_len]
                    io_dict[io_id] = val
                    offset += var_len
                    
            record = {
                'timestamp': timestamp,
                'priority': priority,
                'longitude': longitude,
                'latitude': latitude,
                'altitude': altitude,
                'angle': angle,
                'satellites': satellites,
                'speed': speed,
                'ignicion': bool(io_dict[239]) if 239 in io_dict else (bool(io_dict[1]) if 1 in io_dict else (True if io_event_id in (1, 239) else False)),
                'boton_panico': bool(io_dict[2]) if 2 in io_dict else (bool(io_dict[252]) if 252 in io_dict else (True if io_event_id in (2, 252) else False)),
                'bateria_ext': round(io_dict[66] / 1000.0, 2) if 66 in io_dict else None,
                'bateria_int': round(io_dict[67] / 1000.0, 2) if 67 in io_dict else None,
                'bateria_porcentaje': int(io_dict[113]) if 113 in io_dict else (calculate_liion_battery_percentage(io_dict[67]) if 67 in io_dict and io_dict[67] > 0 else None),
                'io_dict': io_dict
            }
            print(f"DEBUG IO DICT: {io_dict}", flush=True)
            records.append(record)
            
        number_of_data2 = data[offset]
        if number_of_data1 != number_of_data2:
            raise ValueError(f"Number of records mismatch: {number_of_data1} != {number_of_data2}")
            
        return records

    @staticmethod
    def generate_ack(records_count: int) -> bytes:
        """
        Generates the 4-byte acknowledgment response in Big-Endian.
        """
        return struct.pack('>I', records_count)
