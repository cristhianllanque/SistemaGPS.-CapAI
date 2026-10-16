import unittest
from datetime import datetime, timezone
import struct
from app.services.teltonika_parser import TeltonikaCodec8Parser

class TestTeltonikaParser(unittest.TestCase):
    def test_parse_imei(self):
        # 15 bytes IMEI "123456789012345"
        imei_str = "123456789012345"
        payload = struct.pack('>H', len(imei_str)) + imei_str.encode('ascii')
        
        parsed_imei = TeltonikaCodec8Parser.parse_imei(payload)
        self.assertEqual(parsed_imei, imei_str)

    def test_parse_avl_data(self):
        # Constructing a valid Codec 8 record
        preamble = b'\x00\x00\x00\x00'
        data_length = b'\x00\x00\x00\x24'
        codec_id = b'\x08'
        num_records1 = b'\x01'
        
        timestamp_ms = int(datetime(2023, 8, 22, 14, 0, 0, tzinfo=timezone.utc).timestamp() * 1000)
        timestamp_bytes = struct.pack('>Q', timestamp_ms)
        
        priority = b'\x00'
        
        lon_int = int(-77.0282 * 10000000)
        lat_int = int(-12.0431 * 10000000)
        lon_bytes = struct.pack('>i', lon_int)
        lat_bytes = struct.pack('>i', lat_int)
        
        altitude = struct.pack('>h', 150)
        angle = struct.pack('>h', 90)
        satellites = b'\x08'
        speed = struct.pack('>h', 60)
        
        # IO Element
        io_event_id = b'\xef' # 239 (Ignition)
        total_io = b'\x02'
        
        # 1-byte IOs: 2 elements
        # IO 239 (Ignition) = 1 (True)
        # IO 1 (Panic) = 0 (False)
        n1 = b'\x02'
        io_239 = b'\xef\x01'
        io_1 = b'\x01\x00'
        
        n2 = b'\x00'
        n4 = b'\x00'
        n8 = b'\x00'
        
        num_records2 = b'\x01'
        
        payload = (preamble + data_length + codec_id + num_records1 +
                   timestamp_bytes + priority + lon_bytes + lat_bytes +
                   altitude + angle + satellites + speed +
                   io_event_id + total_io +
                   n1 + io_239 + io_1 +
                   n2 + n4 + n8 +
                   num_records2)
                   
        records = TeltonikaCodec8Parser.parse_avl_data(payload)
        
        self.assertEqual(len(records), 1)
        record = records[0]
        
        self.assertAlmostEqual(record['longitude'], -77.0282, places=4)
        self.assertAlmostEqual(record['latitude'], -12.0431, places=4)
        self.assertEqual(record['altitude'], 150)
        self.assertEqual(record['speed'], 60)
        self.assertTrue(record['ignicion'])
        self.assertFalse(record['boton_panico'])

    def test_generate_ack(self):
        ack = TeltonikaCodec8Parser.generate_ack(5)
        self.assertEqual(ack, b'\x00\x00\x00\x05')

    def test_crc16_and_verification(self):
        # 1. Test CRC algorithm on a known byte string
        sample_data = b'\x08\x01\x11\x22\x33\x01'
        crc = TeltonikaCodec8Parser.calculate_crc16(sample_data)
        self.assertIsInstance(crc, int)
        
        # 2. Build full packet using the test data
        timestamp_ms = int(datetime(2023, 8, 22, 14, 0, 0, tzinfo=timezone.utc).timestamp() * 1000)
        timestamp_bytes = struct.pack('>Q', timestamp_ms)
        lon_bytes = struct.pack('>i', int(-77.0282 * 10000000))
        lat_bytes = struct.pack('>i', int(-12.0431 * 10000000))
        altitude = struct.pack('>h', 150)
        angle = struct.pack('>h', 90)
        satellites = b'\x08'
        speed = struct.pack('>h', 60)
        io_event_id = b'\xef'
        total_io = b'\x02'
        n1 = b'\x02'
        io_239 = b'\xef\x01'
        io_1 = b'\x01\x00'
        n2 = b'\x00'
        n4 = b'\x00'
        n8 = b'\x00'
        
        avl_record = (timestamp_bytes + b'\x00' + lon_bytes + lat_bytes +
                      altitude + angle + satellites + speed +
                      io_event_id + total_io + n1 + io_239 + io_1 +
                      n2 + n4 + n8)
                      
        data_part = b'\x08\x01' + avl_record + b'\x01'
        computed_crc = TeltonikaCodec8Parser.calculate_crc16(data_part)
        
        preamble = b'\x00\x00\x00\x00'
        data_len = struct.pack('>I', len(data_part))
        valid_packet = preamble + data_len + data_part + struct.pack('>I', computed_crc)
        
        # Verify valid packet passes with verify_crc=True
        records = TeltonikaCodec8Parser.parse_avl_data(valid_packet, verify_crc=True)
        self.assertEqual(len(records), 1)
        
        # Verify corrupt CRC fails
        corrupt_packet = preamble + data_len + data_part + struct.pack('>I', 0x9999)
        with self.assertRaises(ValueError):
            TeltonikaCodec8Parser.parse_avl_data(corrupt_packet, verify_crc=True)

if __name__ == '__main__':
    unittest.main()
