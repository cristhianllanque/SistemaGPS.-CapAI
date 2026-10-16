from app.db.database import SessionLocal
from app.db import models
from app.core.security import get_password_hash

def ensure_superadmin():
    db = SessionLocal()
    try:
        superadmin = db.query(models.Usuario).filter(models.Usuario.rol == 'superadmin').first()
        if not superadmin:
            print("Creating superadmin user...")
            superadmin = models.Usuario(
                nombre="Administrador General Copay",
                email="admin@copay.pe",
                password_hash=get_password_hash("admin123"),
                rol="superadmin",
                empresa_id=1,  # Default association or platform
                activo=True
            )
            db.add(superadmin)
            db.commit()
            print("Superadmin created: admin@copay.pe / admin123")
        else:
            print(f"Superadmin already exists: {superadmin.email} (ID: {superadmin.id})")
    finally:
        db.close()

if __name__ == "__main__":
    ensure_superadmin()
