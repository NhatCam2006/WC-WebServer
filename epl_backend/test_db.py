import sys
from sqlalchemy import create_engine

# Import DATABASE_URL from your app config
sys.path.append('.')
try:
    from app.database import DATABASE_URL
    print(f"Connecting to database with URL: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    connection = engine.connect()
    print("SUCCESS: Connected to PostgreSQL database successfully!")
    connection.close()
except Exception as e:
    print(f"FAILED: Could not connect to database.")
    print(f"Error Details: {e}")
