from sqlalchemy import text
from app.db.database import engine

def migrate():
    with engine.begin() as conn:
        try:
            # Check if columns exist first by trying a harmless query, if it fails they probably don't exist
            # Or just execute ALTER TABLE and catch the error if they already exist
            conn.execute(text("""
                ALTER TABLE alertas_panico
                MODIFY COLUMN estado ENUM('pendiente', 'atendida', 'falsa_alarma') DEFAULT 'pendiente',
                ADD COLUMN usuario_atendio_id INT NULL,
                ADD COLUMN observaciones_atencion TEXT NULL,
                ADD COLUMN fecha_atencion TIMESTAMP NULL;
            """))
            conn.execute(text("""
                ALTER TABLE alertas_panico
                ADD CONSTRAINT fk_alerta_usuario FOREIGN KEY (usuario_atendio_id) REFERENCES usuarios(id) ON DELETE SET NULL;
            """))
            print("Migration successful")
        except Exception as e:
            print(f"Migration error or already migrated: {e}")

if __name__ == '__main__':
    migrate()
