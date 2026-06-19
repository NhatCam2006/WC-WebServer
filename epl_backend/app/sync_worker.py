import asyncio
from datetime import datetime, timezone, timedelta
from app.database import SessionLocal
from app import models, services

# Các biến toàn cục để lưu trạng thái đồng bộ
last_synced_time = None
is_syncing = False

async def adaptive_sync_worker():
    global last_synced_time, is_syncing
    print("====== EPL LIVE SCORE ADAPTIVE BACKGROUND SYNC WORKER STARTED ======")
    
    # Đợi 5 giây đầu sau khi khởi động server để ứng dụng khởi tạo hoàn tất
    await asyncio.sleep(5)
    
    while True:
        db = SessionLocal()
        interval = 1800  # Mặc định nghỉ 30 phút (1800 giây)
        try:
            is_syncing = True
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Khởi động đồng bộ tự động dữ liệu EPL ngầm...")
            
            # Thực thi đồng bộ các bảng dữ liệu từ API football-data.org v4
            success_matches = services.sync_matches_data(db)
            success_standings = services.sync_standings_data(db)
            success_scorers = services.sync_scorers_data(db)
            
            if success_matches and success_standings and success_scorers:
                last_synced_time = datetime.now(timezone.utc)
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Đồng bộ thành công lịch thi đấu, BXH và Vua phá lưới! ✅")
                
                # Ghi nhận Nhật ký Hoạt động Hệ thống
                try:
                    new_log = models.SystemActivityLog(
                        activity_type="sync",
                        actor_email="System",
                        description="Hệ thống đồng bộ ngầm thành công Lịch thi đấu, Bảng xếp hạng và Vua phá lưới từ API Football-Data.org."
                    )
                    db.add(new_log)
                    db.commit()
                except Exception as ex:
                    print(f"Failed to log sync activity: {ex}")
                    db.rollback()
            else:
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Một hoặc nhiều tác vụ đồng bộ thất bại (API Rate Limit hoặc lỗi kết nối). ⚠️")
            
            # Quét DB để xác định xem có trận nào đang đá hoặc sắp diễn ra trong 2 giờ tới hay không
            now_utc = datetime.now(timezone.utc)
            two_hours_later = now_utc + timedelta(hours=2)
            
            live_count = db.query(models.Match).filter(
                models.Match.status.in_(["IN_PLAY", "LIVE", "PAUSED"])
            ).count()
            
            upcoming_soon = db.query(models.Match).filter(
                models.Match.status.in_(["SCHEDULED", "TIMED"]),
                models.Match.utc_date >= now_utc,
                models.Match.utc_date <= two_hours_later
            ).count()
            
            is_live_phase = (live_count > 0 or upcoming_soon > 0)
            
            if is_live_phase:
                interval = 60  # Đồng bộ dồn dập mỗi 60 giây khi có trận trực tiếp
                print(f"-> ⚽ Đang trong thời gian thi đấu (Live: {live_count}, Sắp đá: {upcoming_soon}). Chu kỳ đồng bộ: {interval}s.")
            else:
                interval = 1800  # Đồng bộ thưa 30 phút trong thời gian tĩnh để tiết kiệm API Limit
                print(f"-> 💤 Thời gian tĩnh không có trận đấu diễn ra. Chu kỳ đồng bộ tiếp theo sau 30 phút để tránh lỗi 429.")
                
        except Exception as e:
            print("====== LỖI TRONG BACKGROUND SYNC WORKER ======")
            import traceback
            traceback.print_exc()
            print("==============================================")
        finally:
            is_syncing = False
            db.close()
            
        await asyncio.sleep(interval)
