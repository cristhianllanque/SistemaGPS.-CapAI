from sqlalchemy import text
from app.db.database import engine

def run_migrations():
    with engine.begin() as conn:
        print("Starting migrations 2...")
        
        try:
            print("Adding iccid_sim to dispositivos...")
            conn.execute(text("ALTER TABLE dispositivos ADD COLUMN iccid_sim VARCHAR(20) NULL;"))
        except Exception as e:
            print(f"Skipped iccid_sim (might exist): {e}")

        print("Migrations complete.")

if __name__ == "__main__":
    run_migrations()
