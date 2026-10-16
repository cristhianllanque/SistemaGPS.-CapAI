import time
import random
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db import models
from app.websockets.manager import manager

# Simulated routes (Lat, Lng bounds around Juliaca/Puno)
# Juliaca approx: -15.496, -70.133
routes = [
    {"lat_start": -15.496, "lng_start": -70.133, "lat_step": 0.0001, "lng_step": 0.0001},
    {"lat_start": -15.500, "lng_start": -70.130, "lat_step": -0.0001, "lng_step": 0.0002},
    {"lat_start": -15.828, "lng_start": -70.021, "lat_step": 0.0002, "lng_step": -0.0001}, # Puno
    {"lat_start": -15.480, "lng_start": -70.120, "lat_step": 0.0001, "lng_step": -0.0001},
    {"lat_start": -15.840, "lng_start": -70.030, "lat_step": -0.0001, "lng_step": -0.0002},
    {"lat_start": -15.510, "lng_start": -70.150, "lat_step": -0.0002, "lng_step": 0.0001},
]

async def simulate_gps():
    db = SessionLocal()
    vehiculos = db.query(models.Vehiculo).all()
    if not vehiculos:
        print("No hay vehículos en la BD")
        db.close()
        return

    # Initialize current positions
    positions = []
    for i, v in enumerate(vehiculos):
        r = routes[i % len(routes)]
        positions.append({
            "vehiculo": v,
            "lat": r["lat_start"],
            "lng": r["lng_start"],
            "lat_step": r["lat_step"],
            "lng_step": r["lng_step"]
        })

    print("Iniciando simulación de GPS...")
    contador = 0
    
    while True:
        contador += 1
        for p in positions:
            # Update position
            p["lat"] += p["lat_step"] + random.uniform(-0.00005, 0.00005)
            p["lng"] += p["lng_step"] + random.uniform(-0.00005, 0.00005)
            
            velocidad = random.randint(20, 80)
            ignicion = True
            
            # Simulate stops
            if random.random() < 0.1:
                velocidad = 0
                ignicion = random.random() > 0.5
            
            # Simulate panic button every ~40 seconds (approx 13 iterations of 3 seconds)
            # Make it random but roughly every 40s per vehicle is too often. Let's say globally every 40s.
            boton_panico = False
            if contador % 13 == 0 and random.random() < 0.2:
                boton_panico = True

            # Save to DB
            lectura = models.LecturaGPS(
                vehiculo_id=p["vehiculo"].id,
                latitud=p["lat"],
                longitud=p["lng"],
                velocidad=velocidad,
                ignicion=ignicion,
                boton_panico=boton_panico,
                timestamp=datetime.utcnow()
            )
            db.add(lectura)
            db.commit()
            db.refresh(lectura)

            if boton_panico:
                alerta = models.AlertaPanico(
                    vehiculo_id=p["vehiculo"].id,
                    latitud=p["lat"],
                    longitud=p["lng"],
                    estado='pendiente',
                    fecha_hora=datetime.utcnow()
                )
                db.add(alerta)
                db.commit()
                db.refresh(alerta)
                alerta_msg = {
                    "type": "alerta_panico",
                    "alerta_id": alerta.id,
                    "vehiculo_id": p["vehiculo"].id,
                    "placa": p["vehiculo"].placa,
                    "latitud": p["lat"],
                    "longitud": p["lng"],
                    "fecha_hora": alerta.fecha_hora.isoformat()
                }
                # Emit panic alert to company WS
                asyncio.create_task(manager.broadcast_to_empresa(p["vehiculo"].empresa_id, alerta_msg))

            # Emit GPS reading to company WS
            msg = {
                "type": "telemetria",
                "vehiculo_id": p["vehiculo"].id,
                "latitud": p["lat"],
                "longitud": p["lng"],
                "velocidad": velocidad,
                "ignicion": ignicion,
                "boton_panico": boton_panico,
                "timestamp": lectura.timestamp.isoformat()
            }
            asyncio.create_task(manager.broadcast_to_empresa(p["vehiculo"].empresa_id, msg))

        await asyncio.sleep(3)

if __name__ == "__main__":
    asyncio.run(simulate_gps())
