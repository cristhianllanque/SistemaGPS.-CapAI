from app.db.database import SessionLocal
from app.db import models
from app.core.security import get_password_hash

SUPERADMINS = [
    {
        "nombre": "Cristhian Llanque (Superadmin)",
        "email": "cristhianllanque65@gmail.com",
        "password": "974342536_xD",
    },
    {
        "nombre": "Industrias Copai Central",
        "email": "industriascopai@gmail.com",
        "password": "050421_Edy",
    }
]

def ensure_superadmins():
    db = SessionLocal()
    try:
        for sa in SUPERADMINS:
            user = db.query(models.Usuario).filter(models.Usuario.email == sa["email"]).first()
            if not user:
                user = models.Usuario(
                    nombre=sa["nombre"],
                    email=sa["email"],
                    password_hash=get_password_hash(sa["password"]),
                    rol="superadmin",
                    empresa_id=None,
                    activo=True
                )
                db.add(user)
                db.commit()
                print(f"[OK] Superadmin creado: {sa['email']}")
            else:
                user.rol = "superadmin"
                user.password_hash = get_password_hash(sa["password"])
                user.activo = True
                user.empresa_id = None
                db.commit()
                print(f"[OK] Superadmin actualizado y sincronizado: {sa['email']}")
    finally:
        db.close()

if __name__ == "__main__":
    ensure_superadmins()
