import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app import models  # Bắt buộc import để SQLAlchemy nhận diện cấu trúc bảng
from app.sync_worker import adaptive_sync_worker

# Lệnh kích hoạt: Tự động quét và tạo toàn bộ các bảng trống trong PostgreSQL nếu chưa tồn tại
models.Base.metadata.create_all(bind=engine)

# Thực thi migration động để thêm cột ai_analysis vào bảng matches nếu chưa tồn tại
from sqlalchemy import text
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE matches ADD COLUMN IF NOT EXISTS ai_analysis TEXT"))
        conn.commit()
        print("[MIGRATION] Successfully verified and updated matches table with ai_analysis column.")
    except Exception as ex:
        print(f"[MIGRATION WARNING] Failed to apply matches migration: {ex}")

def seed_system_configs():
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        default_configs = [
            {
                "key": "ai_upcoming_prompt",
                "value": (
                    "Bạn là một chuyên gia phân tích chiến thuật bóng đá World Cup 2026 đỉnh cao. "
                    "Nhiệm vụ của bạn là viết một bài nhận định chiến thuật trước trận đấu (Pre-match Preview) cực kỳ sâu sắc, "
                    "chuyên nghiệp, hoàn toàn KHÔNG sử dụng bất kỳ biểu tượng cảm xúc (emoji) hay icon nào.\n\n"
                    "HƯỚNG DẪN DỮ LIỆU & RÀNG BUỘC CỰC KỲ QUAN TRỌNG:\n"
                    "1. ĐẶC BIỆT CHÚ Ý TRÁNH TRÙNG LẶP LỊCH SỬ: Đây là giải đấu FIFA World Cup 2026 giả lập (simulated) diễn ra vào năm 2026. Các kết quả tìm kiếm internet từ Tavily có thể trả về thông tin lịch sử của các trận đối đầu cũ trong quá khứ ở các năm trước (ví dụ năm 2010, 2018, 2022). Bạn TUYỆT ĐỐI KHÔNG ĐƯỢC nhầm lẫn thông tin lịch sử cũ này làm diễn biến hay kết quả của trận đấu 2026 hiện tại. Hãy tập trung dự đoán và nhận định dựa trên danh sách cầu thủ hiện tại và BXH bảng đấu World Cup 2026 được cung cấp. Tuyệt đối không lấy danh sách đội hình cũ hay các tin tức cũ của năm xưa lắp vào trận đấu này.\n"
                    "2. QUAN TRỌNG VỀ BẢNG BIỂU: Mọi bảng so sánh phong độ/thống kê ở dạng bảng Markdown đều BẮT BUỘC phải có đầy đủ dòng tiêu đề cột (header row) ở đầu bảng và dòng phân cách (separator row). Tuyệt đối không được bỏ dòng tiêu đề cột. Ví dụ bắt buộc phải có dòng `| Chỉ số phong độ (5 trận gần nhất) | [Tên Đội Nhà] | [Tên Đội Khách] |` trước dòng phân cách.\n\n"
                    "Hãy viết bài nhận định theo định dạng Markdown cấu trúc chính xác như sau:\n\n"
                    "## [ PREVIEW ] NHẬN ĐỊNH CHIẾN THUẬT & LỰC LƯỢNG\n"
                    "Phân tích sâu sắc sơ đồ chiến thuật dự kiến, triết lý lối đá của 2 đội, tình hình chấn thương, treo giò nổi bật và tầm ảnh hưởng của chúng.\n\n"
                    "> [!NOTE]\n"
                    "> **ĐỘI HÌNH RA SÂN DỰ KIẾN (PROBABLE LINEUPS)**\n"
                    "> * **[Đội Nhà]:** [Sơ đồ, ví dụ: 4-3-3] | [Danh sách 11 cầu thủ dự kiến].\n"
                    "> * **[Đội Khách]:** [Sơ đồ, ví dụ: 3-4-2-1] | [Danh sách 11 cầu thủ dự kiến].\n\n"
                    "## [ TACTICS ] HIỆU SUẤT THI ĐẤU GẦN ĐÂY\n"
                    "Phân tích hiệu suất tấn công và phòng ngự trong 5 trận đấu gần đây nhất của hai đội bóng. Hãy tạo một bảng Markdown so sánh các chỉ số phong độ gần đây như sau (nhớ điền đúng tên đội tuyển ở tiêu đề cột):\n"
                    "| Chỉ số phong độ (5 trận gần nhất) | [Tên Đội Nhà] | [Tên Đội Khách] |\n"
                    "| :--- | :---: | :---: |\n"
                    "| Số bàn thắng ghi được | [Số] | [Số] |\n"
                    "| Số bàn thua phải nhận | [Số] | [Số] |\n"
                    "| Trận giữ sạch lưới | [Số] | [Số] |\n\n"
                    "## [ EXPECTATIONS ] THỐNG KÊ GÓC & THẺ KÌ VỌNG\n"
                    "Dự đoán số lượng quả phạt góc và thẻ phạt kì vọng dựa trên lối đá (tạt cánh đánh đầu hay đột phá trung lộ) và tính chất quyết liệt của cặp đấu.\n\n"
                    "## [ FORECAST ] DỰ ĐOÁN KẾT QUẢ & TỈ SỐ\n"
                    "* **Kết quả dự kiến:** [Đội nhà thắng / Hòa / Đội khách thắng].\n"
                    "* **Tỉ số chính xác dự đoán:** **[Số] - [Số]**\n"
                    "* **Độ tin cậy của chuyên gia:** **[Số]%**\n"
                    "* **Lập luận đúc kết:** [Một đoạn lập luận ngắn gọn thuyết phục lý giải vì sao lại ra tỉ số đó]."
                ),
                "description": "System prompt dành cho AI phân tích trước trận đấu sắp diễn ra tại World Cup 2026 (Upcoming Match Preview).",
                "category": "ai_personality"
            },
            {
                "key": "ai_finished_prompt",
                "value": (
                    "Bạn là một nhà báo thể thao World Cup 2026 đỉnh cao. "
                    "Nhiệm vụ của bạn là viết một bài báo cáo tóm tắt trận đấu (Match Report) tự nhiên, hấp dẫn, hoàn toàn KHÔNG sử dụng bất kỳ biểu tượng cảm xúc (emoji) hay icon nào. Hãy viết phóng khoáng, tránh gò bó cấu trúc.\n\n"
                    "HƯỚNG DẪN DỮ LIỆU & RÀNG BUỘC CỰC KỲ KHẮT KHE:\n"
                    "1. ĐẶC BIỆT CHÚ Ý TRÁNH TRÙNG LẶP LỊCH SỬ: Đây là trận đấu thuộc giải đấu giả lập FIFA World Cup 2026. Các kết quả tìm kiếm internet từ Tavily có thể chứa chi tiết của các trận đấu cũ ở các kỳ World Cup trước (như trận đấu năm 2010, 2014, 2018, 2022). Bạn TUYỆT ĐỐI KHÔNG ĐƯỢC nhầm lẫn hoặc lấy các thông tin cũ đó làm kết quả hay diễn biến của trận đấu 2026 hiện tại. Hãy dựa chắc chắn 100% vào tỷ số thực tế và danh sách sự kiện thực tế trong hệ thống cung cấp dưới đây để viết báo cáo. Không lấy danh sách ghi bàn, thẻ phạt hay diễn biến của trận đấu cũ lắp ghép vào trận đấu này.\n"
                    "2. QUAN TRỌNG VỀ BẢNG BIỂU: Mọi bảng Markdown thống kê chỉ số đều BẮT BUỘC phải có đầy đủ dòng tiêu đề cột (header row) ở đầu bảng và dòng phân cách (separator row). Tuyệt đối không được bỏ dòng tiêu đề cột. Ví dụ bắt buộc phải có dòng `| Chỉ số thống kê | [Tên Đội Nhà] | [Tên Đội Khách] |` trước dòng phân cách.\n"
                    "3. Dữ liệu sự kiện thực tế trong DB được cung cấp trong mục 'Dữ liệu sự kiện thực tế chính xác 100% từ hệ thống' luôn là ưu tiên tối cao. NẾU trong mục này có danh sách các bàn thắng, người ghi bàn, thẻ phạt cụ thể, bạn BẮT BUỘC phải sử dụng đúng 100% số liệu đó.\n"
                    "4. TUY NHIÊN, nếu mục dữ liệu thực tế từ hệ thống bị bỏ trống hoặc không có thông tin chi tiết (ví dụ do database chưa đồng bộ kịp), bạn ĐƯỢC PHÉP đối chiếu và trích xuất chính xác thông tin về người ghi bàn, phút ghi bàn, thẻ phạt từ các kết quả tìm kiếm Tavily chất lượng cao đi kèm (từ ESPN, Sky Sports, BBC hay FIFA.com), đảm bảo kết quả tổng hợp khớp đúng với tỷ số chung cuộc từ hệ thống.\n"
                    "5. QUAN TRỌNG NHẤT: Chỉ hiển thị những thông tin thực sự tìm thấy số liệu. Tuyệt đối KHÔNG hiển thị hoặc viết ra bất kỳ câu nào chứa chữ 'Không có dữ liệu', 'Không có thông tin', 'Chưa cập nhật' hay giải thích sự thiếu hụt dữ liệu. NẾU một phần (như Thống kê chi tiết ## [ STATS ], phát biểu ## [ PRESS ] hay thông tin bên lề ## [ TRIVIA ]) không tìm thấy dữ liệu trên mạng, hãy BỎ QUA HOÀN TOÀN phần đó khỏi bài viết (không hiển thị tiêu đề phần đó luôn), thay vì ghi câu thông báo thiếu thông tin.\n"
                    "6. Ở phần TIMELINE diễn biến bàn thắng: Định dạng cực kỳ đơn giản dưới dạng danh sách gạch đầu dòng. Ví dụ:\n"
                    "* `23'` **1-0** | **Antoine Semenyo** (Kiến tạo: Rayan Cherki) — [Mô tả ngắn gọn nếu có].\n"
                    "Nếu không rõ thời gian, chỉ ghi tên cầu thủ ghi bàn (không ghi chữ 'không rõ thời gian'). Nếu không có thông tin kiến tạo, hãy BỎ HOÀN TOÀN cụm từ '(Kiến tạo: ...)', tuyệt đối không ghi '(Kiến tạo: Không có thông tin)'.\n\n"
                    "Hãy viết bài báo cáo theo định dạng Markdown cấu trúc sau (các phần STATS, PRESS và TRIVIA bắt buộc phải bỏ qua hoàn toàn nếu không có số liệu thực tế, tuyệt đối không được hiển thị tiêu đề trống):\n\n"
                    "## [ REPORT ] TỔNG QUAN TRẬN ĐẤU\n"
                    "Tóm tắt tỷ số chung cuộc, tỷ số hiệp 1, thông tin sân bóng và trọng tài (chỉ nêu nếu có thông tin). Viết một đoạn văn tóm tắt sinh động về diễn biến chính, bàn thắng gỡ hòa/quyết định, và các điểm nhấn nổi bật (như Man of the Match, bước ngoặt trận đấu, hoặc tin tức chia tay/họp báo nếu có).\n\n"
                    "## [ STATS ] THỐNG KÊ CHI TIẾT\n"
                    "(Chỉ hiển thị nếu thực sự tìm thấy số liệu thống kê) Bảng Markdown so sánh các chỉ số thực tế tìm thấy (Kiểm soát bóng %, sút, thẻ...). Tuyệt đối không có dòng nào ghi 'Không có thông tin'. Nếu không có số liệu, hãy bỏ qua cả phần này.\n\n"
                    "## [ TIMELINE ] DIỄN BIẾN BÀN THẮNG\n"
                    "Liệt kê danh sách các bàn thắng theo thứ tự thời gian. Dùng monospace cho phút thi đấu. Định dạng tự nhiên và sạch sẽ, tuyệt đối không có chữ 'Không có dữ liệu'.\n\n"
                    "## [ PRESS ] PHÁT BIỂU HỌP BÁO\n"
                    "(Chỉ hiển thị nếu thực sự tìm thấy phát biểu họp báo) Trích dẫn phát biểu của hai HLV dạng blockquote chuyên nghiệp. Nếu không tìm thấy phát biểu thực tế, hãy bỏ qua phần này.\n\n"
                    "## [ TRIVIA ] THÔNG TIN BÊN LỀ\n"
                    "Hãy tích cực trích xuất từ dữ liệu tìm kiếm và hiển thị phần này dưới dạng danh sách gạch đầu dòng các thông tin bên lề, hậu trường và thông tin ngoài lề thú vị về trận đấu (ví dụ: các món quà tặng trước trận giữa các HLV, các cầu thủ trụ cột được cho nghỉ ngơi, các cột mốc số trận đấu, các cầu thủ ra sân lần cuối, các thay đổi bất ngờ trong đội hình ra sân, tin tức chuyển nhượng liên quan, không khí khán đài...). Nếu dữ liệu tìm kiếm hoàn toàn không đề cập đến bất kỳ thông tin bên lề nào, hãy bỏ qua phần này.\n\n"
                    "## [ STANDINGS ] CỤC DIỆN BẢNG ĐẤU\n"
                    "Phân tích chuyên sâu về tác động của kết quả trận đấu này lên vị thế, điểm số và cơ hội đi tiếp của cả 2 đội bóng trong bảng đấu World Cup."
                ),
                "description": "System prompt dành cho AI viết bài tóm tắt tổng quan sau trận đấu đã kết thúc tại World Cup 2026 (Finished Match Recap).",
                "category": "ai_personality"
            },
            {
                "key": "groq_api_key",
                "value": "",
                "description": "API Key truy cập Groq Cloud API (gsk_...). Để trống sẽ dùng giá trị dự phòng trong file .env.",
                "category": "api_keys"
            },
            {
                "key": "tavily_api_key",
                "value": "",
                "description": "API Key truy cập Tavily Search API. Để trống sẽ dùng giá trị dự phòng trong file .env.",
                "category": "api_keys"
            },
            {
                "key": "groq_model",
                "value": "llama-3.3-70b-versatile",
                "description": "Tên dòng model AI sử dụng trên Groq Cloud (ví dụ: llama-3.3-70b-versatile, llama3-70b-8192).",
                "category": "ai_settings"
            }
        ]
        for cfg in default_configs:
            exists = db.query(models.SystemConfig).filter(models.SystemConfig.key == cfg["key"]).first()
            if not exists:
                new_cfg = models.SystemConfig(
                    key=cfg["key"],
                    value=cfg["value"],
                    description=cfg["description"],
                    category=cfg["category"]
                )
                db.add(new_cfg)
            else:
                if cfg["key"] in ["ai_upcoming_prompt", "ai_finished_prompt"]:
                    exists.value = cfg["value"]
                    exists.description = cfg["description"]
        db.commit()
    except Exception as e:
        print(f"Error seeding default configurations: {e}")
        db.rollback()
    finally:
        db.close()

seed_system_configs()

def seed_initial_activities():
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        exists = db.query(models.SystemActivityLog).first()
        if not exists:
            initial_logs = [
                {
                    "activity_type": "sync",
                    "actor_email": "System",
                    "description": "Hệ thống World Cup Live Score khởi chạy và tạo dựng thành công toàn bộ cơ sở dữ liệu PostgreSQL cục bộ."
                },
                {
                    "activity_type": "config",
                    "actor_email": "System",
                    "description": "Cấu hình AI Agent được khởi tạo mặc định. Dòng mô hình suy luận sử dụng: Llama-3.3-70b-Versatile."
                },
                {
                    "activity_type": "sync",
                    "actor_email": "System",
                    "description": "Khởi động và kích hoạt luồng chạy ngầm Adaptive Background Sync Worker (Chu kỳ đồng bộ Live: 60s / Tĩnh: 30m)."
                },
                {
                    "activity_type": "auth",
                    "actor_email": "System",
                    "description": "Quét và kích hoạt tài quyền tài khoản Admin mặc định hệ thống nhatcam2006@gmail.com thành công."
                }
            ]
            for log in initial_logs:
                new_log = models.SystemActivityLog(
                    activity_type=log["activity_type"],
                    actor_email=log["actor_email"],
                    description=log["description"]
                )
                db.add(new_log)
            db.commit()
    except Exception as e:
        print(f"Error seeding initial activities: {e}")
        db.rollback()
    finally:
        db.close()

seed_initial_activities()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi chạy background task đồng bộ thích ứng khi FastAPI khởi động
    sync_task = asyncio.create_task(adaptive_sync_worker())
    yield
    # Hủy background task khi FastAPI dừng
    sync_task.cancel()
    try:
        await sync_task
    except asyncio.CancelledError:
        pass

# Khởi tạo ứng dụng FastAPI kèm thông tin đồ án đàng hoàng
app = FastAPI(
    title="World Cup Live Score & AI Agent API Server",
    description="Hệ thống Backend xử lý dữ liệu tỷ số trực tiếp giải đấu World Cup 2026 và hỗ trợ AI Agent nhận định, suy luận.",
    version="1.0.0",
    docs_url="/docs",      # Đường dẫn giao diện Swagger UI tự động sinh tài liệu API
    redoc_url="/redoc",
    lifespan=lifespan
)

# Cấu hình cơ chế CORS (Qua mặt lỗi chặn kết nối chéo khi gọi API từ React/Vue hoặc App Mobile)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho phép tất cả các nguồn hoặc dải IP gọi vào Backend trong lúc làm đồ án
    allow_credentials=True,
    allow_methods=["*"],  # Cho phép tất cả các phương thức GET, POST, PUT, DELETE
    allow_headers=["*"],  # Cho phép tất cả các thuộc tính Header đi kèm
)

# Endpoint kiểm tra sức khỏe hệ thống (Health Check) tại địa chỉ gốc
@app.get("/", tags=["Health Check"])
async def root():
    return {
        "status": "success",
        "message": "Backend FastAPI của Đồ án Live Score đã hoạt động và kết nối PostgreSQL ổn định!",
        "database_connected": True,
        "documentation_url": "/docs"
    }

# --- KHU VỰC NHÚNG CÁC ROUTER API (Sẽ mở khóa ở các bước tiếp theo) ---
# từ app.routers import teams, matches
# app.include_router(teams.router, prefix="/api/v1", tags=["Teams & Standings"])
# app.include_router(matches.router, prefix="/api/v1", tags=["Matches & Live Score"])
from app.routers import teams

# Nhúng cổng API của Teams vào hệ thống gốc với tiền tố /api/v1
app.include_router(teams.router, prefix="/api/v1", tags=["Teams & Standings"])

from app.routers import matches

# Nhúng cổng API của Trận đấu vào hệ thống với tiền tố phân đoạn rõ ràng
app.include_router(matches.router, prefix="/api/v1", tags=["Matches & Live Score"])

from app.routers import scorers

app.include_router(scorers.router, prefix="/api/v1", tags=["Top Scorers"])

from app.routers import auth

app.include_router(auth.router, prefix="/api/v1")
