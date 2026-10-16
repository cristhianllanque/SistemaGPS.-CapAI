from sqlalchemy import text
from app.db.database import engine

def add_performance_indexes():
    with engine.begin() as conn:
        print("Checking performance indexes...")
        
        # 1. Composite index for LecturaGPS (vehiculo_id, timestamp)
        try:
            conn.execute(text("CREATE INDEX ix_lecturas_vehiculo_timestamp ON lecturas_gps (vehiculo_id, timestamp);"))
            print("Successfully created ix_lecturas_vehiculo_timestamp on lecturas_gps")
        except Exception as e:
            print(f"Index ix_lecturas_vehiculo_timestamp notice: {e}")

        # 2. Composite index for AlertaPanico (vehiculo_id, estado)
        try:
            conn.execute(text("CREATE INDEX ix_alertas_vehiculo_estado ON alertas_panico (vehiculo_id, estado);"))
            print("Successfully created ix_alertas_vehiculo_estado on alertas_panico")
        except Exception as e:
            print(f"Index ix_alertas_vehiculo_estado notice: {e}")

        print("Index migration finished.")

if __name__ == "__main__":
    add_performance_indexes()
