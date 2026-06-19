import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from sqlalchemy import text
from app.database import engine, Base
from app import models

def recreate_database():
    print("=== STARTING DATABASE RESET FOR WORLD CUP 2026 ===")
    
    # Drop all tables using raw SQL CASCADE to handle foreign key dependencies in PostgreSQL
    with engine.connect() as conn:
        try:
            print("Dropping existing tables with CASCADE...")
            tables = ["scorers", "standings", "matches", "players", "users", "system_configs", "system_activity_logs", "competitions", "teams"]
            for table in tables:
                conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE;"))
            conn.commit()
            print("[OK] Successfully dropped all tables.")
        except Exception as e:
            conn.rollback()
            print(f"[ERROR] Failed to drop tables: {e}")
            sys.exit(1)
            
    # Create all tables using SQLAlchemy metadata
    try:
        print("Creating new tables based on updated models...")
        Base.metadata.create_all(bind=engine)
        print("[OK] Successfully created all tables.")
    except Exception as e:
        print(f"[ERROR] Failed to create tables: {e}")
        sys.exit(1)
        
    # Seed default system configs and activities
    print("Seeding initial configs and activities...")
    try:
        # Import main to trigger seeding functions
        from app.main import seed_system_configs, seed_initial_activities
        seed_system_configs()
        seed_initial_activities()
        print("[OK] Seeding completed.")
    except Exception as e:
        print(f"[WARNING] Seeding failed or partially completed: {e}")

    print("=== DATABASE RESET COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    recreate_database()
