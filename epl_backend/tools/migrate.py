"""
Script migration: Thêm cột shirt_number vào bảng players và tạo bảng scorers mới
Chạy lệnh: python tools/migrate.py
"""
import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from sqlalchemy import text
from app.database import engine
from app import models

def run_migration():
    print("=== CHẠY MIGRATION DATABASE ===")
    
    with engine.connect() as conn:
        # 1. Thêm cột shirt_number vào bảng players (nếu chưa có)
        try:
            conn.execute(text("ALTER TABLE players ADD COLUMN IF NOT EXISTS shirt_number INTEGER"))
            conn.commit()
            print("[OK] Đã thêm cột shirt_number vào bảng players")
        except Exception as e:
            print(f"[INFO] shirt_number: {e}")

    # 2. Tạo bảng scorers mới (nếu chưa có)
    try:
        models.Base.metadata.create_all(bind=engine)
        print("[OK] Đã tạo bảng scorers và các bảng còn thiếu")
    except Exception as e:
        print(f"[LỖI] Tạo bảng thất bại: {e}")

    print("=== MIGRATION HOÀN TẤT ===")

if __name__ == "__main__":
    run_migration()
