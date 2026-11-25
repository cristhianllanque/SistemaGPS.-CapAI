import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import BigInteger, create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker

from app.api import dispositivos, particulares, reportes, vehiculos
from app.db import models, schemas
from app.services import tcp_listener


@compiles(BigInteger, "sqlite")
def compile_autoincrement_id(*_args, **_kwargs):
    return "INTEGER"


class TestFleetLifecycle(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite+pysqlite:///:memory:")
        self.addCleanup(engine.dispose)
        models.Base.metadata.create_all(engine)
        session = sessionmaker(bind=engine)
        self.db = session()
        self.addCleanup(self.db.close)
        tcp = patch.object(tcp_listener, "SessionLocal", session)
        tcp.start()
        self.addCleanup(tcp.stop)

        self.origin = models.Empresa(nombre="Flota", slug="flota")
        self.destination = models.Empresa(nombre="Particular", slug="particular", tipo="particular")
        self.first = models.Vehiculo(empresa=self.origin, placa="TST-001")
        self.second = models.Vehiculo(empresa=self.destination, placa="TST-002")
        self.device = models.Dispositivo(imei="100000000000001", numero_serie="PRUEBA", modelo="FMC130")
        self.db.add_all([self.first, self.second, self.device])
        self.db.commit()
        self.admin = models.Usuario(rol="superadmin")
        self.imei = self.device.imei
        self.device_id = self.device.id

    def link(self, vehicle):
        vehiculos.vincular_vehiculo(
            vehicle.id, schemas.VehiculoVincular(dispositivo_id=self.device_id), self.db, self.admin,
        )

    def record(self, timestamp, satellites=9, longitude=-70.0, latitude=-15.8):
        return {
            "timestamp": timestamp, "latitude": latitude, "longitude": longitude,
            "satellites": satellites, "speed": 0, "ignicion": False,
        }

    def test_connected_device_tracks_current_assignment_and_keeps_old_history(self):
        device_id, _ = tcp_listener.verify_imei_in_db(self.imei)
        self.assertIsNone(tcp_listener.save_records_to_db(
            device_id, self.imei, [self.record(datetime.utcnow())],
        )["vehiculo_id"])

        self.link(self.first)
        placed = self.record(self.first.gps_asignado_at + timedelta(milliseconds=10))
        first = tcp_listener.save_records_to_db(device_id, self.imei, [placed])
        self.assertEqual(first["vehiculo_id"], self.first.id)
        with self.assertRaises(HTTPException) as occupied:
            self.link(self.second)
        self.assertEqual(occupied.exception.status_code, 409)
        self.db.rollback()

        vehiculos.desvincular_dispositivo(self.first.id, self.db, self.admin)
        stock = dispositivos.list_dispositivos_disponibles(self.destination.id, self.db, self.admin)
        self.assertIn(device_id, [d.id for d in stock])
        self.link(self.second)
        current = self.record(self.second.gps_asignado_at + timedelta(seconds=1))
        outdated = self.record(self.second.gps_asignado_at - timedelta(hours=1))
        moved = tcp_listener.save_records_to_db(device_id, self.imei, [current, outdated])
        self.assertEqual(moved["empresa_id"], self.destination.id)
        self.assertEqual(moved["vehiculo_id"], self.second.id)
        self.assertEqual(self.db.query(models.LecturaGPS).filter_by(vehiculo_id=self.first.id).count(), 1)
        self.assertEqual(self.db.query(models.LecturaGPS).filter_by(vehiculo_id=self.second.id).count(), 1)

    def test_fleet_keeps_latest_valid_position_despite_null_fields_and_no_fix(self):
        self.link(self.first)
        now = datetime.utcnow()
        latest = models.LecturaGPS(
            vehiculo_id=self.first.id, latitud=-15.8, longitud=-70, timestamp=now,
        )
        self.db.add(latest)
        self.db.flush()
        self.db.add_all([
            models.LecturaGPS(vehiculo_id=self.first.id, latitud=-10, longitud=-72, timestamp=now - timedelta(hours=1)),
            models.LecturaGPS(vehiculo_id=self.first.id, latitud=0, longitud=0, timestamp=now + timedelta(seconds=1)),
        ])
        self.db.commit()

        no_fix = self.record(now + timedelta(seconds=1), satellites=0, longitude=0, latitude=0)
        update = tcp_listener.save_records_to_db(self.device_id, self.imei, [no_fix])
        self.assertIsNone(update["lectura"]["latitud"])
        self.assertEqual(self.db.query(models.LecturaGPS).count(), 3)
        fleet = vehiculos.list_vehiculos(None, None, None, self.db, self.admin)
        by_plate = {vehicle.placa: vehicle for vehicle in fleet}
        self.assertEqual(by_plate[self.first.placa].ultima_lectura.latitud, -15.8)
        self.assertEqual(by_plate[self.first.placa].ultima_lectura.velocidad, 0)
        self.assertIsNone(by_plate[self.second.placa].ultima_lectura)

    def test_individual_archive_requires_unlink_and_preserves_history_and_account(self):
        self.link(self.second)
        with self.assertRaises(HTTPException) as linked:
            vehiculos.delete_vehiculo(self.second.id, self.db, self.admin)
        self.assertEqual(linked.exception.status_code, 409)
        self.db.rollback()
        report = self.record(self.second.gps_asignado_at + timedelta(seconds=1))
        tcp_listener.save_records_to_db(self.device_id, self.imei, [report])
        vehiculos.desvincular_dispositivo(self.second.id, self.db, self.admin)
        vehiculos.delete_vehiculo(self.second.id, self.db, self.admin)
        self.assertTrue(self.destination.activo)
        self.assertEqual(self.db.query(models.LecturaGPS).filter_by(vehiculo_id=self.second.id).count(), 1)
        card = particulares.list_clientes_particulares(inactivos=False, db=self.db, current_user=self.admin)[0]
        self.assertEqual(card["vehiculos"], [])
        self.assertIsNone(card["vehiculo"])
        now = datetime.utcnow()
        start = (now - timedelta(hours=1)).isoformat() + "Z"
        end = (now + timedelta(hours=1)).isoformat() + "Z"
        history = vehiculos.get_historial(self.second.id, start, end, self.db, self.admin)
        self.assertEqual(len(history["coordenadas"]), 1)
        consolidated = reportes.get_reporte_consolidado(start, end, "json", None, self.db, self.admin)
        self.assertIn(self.second.placa, [row["Placa"] for row in consolidated["data"]])

        archived = vehiculos.list_vehiculos(None, None, None, self.db, self.admin, archivados=True)
        self.assertEqual([v.id for v in archived], [self.second.id])
        vehiculos.restore_vehiculo(self.second.id, self.db, self.admin)
        self.assertTrue(self.second.activo)
        self.assertIsNone(self.second.dispositivo_id)

    def test_new_imei_requires_model_and_preserves_registered_hardware(self):
        payload = schemas.ParticularVehiculoCreate(placa="TST-003", imei="100000000000002")
        with self.assertRaises(HTTPException) as missing:
            particulares.add_vehiculo_particular(self.destination.id, payload, self.db, self.admin)
        self.assertEqual(missing.exception.status_code, 400)
        payload.modelo_gps = "FMC920"
        particulares.add_vehiculo_particular(self.destination.id, payload, self.db, self.admin)
        device = self.db.query(models.Dispositivo).filter_by(imei=payload.imei).one()
        self.assertEqual(device.modelo, "FMC920")

    def test_panic_input_respects_device_model(self):
        self.link(self.first)
        data = self.record(self.first.gps_asignado_at + timedelta(seconds=1))
        data["boton_panico_ain1"] = True
        result = tcp_listener.save_records_to_db(self.device_id, self.imei, [data])
        self.assertIsNone(result["panic_alert_id"])
        self.device.modelo = "FMC920"
        self.db.commit()
        result = tcp_listener.save_records_to_db(self.device_id, self.imei, [data])
        self.assertIsNotNone(result["panic_alert_id"])
