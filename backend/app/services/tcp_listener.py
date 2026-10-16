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
    panic_alert_id = None
    speed_alert_info = None
    sabotage_alert_info = None
    
    with SessionLocal() as db:
        # Obtain vehicle and company's speed limit
        vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
        limite_velocidad = 90
        if vehiculo and vehiculo.empresa and vehiculo.empresa.limite_velocidad:
            limite_velocidad = vehiculo.empresa.limite_velocidad

        for r in records:
            # Normalize timestamp to naive UTC for MySQL compatibility
            ts = r['timestamp']
            if hasattr(ts, 'tzinfo') and ts.tzinfo is not None:
                ts = ts.replace(tzinfo=None)

            bateria_ext_v = r.get('bateria_ext')
            bateria_int_v = r.get('bateria_int')
            bateria_pct = r.get('bateria_porcentaje')
            io_dict = r.get('io_dict', {})

            lectura = models.LecturaGPS(
                vehiculo_id=vehiculo_id,
                latitud=r['latitude'],
                longitud=r['longitude'],
                velocidad=r['speed'],
                ignicion=r['ignicion'],
                boton_panico=r['boton_panico'],
                bateria_ext=bateria_ext_v,
                bateria_int=bateria_int_v,
                bateria_porcentaje=bateria_pct,
                timestamp=ts
            )
            db.add(lectura)
            inserted_lecturas.append(lectura)
            
            # 1. Panic button check
            if r['boton_panico']:
                # Deduplication: check if there's already an active 'pendiente' panic alert for this vehicle
                alerta_existente = db.query(models.AlertaPanico).filter(
                    models.AlertaPanico.vehiculo_id == vehiculo_id,
                    models.AlertaPanico.estado == 'pendiente',
                    models.AlertaPanico.tipo == 'panico'
                ).order_by(models.AlertaPanico.fecha_hora.desc()).first()

                if not alerta_existente:
                    alerta = models.AlertaPanico(
                        vehiculo_id=vehiculo_id,
                        latitud=r['latitude'],
                        longitud=r['longitude'],
                        estado='pendiente',
                        tipo='panico',
                        fecha_hora=ts
                    )
                    db.add(alerta)
                    db.flush()
                    panic_alert_id = alerta.id
                else:
                    alerta_existente.latitud = r['latitude']
                    alerta_existente.longitud = r['longitude']
                    panic_alert_id = alerta_existente.id

            # 2. Speed limit excess check (> limite_velocidad km/h)
            curr_speed = r.get('speed') or 0
            if curr_speed > limite_velocidad:
                alerta_speed_existente = db.query(models.AlertaPanico).filter(
                    models.AlertaPanico.vehiculo_id == vehiculo_id,
                    models.AlertaPanico.estado == 'pendiente',
                    models.AlertaPanico.tipo == 'exceso_velocidad'
                ).order_by(models.AlertaPanico.fecha_hora.desc()).first()

                if not alerta_speed_existente:
                    alerta_speed = models.AlertaPanico(
                        vehiculo_id=vehiculo_id,
                        latitud=r['latitude'],
                        longitud=r['longitude'],
                        estado='pendiente',
                        tipo='exceso_velocidad',
                        velocidad=curr_speed,
                        fecha_hora=ts
                    )
                    db.add(alerta_speed)
                    db.flush()
                    speed_alert_info = {
                        "alerta_id": alerta_speed.id,
                        "velocidad": curr_speed,
                        "limite": limite_velocidad
                    }
                else:
                    alerta_speed_existente.latitud = r['latitude']
                    alerta_speed_existente.longitud = r['longitude']
                    alerta_speed_existente.velocidad = curr_speed
                    speed_alert_info = {
                        "alerta_id": alerta_speed_existente.id,
                        "velocidad": curr_speed,
                        "limite": limite_velocidad
                    }

            # 3. Sabotage / Main battery disconnect check
            # Vehicle battery is 12V / 24V. When thieves disconnect the battery (or switch off),
            # external voltage drops to 0V (or < 6.0V), while the Teltonika internal backup battery powers the GPS.
            ext_mv = io_dict.get(66)
            is_sabotaje = False
            if ext_mv is not None and ext_mv < 6000:
                is_sabotaje = True
            elif bateria_ext_v is not None and bateria_ext_v < 6.0:
                is_sabotaje = True

            if is_sabotaje:
                alerta_sab_existente = db.query(models.AlertaPanico).filter(
                    models.AlertaPanico.vehiculo_id == vehiculo_id,
                    models.AlertaPanico.estado == 'pendiente',
                    models.AlertaPanico.tipo == 'sabotaje'
                ).order_by(models.AlertaPanico.fecha_hora.desc()).first()

                ext_val = bateria_ext_v if bateria_ext_v is not None else 0.0
                int_val = bateria_int_v if bateria_int_v is not None else 0.0
                obs = f"Corte de batería principal / Sabotaje. Voltaje ext: {ext_val}V. Bat interna: {int_val}V."

                if not alerta_sab_existente:
                    alerta_sab = models.AlertaPanico(
                        vehiculo_id=vehiculo_id,
                        latitud=r['latitude'],
                        longitud=r['longitude'],
                        estado='pendiente',
                        tipo='sabotaje',
                        velocidad=curr_speed,
                        fecha_hora=ts,
                        observaciones_atencion=obs
                    )
                    db.add(alerta_sab)
                    db.flush()
                    sabotage_alert_info = {
                        "alerta_id": alerta_sab.id,
                        "bateria_ext": ext_val,
                        "bateria_int": int_val,
                        "bateria_porcentaje": bateria_pct
                    }
                else:
                    alerta_sab_existente.latitud = r['latitude']
                    alerta_sab_existente.longitud = r['longitude']
                    alerta_sab_existente.velocidad = curr_speed
                    sabotage_alert_info = {
                        "alerta_id": alerta_sab_existente.id,
                        "bateria_ext": ext_val,
                        "bateria_int": int_val,
                        "bateria_porcentaje": bateria_pct
                    }
                
        db.commit()
        
        lecturas_dicts = [{
            'latitud': l.latitud,
            'longitud': l.longitud,
            'velocidad': l.velocidad or 0,
            'ignicion': bool(l.ignicion),
            'boton_panico': bool(l.boton_panico),
            'bateria_ext': l.bateria_ext,
            'bateria_int': l.bateria_int,
            'bateria_porcentaje': l.bateria_porcentaje,
            'sabotaje': bool(l.bateria_ext is not None and l.bateria_ext < 6.0),
            'online': True,
            'timestamp': (l.timestamp.isoformat() + 'Z') if l.timestamp else None
        } for l in inserted_lecturas]
        
    return lecturas_dicts, panic_alert_id, speed_alert_info, sabotage_alert_info, limite_velocidad

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
                        lecturas_dicts, panic_alert_id, speed_alert_info, sabotage_alert_info, limite_velocidad = await run_in_thread(save_records_to_db, vehiculo_id, records)
                        
                        latest_record = lecturas_dicts[-1]
                        broadcast_msg = {
                            "type": "telemetria",
                            "vehiculo_id": vehiculo_id,
                            "placa": placa,
                            "conductor": conductor,
                            "limite_velocidad": limite_velocidad,
                            "data": latest_record
                        }
                        await manager.broadcast_all(broadcast_msg)
                        
                        if panic_alert_id:
                            panic_msg = {
                                "type": "panic_alert",
                                "alerta_id": panic_alert_id,
                                "vehiculo_id": vehiculo_id,
                                "placa": placa,
                                "conductor": conductor,
                                "latitud": latest_record['latitud'],
                                "longitud": latest_record['longitud'],
                                "message": "¡Alerta de pánico recibida!"
                            }
                            await manager.broadcast_all(panic_msg)

                        if speed_alert_info:
                            speed_msg = {
                                "type": "speed_alert",
                                "alerta_id": speed_alert_info['alerta_id'],
                                "vehiculo_id": vehiculo_id,
                                "placa": placa,
                                "conductor": conductor,
                                "velocidad": speed_alert_info['velocidad'],
                                "limite": speed_alert_info['limite'],
                                "latitud": latest_record['latitud'],
                                "longitud": latest_record['longitud'],
                                "message": f"¡Exceso de velocidad: {speed_alert_info['velocidad']} km/h! (Límite configurado: {speed_alert_info['limite']} km/h)"
                            }
                            await manager.broadcast_all(speed_msg)

                        if sabotage_alert_info:
                            sabotage_msg = {
                                "type": "sabotage_alert",
                                "alerta_id": sabotage_alert_info['alerta_id'],
                                "vehiculo_id": vehiculo_id,
                                "placa": placa,
                                "conductor": conductor,
                                "bateria_ext": sabotage_alert_info['bateria_ext'],
                                "bateria_int": sabotage_alert_info['bateria_int'],
                                "bateria_porcentaje": sabotage_alert_info.get('bateria_porcentaje'),
                                "latitud": latest_record['latitud'],
                                "longitud": latest_record['longitud'],
                                "message": f"¡ALERTA DE SABOTAJE! Corte de energía / Batería principal desconectada en vehículo {placa} ({sabotage_alert_info['bateria_ext']}V)"
                            }
                            await manager.broadcast_all(sabotage_msg)
                    
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
