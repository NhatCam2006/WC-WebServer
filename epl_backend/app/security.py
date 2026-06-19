import hashlib
import jwt
from datetime import datetime, timezone, timedelta

# Cấu hình JWT mật mã hóa
SECRET_KEY = "EPL_LIVE_SCORE_SECRET_KEY_SUPER_SECURE_123"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # Token có hiệu lực trong 24 giờ (tiện lợi cho đồ án cả web & mobile)

def hash_password(password: str) -> str:
    """Mã hóa mật khẩu bằng thuật toán PBKDF2-SHA256 bản địa cực kỳ bảo mật."""
    salt = b"epl_live_score_secure_salt_value_987"
    # PBKDF2 với 100,000 vòng lặp (Độ an toàn đạt chuẩn công nghiệp)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return hashed.hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kiểm tra đối chiếu mật khẩu người dùng gõ vào với mã băm trong DB."""
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Sinh chuỗi JWT Access Token chứa thông tin phân quyền định danh."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict | None:
    """Giải mã JWT token và xác minh tính hợp lệ."""
    try:
        decoded_token = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return decoded_token
    except Exception:
        return None
