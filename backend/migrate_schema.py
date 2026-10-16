from sqlalchemy import text
from app.db.database import engine

def run_migrations():
    with engine.begin() as conn:
        print("Starting migrations...")
        
        # 1. Update vehiculos table to add padron
        try:
            print("Adding padron to vehiculos...")
            conn.execute(text("ALTER TABLE vehiculos ADD COLUMN padron VARCHAR(10) NOT NULL DEFAULT 'S/N';"))
        except Exception as e:
            print(f"Skipped padron (might exist): {e}")

        # 2. Update usuarios.rol ENUM
        try:
            print("Updating usuarios rol ENUM...")
            conn.execute(text("ALTER TABLE usuarios MODIFY COLUMN rol ENUM('superadmin', 'admin', 'operador') NOT NULL;"))
        except Exception as e:
            print(f"Skipped usuarios rol: {e}")

        # 3. Update dispositivos.estado ENUM and migrate data
        try:
            print("Updating dispositivos estado ENUM...")
            # First change the enum definition to include instalado and asignado temporarily
            conn.execute(text("ALTER TABLE dispositivos MODIFY COLUMN estado ENUM('disponible', 'asignado', 'instalado', 'mantenimiento', 'baja') DEFAULT 'disponible';"))
            # Update existing rows
            conn.execute(text("UPDATE dispositivos SET estado = 'instalado' WHERE estado = 'asignado';"))
            # Finalize enum definition without asignado
            conn.execute(text("ALTER TABLE dispositivos MODIFY COLUMN estado ENUM('disponible', 'instalado', 'mantenimiento', 'baja') DEFAULT 'disponible';"))
        except Exception as e:
            print(f"Skipped dispositivos estado: {e}")

        print("Migrations complete.")

if __name__ == "__main__":
    run_migrations()
