import sys
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db import models
from app.core.security import get_password_hash

def reset_passwords():
    db = SessionLocal()
    users = db.query(models.Usuario).all()
    for user in users:
        print(f"Updating password for {user.email}")
        user.password_hash = get_password_hash("admin123")
    db.commit()
    db.close()
    print("Contraseñas actualizadas a 'admin123'")

if __name__ == "__main__":
    reset_passwords()
