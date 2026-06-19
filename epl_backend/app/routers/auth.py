from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import os
from app import models, security
from app.database import get_db
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/auth", tags=["Authentication & Role-Based Authorization"])

security_scheme = HTTPBearer()

def log_activity(db: Session, activity_type: str, actor_email: Optional[str], description: str):
    try:
        new_log = models.SystemActivityLog(
            activity_type=activity_type,
            actor_email=actor_email,
            description=description
        )
        db.add(new_log)
        db.commit()
    except Exception as e:
        print(f"Failed to write activity log: {e}")
        db.rollback()


# --- Pydantic Schemas ---
class UserRegister(BaseModel):
    email: str
    password: str
    fullname: Optional[str] = None
    favorite_team_id: Optional[int] = None

class UserLogin(BaseModel):
    email: str
    password: str

# --- Dependency check to get current user from JWT ---
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = security.decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã hết hạn hoặc Token không hợp lệ. Vui lòng đăng nhập lại.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không có thông tin định danh.",
        )
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không tìm thấy thông tin tài khoản người dùng tương ứng.",
        )
    return user

# --- Dependency check to get current user only if they are Admin ---
def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có đặc quyền truy cập tính năng Quản trị viên (Admin only).",
        )
    return current_user

# --- Routes ---

@router.post("/register", summary="Đăng ký tài khoản mới")
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    email_clean = user_data.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="Định dạng Email không hợp lệ.")
    
    if len(user_data.password) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu phải có tối thiểu 6 ký tự.")
        
    existing = db.query(models.User).filter(models.User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được đăng ký sử dụng trong hệ thống trước đó."
        )
        
    hashed = security.hash_password(user_data.password)
    
    new_user = models.User(
        email=email_clean,
        hashed_password=hashed,
        fullname=user_data.fullname or email_clean.split("@")[0],
        role="user",  # Mặc định tất cả người dùng đăng ký đều có vai trò thường 'user'
        favorite_team_id=user_data.favorite_team_id
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Ghi nhận Nhật ký Hoạt động Hệ thống
        fav_team_name = ""
        if new_user.favorite_team_id:
            team_row = db.query(models.Team).filter(models.Team.id == new_user.favorite_team_id).first()
            if team_row:
                fav_team_name = f" và chọn CLB yêu thích {team_row.name}"
        
        log_activity(
            db=db,
            activity_type="auth",
            actor_email=new_user.email,
            description=f"Thành viên mới {new_user.fullname} ({new_user.email}) đăng ký thành công{fav_team_name}."
        )
        
        return {"status": "success", "message": "Chúc mừng! Đăng ký tài khoản mới thành công!", "user_id": new_user.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống khi khởi tạo tài khoản: {e}")

@router.post("/login", summary="Đăng nhập nhận Token JWT")
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    email_clean = login_data.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email_clean).first()
    
    if not user or not security.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Địa chỉ Email hoặc Mật khẩu không chính xác."
        )
        
    # Tạo Access Token JWT mã hóa chứa email và quyền hạn
    token = security.create_access_token({"sub": user.email, "role": user.role})
    
    # Ghi nhận Nhật ký Hoạt động Hệ thống
    log_activity(
        db=db,
        activity_type="auth",
        actor_email=user.email,
        description=f"Người dùng đăng nhập thành công với vai trò {user.role.upper()}."
    )
    
    fav_team = None
    if user.favorite_team_id:
        team_row = db.query(models.Team).filter(models.Team.id == user.favorite_team_id).first()
        if team_row:
            fav_team = {
                "id": team_row.id,
                "name": team_row.name,
                "crest_url": team_row.crest_url,
                "short_name": team_row.short_name
            }
            
    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "fullname": user.fullname,
            "role": user.role,
            "favorite_team": fav_team
        }
    }

@router.get("/me", summary="Lấy hồ sơ cá nhân hiện tại")
def get_me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    fav_team = None
    if current_user.favorite_team_id:
        team_row = db.query(models.Team).filter(models.Team.id == current_user.favorite_team_id).first()
        if team_row:
            fav_team = {
                "id": team_row.id,
                "name": team_row.name,
                "crest_url": team_row.crest_url,
                "short_name": team_row.short_name
            }
            
    return {
        "status": "success",
        "data": {
            "id": current_user.id,
            "email": current_user.email,
            "fullname": current_user.fullname,
            "role": current_user.role,
            "favorite_team": fav_team
        }
    }

@router.get("/admin/users", summary="[ADMIN] Danh sách tài khoản người dùng")
def get_all_users(admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    user_list = []
    for u in users:
        fav_team = None
        if u.favorite_team_id:
            t = db.query(models.Team).filter(models.Team.id == u.favorite_team_id).first()
            if t:
                fav_team = {"id": t.id, "name": t.name, "crest_url": t.crest_url}
        user_list.append({
            "id": u.id,
            "email": u.email,
            "fullname": u.fullname,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "favorite_team": fav_team
        })
    return {"status": "success", "count": len(user_list), "data": user_list}

@router.post("/admin/users/{user_id}/toggle-role", summary="[ADMIN] Đảo đặc quyền Admin/User")
def toggle_user_role(user_id: int, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cảnh cáo: Bạn không được phép tự hạ quyền của chính mình!")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng này trong hệ thống.")
        
    user.role = "admin" if user.role == "user" else "user"
    db.commit()
    db.refresh(user)
    
    # Ghi nhận Nhật ký Hoạt động Hệ thống
    log_activity(
        db=db,
        activity_type="auth",
        actor_email=admin.email,
        description=f"Thay đổi đặc quyền của tài khoản {user.email} thành {user.role.upper()} bởi Admin {admin.fullname or admin.email}."
    )
    
    return {
        "status": "success", 
        "message": f"Chuyển đổi phân quyền thành công! Vai trò mới của {user.email} là {user.role}.", 
        "user_id": user.id, 
        "new_role": user.role
    }


# --- Pydantic Schemas for Settings ---
class ConfigUpdateItem(BaseModel):
    key: str
    value: str

class ConfigUpdateList(BaseModel):
    configs: List[ConfigUpdateItem]


@router.get("/admin/configs", summary="[ADMIN] Lấy cấu hình hệ thống & AI")
def get_admin_configs(admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    configs = db.query(models.SystemConfig).order_by(models.SystemConfig.key).all()
    return {
        "status": "success",
        "data": [
            {
                "key": c.key,
                "value": c.value,
                "description": c.description,
                "category": c.category,
                "last_updated": c.last_updated.isoformat() if c.last_updated else None
            }
            for c in configs
        ]
    }


@router.post("/admin/configs", summary="[ADMIN] Cập nhật cấu hình hệ thống & AI")
def update_admin_configs(data: ConfigUpdateList, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    try:
        for item in data.configs:
            cfg = db.query(models.SystemConfig).filter(models.SystemConfig.key == item.key).first()
            if cfg:
                cfg.value = item.value
            else:
                new_cfg = models.SystemConfig(
                    key=item.key,
                    value=item.value,
                    description="Cấu hình được thêm bởi Quản trị viên.",
                    category="custom"
                )
                db.add(new_cfg)
        db.commit()
        
        # Ghi nhận Nhật ký Hoạt động Hệ thống
        keys_updated = ", ".join([item.key for item in data.configs])
        log_activity(
            db=db,
            activity_type="config",
            actor_email=admin.email,
            description=f"Cấu hình hệ thống [{keys_updated}] đã được cập nhật thành công bởi Admin {admin.fullname or admin.email}."
        )
        
        return {"status": "success", "message": "Đã lưu và áp dụng toàn bộ cấu hình mới thành công!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu cấu hình: {e}")


@router.get("/admin/stats", summary="[ADMIN] Báo cáo thống kê toàn hệ thống")
def get_admin_stats(admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    try:
        total_users = db.query(models.User).count()
        total_teams = db.query(models.Team).count()
        total_matches = db.query(models.Match).count()
        finished_matches = db.query(models.Match).filter(models.Match.status == "FINISHED").count()
        scheduled_matches = db.query(models.Match).filter(models.Match.status.in_(["SCHEDULED", "TIMED"])).count()
        live_matches = db.query(models.Match).filter(models.Match.status.in_(["IN_PLAY", "PAUSED", "LIVE"])).count()
        
        # Last sync time from DB if exists
        last_synced_row = db.query(models.Match.last_updated).order_by(models.Match.last_updated.desc()).first()
        last_synced = last_synced_row[0].isoformat() if last_synced_row and last_synced_row[0] else None
        
        # API check
        groq_key = os.getenv("GROQ_API_KEY", "")
        tavily_key = os.getenv("TAVILY_API_KEY", "")
        
        from app.services import API_TOKEN as fb_key
        
        # Check if keys are active in DB override
        db_groq = db.query(models.SystemConfig).filter(models.SystemConfig.key == "groq_api_key").first()
        if db_groq and db_groq.value.strip() != "":
            groq_key = db_groq.value.strip()
            
        db_tavily = db.query(models.SystemConfig).filter(models.SystemConfig.key == "tavily_api_key").first()
        if db_tavily and db_tavily.value.strip() != "":
            tavily_key = db_tavily.value.strip()
            
        return {
            "status": "success",
            "data": {
                "users": total_users,
                "teams": total_teams,
                "matches": total_matches,
                "finished_matches": finished_matches,
                "scheduled_matches": scheduled_matches,
                "live_matches": live_matches,
                "last_synced": last_synced,
                "groq_configured": groq_key != "" and "placeholder" not in groq_key,
                "tavily_configured": tavily_key != "" and "placeholder" not in tavily_key,
                "football_data_configured": fb_key != "" and "placeholder" not in fb_key
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tính toán chỉ số thống kê: {e}")


@router.get("/admin/activities", summary="[ADMIN] Lấy danh sách nhật ký hoạt động hệ thống")
def get_admin_activities(admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    try:
        logs = db.query(models.SystemActivityLog).order_by(models.SystemActivityLog.timestamp.desc()).limit(15).all()
        return {
            "status": "success",
            "data": [
                {
                    "id": l.id,
                    "activity_type": l.activity_type,
                    "actor_email": l.actor_email,
                    "description": l.description,
                    "timestamp": l.timestamp.isoformat() if l.timestamp else None
                }
                for l in logs
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tải nhật ký hoạt động: {e}")

