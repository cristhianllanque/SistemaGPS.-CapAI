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
        tcp_listener.LATEST_LIVE_TELEMETRY.clear()
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

    def test_vapid_keys_stored_outside_public_uploads_and_rotated_if_legacy_present(self):
        import json
        import os
        import tempfile
        from app.services import push_service

        self.assertFalse(push_service.VAPID_KEYS_FILE.replace("\\", "/").startswith("uploads/"))
        with tempfile.TemporaryDirectory() as tmpdir:
            legacy_file = os.path.join(tmpdir, "uploads", "vapid_keys.json")
            secret_file = os.path.join(tmpdir, ".secrets", "vapid_keys.json")
            os.makedirs(os.path.dirname(legacy_file), exist_ok=True)
            with open(legacy_file, "w", encoding="utf-8") as fh:
                json.dump({"public_key": "LEGACY_PUB", "private_key": "LEGACY_PRIV"}, fh)

            with patch.object(push_service, "LEGACY_PUBLIC_VAPID_KEYS_FILE", legacy_file), \
                 patch.object(push_service, "VAPID_KEYS_FILE", secret_file):
                keys = push_service.get_or_create_vapid_keys()
                self.assertFalse(os.path.exists(legacy_file))
                self.assertTrue(os.path.exists(secret_file))
                self.assertNotEqual(keys["private_key"], "LEGACY_PRIV")
                self.assertTrue(len(keys["public_key"]) > 20)

    def test_push_and_access_checks_enforce_live_account_and_company_isolation(self):
        from app.api.deps import is_user_access_allowed
        from app.services import push_service

        op_user = models.Usuario(
            nombre="Operador",
            email="op@flota.com",
            rol="operador",
            empresa=self.origin,
            password_hash="x",
            activo=True,
        )
        self.db.add(op_user)
        self.db.flush()
        sub = models.PushSubscription(
            usuario_id=op_user.id,
            empresa_id=self.origin.id,
            rol="operador",
            endpoint="https://push.example/1",
            p256dh="k1",
            auth="a1",
        )
        superadmin_user = models.Usuario(
            nombre="Superadmin",
            email="superadmin@copai.com",
            rol="superadmin",
            empresa=None,
            password_hash="x",
            activo=True,
        )
        peer_user = models.Usuario(
            nombre="Familiar 2",
            email="familiar2@flota.com",
            rol="operador",
            empresa=self.destination,
            password_hash="x",
            activo=True,
        )
        self.db.add_all([sub, superadmin_user, peer_user])
        self.db.flush()
        superadmin_sub = models.PushSubscription(
            usuario_id=superadmin_user.id,
            empresa_id=None,
            rol="superadmin",
            endpoint="https://push.example/superadmin-iphone",
            p256dh="ks",
            auth="as",
        )
        peer_sub = models.PushSubscription(
            usuario_id=peer_user.id,
            empresa_id=self.destination.id,
            rol="operador",
            endpoint="https://push.example/peer-2",
            p256dh="k2",
            auth="a2",
        )
        self.db.add_all([superadmin_sub, peer_sub])
        self.db.commit()

        # Reasignar usuario de origin a destination mientras su PushSubscription aún apuntaba a origin
        op_user.empresa_id = self.destination.id
        self.db.commit()

        from unittest.mock import MagicMock
        mocked_webpush = MagicMock()
        session_factory = sessionmaker(bind=self.db.get_bind())
        with patch.object(push_service, "SessionLocal", session_factory), \
             patch.object(push_service, "get_or_create_vapid_keys", return_value={"public_key": "P", "private_key": "K"}), \
             patch.object(push_service, "_get_webpush_client", return_value=(mocked_webpush, Exception)):
            # No debe recibir alertas de la empresa anterior (origin) ni filtrarse al iPhone del superadmin
            sent_old = push_service.send_web_push_sync(self.origin.id, "Alerta", "Test")
            self.assertEqual(sent_old, 0)
            mocked_webpush.assert_not_called()

            # Cuando un usuario toca la campanita (target_user_id + target_endpoint), SOLO llega a su teléfono
            # (ni al otro familiar de la misma cuenta ni al iPhone del superadmin)
            sent_bell_test = push_service.send_web_push_sync(
                self.destination.id,
                "🔔 Alertas COPAI GPS Activas",
                "Test campana",
                target_user_id=op_user.id,
                target_endpoint="https://push.example/1",
            )
            self.assertEqual(sent_bell_test, 1)

            # En una alerta vehicular real de destination, llega a los 2 usuarios de destination, pero NO al superadmin
            mocked_webpush.reset_mock()
            sent_new = push_service.send_web_push_sync(self.destination.id, "Alerta", "Test")
            self.assertEqual(sent_new, 2)

            # Si la empresa se suspende, se bloquea tanto el acceso como el envío de push
            self.destination.activo = False
            self.db.commit()
            self.db.refresh(op_user)
            self.assertFalse(is_user_access_allowed(op_user))
            sent_suspended = push_service.send_web_push_sync(self.destination.id, "Alerta", "Test")
            self.assertEqual(sent_suspended, 0)

    def test_engine_hours_caps_telemetry_gaps_and_separates_alert_types(self):
        now = datetime(2026, 11, 25, 10, 0, 0)
        # 5 min encendido continuo + un corte de señal de 10 horas + 5 min encendido continuo = 10 min (0.17 h)
        self.db.add_all([
            models.LecturaGPS(vehiculo_id=self.first.id, latitud=-15.8, longitud=-70.0, velocidad=20, ignicion=True, timestamp=now),
            models.LecturaGPS(vehiculo_id=self.first.id, latitud=-15.8, longitud=-70.0, velocidad=25, ignicion=True, timestamp=now + timedelta(minutes=5)),
            models.LecturaGPS(vehiculo_id=self.first.id, latitud=-15.8, longitud=-70.0, velocidad=20, ignicion=True, timestamp=now + timedelta(hours=10, minutes=5)),
            models.LecturaGPS(vehiculo_id=self.first.id, latitud=-15.8, longitud=-70.0, velocidad=0, ignicion=False, timestamp=now + timedelta(hours=10, minutes=10)),
            models.AlertaPanico(vehiculo_id=self.first.id, latitud=-15.8, longitud=-70.0, tipo="panico", fecha_hora=now + timedelta(minutes=1)),
            models.AlertaPanico(vehiculo_id=self.first.id, latitud=-15.8, longitud=-70.0, tipo="sabotaje", fecha_hora=now + timedelta(minutes=2)),
            models.AlertaPanico(vehiculo_id=self.first.id, latitud=-15.8, longitud=-70.0, tipo="exceso_velocidad", fecha_hora=now + timedelta(minutes=3)),
        ])
        self.db.commit()

        start = (now - timedelta(hours=1)).isoformat() + "Z"
        end = (now + timedelta(hours=12)).isoformat() + "Z"
        hist = vehiculos.get_historial(self.first.id, start, end, self.db, self.admin)
        self.assertEqual(hist["estadisticas"]["tiempo_encendido_minutos"], 10.0)

        rep = reportes.get_reporte_consolidado(start, end, "json", self.origin.id, self.db, self.admin)
        row = next(r for r in rep["data"] if r["Placa"] == self.first.placa)
        self.assertEqual(row["Horas Motor"], round(10.0 / 60.0, 2))
        self.assertEqual(row["Alertas Pánico"], 1)
        self.assertEqual(row["Alertas Sabotaje"], 1)
        self.assertEqual(row["Alertas Velocidad"], 1)
        self.assertEqual(row["Total Alertas"], 3)

    def test_particular_client_supports_up_to_three_family_users(self):
        from fastapi import BackgroundTasks

        titular = models.Usuario(
            nombre="Titular Particular",
            email="titular@particular.com",
            rol="admin",
            empresa=self.destination,
            password_hash="x",
            activo=True,
        )
        self.db.add(titular)
        self.db.commit()

        bg = BackgroundTasks()
        res2 = particulares.add_usuario_particular(
            self.destination.id,
            schemas.ParticularUsuarioCreate(nombre="Hijo", email="hijo@particular.com", password="1234"),
            bg,
            self.db,
            self.admin,
        )
        res3 = particulares.add_usuario_particular(
            self.destination.id,
            schemas.ParticularUsuarioCreate(nombre="Esposo", email="esposo@particular.com", password="1234"),
            bg,
            self.db,
            self.admin,
        )
        self.assertEqual(res2["usuario"]["email"], "hijo@particular.com")
        self.assertEqual(res3["usuario"]["email"], "esposo@particular.com")

        # Un 4to usuario debe ser rechazado (máximo 3 por cuenta particular)
        with self.assertRaises(HTTPException) as limit_err:
            particulares.add_usuario_particular(
                self.destination.id,
                schemas.ParticularUsuarioCreate(nombre="Cuarto", email="cuarto@particular.com", password="1234"),
                bg,
                self.db,
                self.admin,
            )
        self.assertEqual(limit_err.exception.status_code, 400)

        # El titular no puede ser eliminado como usuario adicional
        with self.assertRaises(HTTPException) as titular_err:
            particulares.delete_usuario_particular(self.destination.id, titular.id, self.db, self.admin)
        self.assertEqual(titular_err.exception.status_code, 400)

        # Eliminar a un usuario adicional (Esposo) libera 1 cupo quedando 2/3
        particulares.delete_usuario_particular(self.destination.id, res3["usuario"]["id"], self.db, self.admin)
        card = particulares.list_clientes_particulares(inactivos=False, db=self.db, current_user=self.admin)[0]
        self.assertEqual(card["total_usuarios"], 2)
        self.assertEqual(card["max_usuarios"], 3)
        self.assertTrue(card["usuarios"][0]["es_titular"])
        self.assertFalse(card["usuarios"][1]["es_titular"])
