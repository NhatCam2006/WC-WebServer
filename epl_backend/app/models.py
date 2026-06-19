from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# 1. Model Giải đấu (Bảng competitions)
class Competition(Base):
    __tablename__ = "competitions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(10), nullable=False)
    emblem_url = Column(Text, nullable=True)

    # Thiết lập mối quan hệ liên kết bảng
    matches = relationship("Match", back_populates="competition", cascade="all, delete-orphan")
    standings = relationship("Standing", back_populates="competition", cascade="all, delete-orphan")


# 2. Model Đội bóng (Bảng teams)
class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    short_name = Column(String(100), nullable=True)
    tla = Column(String(10), nullable=True)
    crest_url = Column(Text, nullable=True)
    founded = Column(Integer, nullable=True)
    club_colors = Column(String(100), nullable=True)
    venue = Column(String(255), nullable=True)
    coach_name = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    
    # Sử dụng TIMESTAMP chuẩn viết hoa để lưu mốc thời gian cập nhật thông tin đội bóng
    last_updated = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Liên kết tới bảng Cầu thủ (1 Đội có nhiều Cầu thủ)
    players = relationship("Player", back_populates="team", cascade="all, delete-orphan")


# 3. Model Cầu thủ / Thành viên (Bảng players)
class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    position = Column(String(50), nullable=True)
    shirt_number = Column(Integer, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    nationality = Column(String(100), nullable=True)
    
    # Mốc thời gian cập nhật thông tin cầu thủ
    last_updated = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Khai báo liên kết ngược lại bảng Đội bóng
    team = relationship("Team", back_populates="players")


# 4. Model Bảng xếp hạng (Bảng standings)
class Standing(Base):
    __tablename__ = "standings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    competition_id = Column(Integer, ForeignKey("competitions.id", ondelete="CASCADE"))
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"))
    position = Column(Integer, nullable=False)
    played_games = Column(Integer, default=0)
    won = Column(Integer, default=0)
    draw = Column(Integer, default=0)
    lost = Column(Integer, default=0)
    points = Column(Integer, default=0)
    goals_for = Column(Integer, default=0)
    goals_against = Column(Integer, default=0)
    goal_difference = Column(Integer, default=0)
    form = Column(String(50), nullable=True)
    group = Column(String(50), nullable=True)
    
    # Mốc thời gian cập nhật vị trí bảng xếp hạng
    last_updated = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    competition = relationship("Competition", back_populates="standings")


# 5. Model Lịch thi đấu & Tỷ số (Bảng matches)
class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    competition_id = Column(Integer, ForeignKey("competitions.id", ondelete="CASCADE"))
    season_year = Column(Integer, nullable=True)
    home_team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"))
    away_team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"))
    
    # Ngày giờ diễn ra trận đấu bắt buộc phải có Múi giờ quốc tế (Timezone)
    utc_date = Column(TIMESTAMP(timezone=True), nullable=False)
    status = Column(String(50), nullable=True)
    matchday = Column(Integer, nullable=True)
    stage = Column(String(50), nullable=True)
    group = Column(String(50), nullable=True)
    
    score_half_time_home = Column(Integer, default=0)
    score_half_time_away = Column(Integer, default=0)
    score_full_time_home = Column(Integer, default=0)
    score_full_time_away = Column(Integer, default=0)
    
    # Kết quả phân tích AI để cache, tránh truy vấn API lặp lại
    ai_analysis = Column(Text, nullable=True)
    
    # Mốc thời gian biến động tỉ số trận đấu trực tiếp
    last_updated = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    competition = relationship("Competition", back_populates="matches")


# 6. Model Vua phá lưới (Bảng scorers)
class Scorer(Base):
    __tablename__ = "scorers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    player_id = Column(Integer, nullable=True)
    player_name = Column(String(255), nullable=False)
    player_nationality = Column(String(100), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    competition_id = Column(Integer, ForeignKey("competitions.id", ondelete="CASCADE"))
    season_year = Column(Integer, nullable=True)
    goals = Column(Integer, default=0)
    assists = Column(Integer, nullable=True)
    penalties = Column(Integer, nullable=True)
    played_matches = Column(Integer, nullable=True)

    team = relationship("Team")
    last_updated = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


# 7. Model Người dùng (Bảng users)
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    fullname = Column(String(255), nullable=True)
    role = Column(String(50), default="user")  # 'admin' hoặc 'user'
    favorite_team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    favorite_team = relationship("Team")


# 8. Model Cấu hình Hệ thống (Bảng system_configs)
class SystemConfig(Base):
    __tablename__ = "system_configs"

    key = Column(String(255), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(500), nullable=True)
    category = Column(String(100), default="general")
    last_updated = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


# 9. Model Nhật ký Hoạt động Hệ thống (Bảng system_activity_logs)
class SystemActivityLog(Base):
    __tablename__ = "system_activity_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    activity_type = Column(String(100), nullable=False)  # 'auth', 'config', 'sync'
    actor_email = Column(String(255), nullable=True)      # Email of admin/user or 'System'
    description = Column(Text, nullable=False)
    timestamp = Column(TIMESTAMP(timezone=True), server_default=func.now())

