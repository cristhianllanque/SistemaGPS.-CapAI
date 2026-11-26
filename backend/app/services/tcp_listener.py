import asyncio
import struct
import logging
from datetime import datetime, timedelta, timezone
from app.db.database import SessionLocal
from app.db import models
from app.services.teltonika_parser import TeltonikaCodec8Parser
from app.services.push_service import send_web_push_sync
from app.websockets.manager import manager

logger = logging.getLogger(__name__)

# Caché en memoria de la última telemetría recibida por (vehiculo_id, dispositivo_id),
# para reflejar ignición (Motor ON/OFF), voltajes, batería interna y alertas en tiempo real
# incluso cuando el GPS está bajo techo (0 satélites) sin pisar la última coordenada válida.
LATEST_LIVE_TELEMETRY = {}

async def run_in_thread(func, *args, **kwargs):
    return await asyncio.to_thread(func, *args, **kwargs)

def verify_imei_in_db(imei: str):
    with SessionLocal() as db:
        device = db.query(models.Dispositivo).filter_by(imei=imei, activo=True).with_for_update().first()
        if not device:
            return None
        device.ultima_conexion = datetime.utcnow()
        device_id, owner_id = device.id, device.empresa_id
        db.commit()
        return device_id, owner_id


def save_records_to_db(dispositivo_id: int, imei: str, records: list[dict]):
    received_lecturas = []
    panic_alert_id = None
    speed_alert_info = None
    sabotage_alert_info = None

    with SessionLocal() as db:
        device = db.query(models.Dispositivo).filter_by(
            id=dispositivo_id, imei=imei, activo=True,
        ).with_for_update().first()
        if not device:
            return None

        now_utc = datetime.utcnow()
        device.ultima_conexion = now_utc
        # A device lock coordinates assignment changes with writes from existing sockets.
        candidates = db.query(models.Vehiculo).filter_by(dispositivo_id=device.id, activo=True).limit(2).all()
        if len(candidates) != 1 or candidates[0].empresa_id != device.empresa_id:
            owner_id = device.empresa_id
            db.commit()
            return {"empresa_id": owner_id, "vehiculo_id": None, "lectura": None}

        vehiculo = candidates[0]
        vehiculo_id = vehiculo.id
        limite_velocidad = (vehiculo.empresa.limite_velocidad if vehiculo.empresa else None) or 90
        has_panic_button_enabled = device.tiene_boton_panico is not False
        is_5pin_920_model = (device.modelo or "").strip().upper() in {"FMC920", "FMB920"}
        for r in records:
            ts = r["timestamp"]
            if ts is not None and ts.tzinfo is not None:
                ts = ts.astimezone(timezone.utc).replace(tzinfo=None)
            # After a reassignment we cannot attribute records captured before it or
            # records whose device clock cannot establish which assignment owned them.
            if vehiculo.gps_asignado_at and (ts is None or ts < vehiculo.gps_asignado_at):
                continue
            if ts is None or ts.year < 2025:
                ts = now_utc

            bateria_ext_v = r.get('bateria_ext')
            bateria_int_v = r.get('bateria_int')
            bateria_pct = r.get('bateria_porcentaje')
            io_dict = r.get('io_dict', {})
            # En modelos de 5 pines (FMC920/FMB920) el SOS entra por AIN1 (AVL ID 9 >= 8000mV);
            # en modelos de 12 pines (FMC130/FMC150/FMC650) solo por DIN2 (AVL ID 2), dejando AIN1 libre para sensores.
            raw_panic = bool(r.get('boton_panico')) or (is_5pin_920_model and bool(r.get('boton_panico_ain1')))
            is_panic_triggered = raw_panic and has_panic_button_enabled

            posicion_valida = (
                r.get("satellites", 0) > 0
                and -90 <= r["latitude"] <= 90 and -180 <= r["longitude"] <= 180
                and (r["latitude"] != 0 or r["longitude"] != 0)
            )
            lectura = models.LecturaGPS(
                vehiculo_id=vehiculo_id,
                latitud=r['latitude'],
                longitud=r['longitude'],
                velocidad=r['speed'],
                ignicion=r['ignicion'],
                boton_panico=is_panic_triggered,
                bateria_ext=bateria_ext_v,
                bateria_int=bateria_int_v,
                bateria_porcentaje=bateria_pct,
                timestamp=ts
            )
            if posicion_valida:
                db.add(lectura)
            received_lecturas.append((lectura, posicion_valida))
            
            # 1. Panic button check (respeta si el dispositivo tiene habilitado botón de pánico)
            if is_panic_triggered:
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
            # external voltage drops to 0V (or < 6.0V), or Teltonika Unplug Detection (AVL ID 252) fires.
            ext_mv = io_dict.get(66)
            unplug_flag = bool(r.get('unplug_sabotaje')) or bool(io_dict.get(252))
            is_sabotaje = False
            if unplug_flag:
                is_sabotaje = True
                if bateria_ext_v is not None and bateria_ext_v >= 6.0:
                    bateria_ext_v = 0.0
                    lectura.bateria_ext = 0.0
            elif ext_mv is not None and ext_mv < 6000:
                is_sabotaje = True
            elif bateria_ext_v is not None and bateria_ext_v < 6.0:
                is_sabotaje = True

            if is_sabotaje:
                # Find most recent sabotage alert for this vehicle
                ultima_alerta_sab = db.query(models.AlertaPanico).filter(
                    models.AlertaPanico.vehiculo_id == vehiculo_id,
                    models.AlertaPanico.tipo == 'sabotaje'
                ).order_by(models.AlertaPanico.fecha_hora.desc()).first()

                # Check if normal vehicle power (> 9.0V) was restored after that alert
                prev_live = LATEST_LIVE_TELEMETRY.get((vehiculo_id, dispositivo_id)) or {}
                power_restored_since_last_alert = True
                if ultima_alerta_sab:
                    has_restored_note = "Energía restablecida" in (ultima_alerta_sab.observaciones_atencion or "")
                    has_live_restored = bool(prev_live.get("had_normal_power"))
                    reading_with_power = db.query(models.LecturaGPS.id).filter(
                        models.LecturaGPS.vehiculo_id == vehiculo_id,
                        models.LecturaGPS.timestamp > ultima_alerta_sab.fecha_hora,
                        models.LecturaGPS.bateria_ext >= 9.0
                    ).first()
                    if not (has_restored_note or has_live_restored or reading_with_power):
                        power_restored_since_last_alert = False

                ext_val = bateria_ext_v if bateria_ext_v is not None else 0.0
                int_val = bateria_int_v if bateria_int_v is not None else 0.0
                obs = f"Corte de batería principal / Sabotaje. Voltaje ext: {ext_val}V. Bat interna: {int_val}V."

                # Only trigger a brand new alert and modal siren if power was restored or this is the first disconnect
                if power_restored_since_last_alert:
                    if prev_live:
                        prev_live["had_normal_power"] = False
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
                    # Trigger siren & modal ONLY once on initial disconnect
                    sabotage_alert_info = {
                        "alerta_id": alerta_sab.id,
                        "bateria_ext": ext_val,
                        "bateria_int": int_val,
                        "bateria_porcentaje": bateria_pct
                    }
                else:
                    # Ongoing power cut: update location quietly if alert is still pending
                    if ultima_alerta_sab and ultima_alerta_sab.estado == 'pendiente':
                        ultima_alerta_sab.latitud = r['latitude']
                        ultima_alerta_sab.longitud = r['longitude']
                        ultima_alerta_sab.velocidad = curr_speed
                    # If it was marked as 'falsa_alarma' or 'atendida', respect operator resolution:
                    # do NOT reopen, do NOT re-trigger siren!
            elif bateria_ext_v is not None and bateria_ext_v >= 9.0:
                # Normal power restored: record note on most recent sabotage alert (even if already attended)
                prev_live = LATEST_LIVE_TELEMETRY.get((vehiculo_id, dispositivo_id))
                if prev_live is not None:
                    prev_live["had_normal_power"] = True
                ultima_alerta_sab = db.query(models.AlertaPanico).filter(
                    models.AlertaPanico.vehiculo_id == vehiculo_id,
                    models.AlertaPanico.tipo == 'sabotaje'
                ).order_by(models.AlertaPanico.fecha_hora.desc()).first()
                if ultima_alerta_sab and "Energía restablecida" not in (ultima_alerta_sab.observaciones_atencion or ""):
                    ts_peru = ts - timedelta(hours=5)
                    ultima_alerta_sab.observaciones_atencion = (
                        (ultima_alerta_sab.observaciones_atencion or "") +
                        f" | Energía restablecida ({bateria_ext_v}V a las {ts_peru.strftime('%H:%M:%S')} Hora Perú)"
                    ).strip(" | ")
                
        has_pending_sab = db.query(models.AlertaPanico.id).filter(
            models.AlertaPanico.vehiculo_id == vehiculo_id,
            models.AlertaPanico.estado == 'pendiente',
            models.AlertaPanico.tipo == 'sabotaje'
        ).first() is not None

        result = {
            "empresa_id": vehiculo.empresa_id,
            "vehiculo_id": vehiculo_id,
            "placa": vehiculo.placa,
            "conductor": vehiculo.conductor.nombre if vehiculo.conductor else "Sin conductor asignado",
            "limite_velocidad": limite_velocidad,
            "panic_alert_id": panic_alert_id,
            "speed_alert_info": speed_alert_info,
            "sabotage_alert_info": sabotage_alert_info,
            "lectura": None,
        }
        if received_lecturas:
            # Always use the chronologically newest record for live telemetry (ignition, voltages, speed),
            # while taking coordinates from the newest record in the batch that had a valid satellite fix.
            l = max(received_lecturas, key=lambda item: item[0].timestamp)[0]
            valid_pos_records = [item[0] for item in received_lecturas if item[1]]
            pos_lec = max(valid_pos_records, key=lambda item: item.timestamp) if valid_pos_records else None
            had_power_in_batch = any(
                (item[0].bateria_ext is not None and item[0].bateria_ext >= 9.0)
                for item in received_lecturas
            )
            prev_had_power = bool((LATEST_LIVE_TELEMETRY.get((vehiculo_id, dispositivo_id)) or {}).get("had_normal_power"))
            now_has_power = (l.bateria_ext is not None and l.bateria_ext >= 9.0) or (
                (had_power_in_batch or prev_had_power) and not (l.bateria_ext is not None and l.bateria_ext < 6.0)
            )
            result["lectura"] = {
                "latitud": pos_lec.latitud if pos_lec is not None else None,
                "longitud": pos_lec.longitud if pos_lec is not None else None,
                "velocidad": l.velocidad or 0,
                "ignicion": bool(l.ignicion),
                "boton_panico": bool(l.boton_panico),
                "bateria_ext": l.bateria_ext,
                "bateria_int": l.bateria_int,
                "bateria_porcentaje": l.bateria_porcentaje,
                "sabotaje": has_pending_sab and (l.bateria_ext is None or l.bateria_ext < 7.0),
                "online": abs((now_utc - l.timestamp).total_seconds()) <= 900,
                "timestamp": l.timestamp.isoformat() + 'Z',
            }
            LATEST_LIVE_TELEMETRY[(vehiculo_id, dispositivo_id)] = {
                "latitud": pos_lec.latitud if pos_lec is not None else None,
                "longitud": pos_lec.longitud if pos_lec is not None else None,
                "velocidad": l.velocidad or 0,
                "ignicion": bool(l.ignicion),
                "boton_panico": bool(l.boton_panico),
                "bateria_ext": l.bateria_ext,
                "bateria_int": l.bateria_int,
                "bateria_porcentaje": l.bateria_porcentaje,
                "timestamp_dt": l.timestamp,
                "had_normal_power": now_has_power,
            }
        db.commit()
        return result


async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    addr = writer.get_extra_info('peername')
    logger.info(f"New connection from {addr}")
    print(f"[TCP] Nueva conexión desde {addr}", flush=True)
    
    try:
        # 1. Read IMEI packet: <2 bytes length> <length bytes ASCII string>
        imei_header = await asyncio.wait_for(reader.readexactly(2), timeout=15)
        imei_len = struct.unpack('>H', imei_header)[0]
        if imei_len != 15:
            writer.write(b'\x00')
            await writer.drain()
            return
        imei_body = await asyncio.wait_for(reader.readexactly(imei_len), timeout=15)
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
            
        logger.info("IMEI %s autenticado", imei)
        writer.write(b'\x01')
        await writer.drain()
        
        dispositivo_id, owner_id = device_info
        manager.notify_sync(owner_id, {"type": "entity_updated", "entity": "dispositivos", "dispositivo_id": dispositivo_id})

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
                    
                    if not records:
                        writer.write(TeltonikaCodec8Parser.generate_ack(0))
                        await writer.drain()
                        continue

                    update = await run_in_thread(save_records_to_db, dispositivo_id, imei, records)
                    if update is None:
                        return
                    writer.write(TeltonikaCodec8Parser.generate_ack(len(records)))
                    await writer.drain()
                    empresa_id = update["empresa_id"]
                    vehiculo_id = update["vehiculo_id"]
                    latest_record = update["lectura"]
                    if vehiculo_id is None:
                        manager.notify_sync(empresa_id, {"type": "entity_updated", "entity": "dispositivos", "dispositivo_id": dispositivo_id})
                    if latest_record:
                        placa = update["placa"]
                        conductor = update["conductor"]
                        limite_velocidad = update["limite_velocidad"]
                        panic_alert_id = update["panic_alert_id"]
                        speed_alert_info = update["speed_alert_info"]
                        sabotage_alert_info = update["sabotage_alert_info"]
                        broadcast_msg = {
                            "type": "telemetria",
                            "vehiculo_id": vehiculo_id,
                            "dispositivo_id": dispositivo_id,
                            "placa": placa,
                            "conductor": conductor,
                            "limite_velocidad": limite_velocidad,
                            "data": latest_record
                        }
                        await manager.broadcast_flota(empresa_id, broadcast_msg)
                        
                        if panic_alert_id:
                            panic_msg = {
                                "type": "panic_alert",
                                "alerta_id": panic_alert_id,
                                "vehiculo_id": vehiculo_id,
                                "placa": placa,
                                "conductor": conductor,
                                "latitud": latest_record['latitud'],
                                "longitud": latest_record['longitud'],
                                "fecha_hora": latest_record['timestamp'],
                                "message": "¡Alerta de pánico recibida!"
                            }
                            await manager.broadcast_flota(empresa_id, panic_msg)
                            asyncio.create_task(
                                run_in_thread(
                                    send_web_push_sync,
                                    empresa_id,
                                    f"🆘 ¡EMERGENCIA: BOTÓN DE PÁNICO! ({placa})",
                                    f"🚨 SOS activado en unidad {placa} ({conductor}). ¡Toque para abrir y activar sirena!",
                                    "/monitoreo",
                                    f"copai-panic-{vehiculo_id}",
                                )
                            )

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
                                "fecha_hora": latest_record['timestamp'],
                                "message": f"¡Exceso de velocidad: {speed_alert_info['velocidad']} km/h! (Límite configurado: {speed_alert_info['limite']} km/h)"
                            }
                            await manager.broadcast_flota(empresa_id, speed_msg)
                            asyncio.create_task(
                                run_in_thread(
                                    send_web_push_sync,
                                    empresa_id,
                                    f"⚡ ¡EXCESO DE VELOCIDAD! ({placa})",
                                    f"⚠️ Unidad {placa} circula a {speed_alert_info['velocidad']} km/h (Límite: {speed_alert_info['limite']} km/h).",
                                    "/monitoreo",
                                    f"copai-speed-{vehiculo_id}",
                                )
                            )

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
                                "fecha_hora": latest_record['timestamp'],
                                "message": f"¡ALERTA DE SABOTAJE! Corte de energía / Batería principal desconectada en vehículo {placa} ({sabotage_alert_info['bateria_ext']}V)"
                            }
                            await manager.broadcast_flota(empresa_id, sabotage_msg)
                            asyncio.create_task(
                                run_in_thread(
                                    send_web_push_sync,
                                    empresa_id,
                                    f"🚨 ¡ALERTA DE SABOTAJE! ({placa})",
                                    f"⚠️ CORTE DE BATERÍA ({sabotage_alert_info['bateria_ext']}V) en unidad {placa}. ¡Toque para abrir y activar sirena!",
                                    "/monitoreo",
                                    f"copai-sabotage-{vehiculo_id}",
                                )
                            )
                    
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
    except (asyncio.IncompleteReadError, asyncio.TimeoutError):
        logger.debug("Sesión Teltonika sin handshake completo: %s", addr)
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
