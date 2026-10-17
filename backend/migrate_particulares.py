from app.db.database import engine
from sqlalchemy import text, inspect

def run_migration():
    inspector = inspect(engine)
    cols = [c['name'] for c in inspector.get_columns('empresas')]
    print("Columnas actuales en 'empresas':", cols)
    
    with engine.connect() as conn:
        if 'tipo' not in cols:
            conn.execute(text("ALTER TABLE empresas ADD COLUMN tipo VARCHAR(20) DEFAULT 'flota'"))
            print("Columna 'tipo' añadida exitosamente.")
        else:
            print("Columna 'tipo' ya existe.")
            
        if 'documento' not in cols:
            conn.execute(text("ALTER TABLE empresas ADD COLUMN documento VARCHAR(20) NULL"))
            print("Columna 'documento' añadida exitosamente.")
        else:
            print("Columna 'documento' ya existe.")
            
        if 'telefono' not in cols:
            conn.execute(text("ALTER TABLE empresas ADD COLUMN telefono VARCHAR(50) NULL"))
            print("Columna 'telefono' añadida exitosamente.")
        else:
            print("Columna 'telefono' ya existe.")
            
        # Ensure all existing empresas have tipo = 'flota'
        conn.execute(text("UPDATE empresas SET tipo = 'flota' WHERE tipo IS NULL OR tipo = ''"))
        conn.commit()
    print("¡Migración para Particulares completada!")

if __name__ == "__main__":
    run_migration()
