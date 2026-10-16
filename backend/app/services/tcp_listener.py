import asyncio
import struct
import logging
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db import models
from app.services.teltonika_parser import TeltonikaCodec8Parser
from app.websockets.manager import manager

logger = logging.getLogger(__name__)

async def run_in_thread(func, *args, **kwargs):
    return await asyncio.to_thread(func, *args, **kwargs)

def verify_imei_in_db(imei: str):
    with SessionLocal() as db:
        dispositivo = db.query(models.Dispositivo).filter(models.Dispositivo.imei == imei, models.Dispositivo.activo == True).first()
        if not dispositivo:
            return None
            
        vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.dispositivo_id == dispositivo.id).first()
        if not vehiculo:
            return None
            
        return {
            'empresa_id': dispositivo.empresa_id,
            'vehiculo_id': vehiculo.id,
            'placa': vehiculo.placa,
            'conductor': vehiculo.conductor.nombre if vehiculo.conductor else "Sin conductor asignado"
        }

def save_records_to_db(vehiculo_id: int, records: list[dict]):
    inserted_lecturas = []
    alertas_generadas = []
    
    with SessionLocal() as db:
        for r in records:
            # Normalize timestamp to naive UTC for MySQL compatibility
            ts = r['timestamp']
            if hasattr(ts, 'tzinfo') and ts.tzinfo is not None:
                ts = ts.replace(tzinfo=None)

            lectura = models.LecturaGPS(
                vehiculo_id=vehiculo_id,
                latitud=r['latitude'],
                longitud=r['longitude'],
                velocidad=r['speed'],
                ignicion=r['ignicion'],
                boton_panico=r['boton_panico'],
                timestamp=ts
            )
            db.add(lectura)
            inserted_lecturas.append(lectura)
            
            if r['boton_panico']:
                # Deduplication: check if there's already an active 'pendiente' alert for this vehicle
                alerta_existente = db.query(models.AlertaPanico).filter(
                    models.AlertaPanico.vehiculo_id == vehiculo_id,
                    models.AlertaPanico.estado == 'pendiente'
                ).order_by(models.AlertaPanico.fecha_hora.desc()).first()

                if not alerta_existente:
                    alerta = models.AlertaPanico(
                        vehiculo_id=vehiculo_id,
                        latitud=r['latitude'],
                        longitud=r['longitude'],
                        estado='pendiente',
                        fecha_hora=ts
                    )
                    db.add(alerta)
                    alertas_generadas.append(alerta)
                else:
                    # Update coordinate on the ongoing alert to track vehicle during the emergency
                    alerta_existente.latitud = r['latitude']
                    alerta_existente.longitud = r['longitude']
                    alertas_generadas.append(alerta_existente)
                
        db.commit()
        
        lecturas_dicts = [{
            'latitud': l.latitud,
            'longitud': l.longitud,
            'velocidad': l.velocidad,
            'ignicion': l.ignicion,
            'boton_panico': l.boton_panico,
            'timestamp': l.timestamp.isoformat() if l.timestamp else None
        } for l in inserted_lecturas]
        
        alerta_id = alertas_generadas[-1].id if alertas_generadas else None
        
    return lecturas_dicts, alerta_id

async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    addr = writer.get_extra_info('peername')
    logger.info(f"New connection from {addr}")
    print(f"[TCP] Nueva conexión desde {addr}", flush=True)
    
    try:
        # 1. Read IMEI packet: <2 bytes length> <length bytes ASCII string>
        imei_header = await reader.read(2)
        if len(imei_header) < 2:
            writer.close()
            await writer.wait_closed()
            return
            
        imei_len = struct.unpack('>H', imei_header)[0]
        imei_body = await reader.read(imei_len)
        imei_data = imei_header + imei_body
        
        imei = TeltonikaCodec8Parser.parse_imei(imei_data)
        if not imei:
            print(f"[TCP] Invalid IMEI received from {addr}", flush=True)
            writer.write(b'\x00')
            await writer.drain()
            writer.close()
            await writer.wait_closed()
            return
            
        # Verify in DB
        device_info = await run_in_thread(verify_imei_in_db, imei)
        if not device_info:
            print(f"[TCP] IMEI {imei} no registrado o inactivo en DB. Rechazando.", flush=True)
            writer.write(b'\x00')
            await writer.drain()
            writer.close()
            await writer.wait_closed()
            return
            
        print(f"[TCP] IMEI {imei} autenticado exitosamente ({device_info.get('placa')}). Enviando ACK.", flush=True)
        writer.write(b'\x01')
        await writer.drain()
        
        vehiculo_id = device_info['vehiculo_id']
        empresa_id = device_info['empresa_id']
        placa = device_info.get('placa', 'Desconocido')
        conductor = device_info.get('conductor', 'Sin conductor asignado')
        
        # 2. Receive AVL Data Loop with Streaming Buffer & Framing
        buffer = bytearray()
        
        while True:
            chunk = await reader.read(4096)
            if not chunk:
                print(f"[TCP] Conexión cerrada por el dispositivo {addr} (IMEI {imei})", flush=True)
                break
                
            buffer.extend(chunk)
            
            # Process all complete packets in buffer
            while len(buffer) >= 8:
                preamble = struct.unpack('>I', buffer[:4])[0]
                if preamble != 0:
                    # Synchronize stream: search for the next 0x00000000
                    idx = buffer.find(b'\x00\x00\x00\x00')
                    if idx != -1:
                        del buffer[:idx]
                        if len(buffer) < 8:
                            break
                    else:
                        del buffer[:-3]
                        break
                        
                data_length = struct.unpack('>I', buffer[4:8])[0]
                total_packet_len = 8 + data_length + 4 # 8 header + N data + 4 CRC
                
                if len(buffer) < total_packet_len:
                    # Packet incomplete, wait for remaining chunks from socket
                    break
                    
                packet_data = bytes(buffer[:total_packet_len])
                del buffer[:total_packet_len]
                
                try:
                    # Parse packet and verify CRC-16
                    records = TeltonikaCodec8Parser.parse_avl_data(packet_data, verify_crc=True)
                    
                    if records:
                        print(f"[TCP] Recibidos {len(records)} registros AVL válidos del IMEI {imei}", flush=True)
                        lecturas_dicts, alerta_id = await run_in_thread(save_records_to_db, vehiculo_id, records)
                        
                        latest_record = lecturas_dicts[-1]
                        broadcast_msg = {
                            "type": "telemetria",
                            "vehiculo_id": vehiculo_id,
                            "placa": placa,
                            "conductor": conductor,
                            "data": latest_record
                        }
                        await manager.broadcast_to_empresa(empresa_id, broadcast_msg)
                        
                        if alerta_id:
                            panic_msg = {
                                "type": "panic_alert",
                                "alerta_id": alerta_id,
                                "vehiculo_id": vehiculo_id,
                                "placa": placa,
                                "conductor": conductor,
                                "latitud": latest_record['latitud'],
                                "longitud": latest_record['longitud'],
                                "message": "¡Alerta de pánico recibida!"
                            }
                            await manager.broadcast_to_empresa(empresa_id, panic_msg)
                    
                    # Respond with AVL ACK: 4 bytes big endian count of records
                    ack_response = TeltonikaCodec8Parser.generate_ack(len(records))
                    writer.write(ack_response)
                    await writer.drain()
                    
                except ValueError as ve:
                    print(f"[TCP] Error de validación AVL desde {addr}: {ve}", flush=True)
                    # Even if validation fails on a corrupt packet, acknowledge 0 to request retransmit or flush
                    writer.write(b'\x00\x00\x00\x00')
                    await writer.drain()
                except Exception as e:
                    print(f"[TCP] Error inesperado procesando trama AVL de {addr}: {e}", flush=True)
                    break
                    
    except asyncio.CancelledError:
        pass
    except ConnectionResetError:
        print(f"[TCP] Conexión reiniciada por el dispositivo {addr}", flush=True)
    except Exception as e:
        print(f"[TCP] Error en handle_client para {addr}: {e}", flush=True)
    finally:
        print(f"[TCP] Cerrando socket para {addr}", flush=True)
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass

async def start_tcp_server(host: str = '0.0.0.0', port: int = 5000):
    server = await asyncio.start_server(handle_client, host, port)
    addrs = ', '.join(str(sockets.getsockname()) for sockets in server.sockets)
    logger.info(f"Teltonika TCP Server listening on {addrs}")
    print(f"[TCP SERVER] Escuchando en {addrs}", flush=True)
    
    async with server:
        await server.serve_forever()
