from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. Chuỗi kết nối cấu hình PostgreSQL (Thay user, password và port máy bạn vào nếu khác)
# Cấu trúc: postgresql://[user]:[password]@[host]:[port]/[database_name]
DATABASE_URL = "postgresql://postgres:123@localhost:5432/epl_db"

# 2. Khởi tạo Engine kết nối
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True  # Tự động kiểm tra và hồi phục kết nối nếu DB bị ngắt giữa chừng
)

# 3. Tạo xưởng sản xuất Session để các API gọi vào tương tác với dữ liệu
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Lớp nền tảng (Base) để các Models bảng DB kế thừa ở bước sau
Base = declarative_base()

# 5. Hàm dependency cung cấp session cho các Router API, tự đóng kết nối sau khi dùng xong
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
