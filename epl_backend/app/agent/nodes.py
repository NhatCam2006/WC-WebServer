import os
import json
from typing import Dict, Any
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableConfig
from tavily import TavilyClient
from dotenv import load_dotenv

from app import models
from app.agent.state import AgentState

import sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# Tải cấu hình biến môi trường từ file .env (override=True để nạp đè biến môi trường hệ thống)
load_dotenv(override=True)

DEFAULT_UPCOMING_PROMPT = (
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
)

DEFAULT_FINISHED_PROMPT = (
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
)

def _get_setting(key: str, config: RunnableConfig, default_val: str = "") -> str:
    db = config.get("configurable", {}).get("db") if config else None
    if db:
        try:
            cfg = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
            if cfg and cfg.value.strip() != "":
                return cfg.value.strip()
        except Exception as e:
            print(f"Error fetching system config '{key}' from DB: {e}")
    
    # Fallback to env or defaults
    if key == "groq_api_key":
        return os.getenv("GROQ_API_KEY", default_val)
    elif key == "tavily_api_key":
        return os.getenv("TAVILY_API_KEY", default_val)
    elif key == "groq_model":
        return os.getenv("GROQ_MODEL", default_val)
    return default_val

# Helper: Lấy ngữ cảnh thời gian dạng "Month Day, Year" để cố định kết quả tìm kiếm chính xác
def _get_date_context(utc_date_str: str | None) -> str:
    if not utc_date_str:
        return ""
    try:
        # Định dạng mong muốn YYYY-MM-DD
        date_part = utc_date_str.split("T")[0]
        parts = date_part.split("-")
        if len(parts) == 3:
            year = parts[0]
            month_num = int(parts[1])
            day_num = int(parts[2])
            months = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ]
            if 1 <= month_num <= 12:
                return f"{months[month_num - 1]} {day_num}, {year}"
    except Exception:
        pass
    return ""

def _fetch_factual_events_context(match_id: int) -> str:
    from app import services
    try:
        raw = services.fetch_match_detail(match_id)
        if not raw:
            return "Không lấy được dữ liệu sự kiện chi tiết từ API."
        
        match_data = raw.get("match") if isinstance(raw, dict) and raw.get("match") else raw
        if not isinstance(match_data, dict):
            return "Dữ liệu sự kiện không hợp lệ."
            
        home_team_name = match_data.get("homeTeam", {}).get("name", "Unknown")
        away_team_name = match_data.get("awayTeam", {}).get("name", "Unknown")
        
        goals = match_data.get("goals", [])
        goals_text = []
        for g in goals:
            minute = g.get("minute")
            inj = f"+{g.get('injuryTime')}" if g.get("injuryTime") else ""
            scorer = g.get("scorer", {}).get("name", "Unknown")
            assist = g.get("assist", {}).get("name")
            assist_str = f" (Kiến tạo: {assist})" if assist else ""
            team = g.get("team", {}).get("name", "Unknown")
            type_str = f" ({g.get('type')})" if g.get("type") != "REGULAR" else ""
            goals_text.append(f"- Phút {minute}{inj}': [BÀN THẮNG] cho {team} - Ghi bởi: {scorer}{assist_str}{type_str}")
            
        bookings = match_data.get("bookings", [])
        bookings_text = []
        for b in bookings:
            minute = b.get("minute")
            player = b.get("player", {}).get("name", "Unknown")
            card = b.get("card", "YELLOW")
            team = b.get("team", {}).get("name", "Unknown")
            bookings_text.append(f"- Phút {minute}': [THẺ PHẠT] {card} cho {player} ({team})")
            
        referees = match_data.get("referees", [])
        ref_text = [f"- {r.get('name')} ({r.get('role')})" for r in referees]
        
        context = []
        context.append("--- THÔNG TIN SỰ KIỆN TRẬN ĐẤU THỰC TẾ CHÍNH XÁC ---")
        context.append(f"Tỷ số chung cuộc: {home_team_name} {match_data.get('score', {}).get('fullTime', {}).get('home')} - {match_data.get('score', {}).get('fullTime', {}).get('away')} {away_team_name}")
        context.append(f"Tỷ số hiệp 1: {match_data.get('score', {}).get('halfTime', {}).get('home')} - {match_data.get('score', {}).get('halfTime', {}).get('away')}")
        context.append(f"Sân vận động: {match_data.get('venue')}")
        
        context.append("\nDANH SÁCH BÀN THẮNG:")
        if goals_text:
            context.extend(goals_text)
        else:
            context.append("- Không có bàn thắng nào.")
            
        context.append("\nDANH SÁCH THẺ PHẠT:")
        if bookings_text:
            context.extend(bookings_text)
        else:
            context.append("- Không có thẻ phạt nào.")
            
        context.append("\nTRỌNG TÀI:")
        if ref_text:
            context.extend(ref_text)
        else:
            context.append("- Chưa cập nhật trọng tài.")
            
        return "\n".join(context)
    except Exception as e:
        return f"Không thể trích xuất sự kiện thực tế. Lỗi: {e}"

# =========================================================================
# NODE 1: fetch_match_data
# Đọc thông tin từ DB, chuẩn bị ngữ cảnh phong độ, BXH của 2 đội tuyển
# =========================================================================
def fetch_match_data(state: AgentState, config: RunnableConfig) -> Dict[str, Any]:
    db = config.get("configurable", {}).get("db")
    if db is None:
        raise Exception("Không tìm thấy DB session trong RunnableConfig.")
        
    match_id = state["match_id"]
    
    # 1. Lấy thông tin trận đấu chính
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not db_match:
        raise Exception(f"Không tìm thấy trận đấu ID {match_id} trong database.")
        
    # 2. Lấy thông tin logo, tên đội nhà và đội khách
    home_team = db.query(models.Team).filter(models.Team.id == db_match.home_team_id).first()
    away_team = db.query(models.Team).filter(models.Team.id == db_match.away_team_id).first()
    
    match_info = {
        "id": db_match.id,
        "home_team_name": home_team.name if home_team else "Unknown Team",
        "away_team_name": away_team.name if away_team else "Unknown Team",
        "utc_date": db_match.utc_date.isoformat() if db_match.utc_date else None,
        "matchday": db_match.matchday,
        "status": db_match.status,
        "score_full_home": db_match.score_full_time_home,
        "score_full_away": db_match.score_full_time_away,
        "score_half_home": db_match.score_half_time_home,
        "score_half_away": db_match.score_half_time_away,
        "venue": home_team.venue if home_team else "Unknown Venue",
        "factual_events": ""
    }
    
    if db_match.status in ["FINISHED", "AWARDED"]:
        match_info["factual_events"] = _fetch_factual_events_context(db_match.id)
    
    # 3. Lấy lịch sử 5 trận đấu gần đây của cả 2 đội
    from app.services import fetch_team_matches_all
    home_matches_data = fetch_team_matches_all(db_match.home_team_id, db)
    away_matches_data = fetch_team_matches_all(db_match.away_team_id, db)
    
    home_recent = home_matches_data.get("finished", []) if home_matches_data else []
    away_recent = away_matches_data.get("finished", []) if away_matches_data else []
    
    # 4. Lấy vị trí Bảng xếp hạng của 2 đội để làm ngữ cảnh vị trí
    standings_list = []
    db_standings = db.query(models.Standing).filter(
        models.Standing.team_id.in_([db_match.home_team_id, db_match.away_team_id])
    ).all()
    
    for s in db_standings:
        team = db.query(models.Team).filter(models.Team.id == s.team_id).first()
        standings_list.append({
            "team_name": team.name if team else "Unknown",
            "position": s.position,
            "played_games": s.played_games,
            "won": s.won,
            "draw": s.draw,
            "lost": s.lost,
            "points": s.points,
            "goals_for": s.goals_for,
            "goals_against": s.goals_against,
            "goal_difference": s.goal_difference,
            "form": s.form
        })
        
    print(f"-> [LangGraph Fetch] Loaded match data: {match_info['home_team_name']} vs {match_info['away_team_name']}")
    return {
        "status": db_match.status,
        "match_info": match_info,
        "home_recent": home_recent,
        "away_recent": away_recent,
        "standings": standings_list
    }

def _clean_team_name(name: str) -> str:
    if not name:
        return ""
    # Strip typical suffixes that clutter search engines
    for suffix in [" FC", " AFC", "FC", "AFC", " Club de Fútbol", " Club"]:
        if name.endswith(suffix):
            name = name[:-len(suffix)].strip()
    return name

# =========================================================================
# NODE 2: search_upcoming_stats
# Cào tin tức chấn thương, góc, thẻ cho trận đấu sắp diễn ra bằng Tavily
# =========================================================================
def search_upcoming_stats(state: AgentState, config: RunnableConfig = None) -> Dict[str, Any]:
    api_key = _get_setting("tavily_api_key", config)
    if not api_key or "placeholder" in api_key or api_key.strip() == "":
        print("-> [Tavily Search] TAVILY_API_KEY not configured. Skipping search.")
        return {
            "search_query": "N/A (Chưa cấu hình API Key)",
            "search_results": "Hệ thống chưa cấu hình TAVILY_API_KEY trong file .env. AI sẽ thực hiện nhận định chiến thuật dựa hoàn toàn trên dữ liệu cục bộ PostgreSQL."
        }
        
    home = _clean_team_name(state["match_info"]["home_team_name"])
    away = _clean_team_name(state["match_info"]["away_team_name"])
    utc_date = state["match_info"].get("utc_date")
    date_context = _get_date_context(utc_date)
    
    # Tạo query chuyên sâu phạt góc, thẻ phạt, chấn thương cố định theo ngày tháng diễn ra
    query = f"{home} vs {away} FIFA World Cup 2026 predicted lineup starting XI injury updates team news {date_context}"
    print(f"-> [Tavily RAG Preview] Searching Tavily: {query} with include_domains=['fifa.com', 'sofascore.com', 'sportsmole.co.uk', 'goal.com', 'espn.com']")
    
    try:
        client = TavilyClient(api_key=api_key)
        response = client.search(
            query=query, 
            max_results=3, 
            search_depth="advanced", 
            include_domains=["fifa.com", "sofascore.com", "sportsmole.co.uk", "goal.com", "espn.com"]
        )
        results = ""
        for i, res in enumerate(response.get("results", [])):
            results += f"[{i+1}] Nguồn: {res.get('url')}\nNội dung: {res.get('content')}\n\n"
        return {
            "search_query": query,
            "search_results": results
        }
    except Exception as e:
        print(f"Error searching Tavily Preview: {e}")
        return {
            "search_query": query,
            "search_results": f"Gặp lỗi khi truy vấn Tavily Search: {e}. AI sẽ thực hiện nhận định trên dữ liệu nội bộ."
        }

# =========================================================================
# NODE 3: search_finished_reports
# Cào diễn biến chính, phát biểu họp báo sau trận đấu đã kết thúc bằng Tavily
# =========================================================================
def search_finished_reports(state: AgentState, config: RunnableConfig = None) -> Dict[str, Any]:
    api_key = _get_setting("tavily_api_key", config)
    if not api_key or "placeholder" in api_key or api_key.strip() == "":
        print("-> [Tavily Search] TAVILY_API_KEY not configured. Skipping search.")
        return {
            "search_query": "N/A (Chưa cấu hình API Key)",
            "search_results": "Hệ thống chưa cấu hình TAVILY_API_KEY trong file .env. AI sẽ thực hiện tóm tắt dựa hoàn toàn trên tỷ số thực tế trong DB."
        }
        
    home = _clean_team_name(state["match_info"]["home_team_name"])
    away = _clean_team_name(state["match_info"]["away_team_name"])
    utc_date = state["match_info"].get("utc_date")
    date_context = _get_date_context(utc_date)
    
    # Bổ sung tỷ số thực tế từ DB để tìm kiếm chính xác bài báo cáo của trận đấu này
    score_home = state["match_info"].get("score_full_home")
    score_away = state["match_info"].get("score_full_away")
    score_str = f"{score_home}-{score_away}" if score_home is not None and score_away is not None else ""
    
    # Tạo query cực kỳ chi tiết bao gồm tên hai đội, tỷ số và thời gian
    query = f'"{home}" vs "{away}" "{score_str}" FIFA World Cup 2026 match report highlights {date_context}'
    print(f"-> [Tavily RAG Recap] Searching Tavily: {query} with include_domains=['fifa.com', 'sofascore.com', 'espn.com', 'skysports.com', 'bbc.com', 'goal.com', 'reuters.com']")
    
    try:
        client = TavilyClient(api_key=api_key)
        response = client.search(
            query=query, 
            max_results=4, 
            search_depth="advanced", 
            include_domains=["fifa.com", "sofascore.com", "espn.com", "skysports.com", "bbc.com", "goal.com", "reuters.com"]
        )
        results = ""
        for i, res in enumerate(response.get("results", [])):
            results += f"[{i+1}] Nguồn: {res.get('url')}\nNội dung: {res.get('content')}\n\n"
        return {
            "search_query": query,
            "search_results": results
        }
    except Exception as e:
        print(f"Error searching Tavily Recap: {e}")
        return {
            "search_query": query,
            "search_results": f"Gặp lỗi khi truy vấn Tavily Search: {e}. AI sẽ thực hiện tóm tắt trên dữ liệu nội bộ."
        }

# =========================================================================
# NODE 4: analyze_upcoming_match
# Nhận định chiến thuật sâu sắc bằng llama3-70b-8192 (upcoming)
# =========================================================================
def analyze_upcoming_match(state: AgentState, config: RunnableConfig = None) -> Dict[str, Any]:
    groq_api_key = _get_setting("groq_api_key", config)
    groq_model = _get_setting("groq_model", config, "llama-3.3-70b-versatile")
    system_prompt = _get_setting("ai_upcoming_prompt", config, DEFAULT_UPCOMING_PROMPT)
    
    # Kiểm tra API Key
    if not groq_api_key or "placeholder" in groq_api_key or groq_api_key.strip() == "":
        print("-> [Groq LLM] GROQ_API_KEY not configured.")
        return {"analysis_result": _generate_env_error_message()}
        
    # Chuẩn bị Prompt Chuyên gia chiến thuật sâu sắc từ DB hoặc mặc định
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", (
            "Dữ liệu trận đấu:\n"
            "- Trận đấu: {home_team} vs {away_team}\n"
            "- Vòng đấu: Vòng {matchday}\n"
            "- Thời gian đá: {utc_date}\n"
            "- Sân vận động: {venue}\n\n"
            "Bảng xếp hạng giải đấu hiện tại:\n"
            "{standings}\n\n"
            "Phong độ 5 trận đã đấu gần nhất của Đội nhà ({home_team}):\n"
            "{home_recent}\n\n"
            "Phong độ 5 trận đã đấu gần nhất của Đội khách ({away_team}):\n"
            "{away_recent}\n\n"
            "Tin tức & Thống kê cào được từ Tavily Search:\n"
            "{search_results}"
        ))
    ])
    
    try:
        llm = ChatGroq(groq_api_key=groq_api_key, model=groq_model, temperature=0.3)
        chain = prompt | llm
        
        info = state["match_info"]
        res = chain.invoke({
            "home_team": info["home_team_name"],
            "away_team": info["away_team_name"],
            "matchday": info["matchday"],
            "utc_date": info["utc_date"],
            "venue": info["venue"],
            "standings": json.dumps(state["standings"], indent=2, ensure_ascii=False),
            "home_recent": json.dumps(state["home_recent"], indent=2, ensure_ascii=False),
            "away_recent": json.dumps(state["away_recent"], indent=2, ensure_ascii=False),
            "search_results": state["search_results"]
        })
        
        return {"analysis_result": res.content}
    except Exception as e:
        err_str = str(e)
        if "Invalid API Key" in err_str or "invalid_api_key" in err_str or "401" in err_str:
            print("-> [Groq LLM] Invalid Groq API Key (401) detected.")
            return {"analysis_result": _generate_env_invalid_key_message(err_str)}
        print(f"Error calling Groq LLM analyze: {e}")
        return {"analysis_result": f"Không thể tạo phân tích nhận định từ Groq LLM. Lỗi: {e}"}

# =========================================================================
# NODE 5: summarize_finished_match
# Tóm tắt trận đấu sống động như Nhà báo thể thao bằng llama3-70b-8192 (finished)
# =========================================================================
def summarize_finished_match(state: AgentState, config: RunnableConfig = None) -> Dict[str, Any]:
    groq_api_key = _get_setting("groq_api_key", config)
    groq_model = _get_setting("groq_model", config, "llama-3.3-70b-versatile")
    system_prompt = _get_setting("ai_finished_prompt", config, DEFAULT_FINISHED_PROMPT)
    
    # Kiểm tra API Key
    if not groq_api_key or "placeholder" in groq_api_key or groq_api_key.strip() == "":
        print("-> [Groq LLM] GROQ_API_KEY not configured.")
        return {"analysis_result": _generate_env_error_message()}
        
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", (
            "Dữ liệu trận đấu đã đá xong:\n"
            "- Trận đấu: {home_team} vs {away_team}\n"
            "- Tỷ số chung cuộc: {home_team} {score_home} - {score_away} {away_team}\n"
            "- Tỷ số hiệp 1: {score_half_home} - {score_half_away}\n"
            "- Vòng đấu: Vòng {matchday}\n"
            "- Thời gian đá: {utc_date}\n"
            "- Sân vận động: {venue}\n\n"
            "Dữ liệu sự kiện thực tế chính xác 100% từ hệ thống (BẮT BUỘC PHẢI DÙNG ĐỂ VIẾT BÁO CÁO):\n"
            "{factual_events}\n\n"
            "Ngữ cảnh Bảng xếp hạng trước trận đấu:\n"
            "{standings}\n\n"
            "Báo cáo chi tiết, thông tin đội hình & sự kiện bên lề cào được từ Tavily Search (DÙNG ĐỂ trích xuất thông tin người ghi bàn, phát biểu họp báo, các thay đổi nhân sự, thông tin ngoài lề/hậu trường thú vị):\n"
            "{search_results}"
        ))
    ])
    
    try:
        llm = ChatGroq(groq_api_key=groq_api_key, model=groq_model, temperature=0.5)
        chain = prompt | llm
        
        info = state["match_info"]
        res = chain.invoke({
            "home_team": info["home_team_name"],
            "away_team": info["away_team_name"],
            "score_home": info["score_full_home"],
            "score_away": info["score_full_away"],
            "score_half_home": info["score_half_home"],
            "score_half_away": info["score_half_away"],
            "matchday": info["matchday"],
            "utc_date": info["utc_date"],
            "venue": info["venue"],
            "standings": json.dumps(state["standings"], indent=2, ensure_ascii=False),
            "search_results": state["search_results"],
            "factual_events": info["factual_events"]
        })
        
        return {"analysis_result": res.content}
    except Exception as e:
        err_str = str(e)
        if "Invalid API Key" in err_str or "invalid_api_key" in err_str or "401" in err_str:
            print("-> [Groq LLM] Invalid Groq API Key (401) detected.")
            return {"analysis_result": _generate_env_invalid_key_message(err_str)}
        print(f"Error calling Groq LLM summary: {e}")
        return {"analysis_result": f"Không thể tạo bài tóm tắt từ Groq LLM. Lỗi: {e}"}

# =========================================================================
# NODE 6: respond_to_user
# Trả kết quả về cho client
# =========================================================================
def respond_to_user(state: AgentState) -> Dict[str, Any]:
    print("-> [LangGraph End] LangGraph analysis finished!")
    return {"analysis_result": state["analysis_result"]}

# =========================================================================
# HELPER: Tạo thông báo lỗi chưa cấu hình .env thân thiện cho Frontend
# =========================================================================
def _generate_env_error_message() -> str:
    return (
        "### 🤖 EPL AI Premium Analyst\n\n"
        "> [!WARNING]\n"
        "> **Yêu cầu cấu hình API Key**\n"
        ">\n"
        "> Chào bạn! Hệ thống AI Agent phân tích chiến thuật (LangGraph + Groq + Tavily) đã được xây dựng hoàn chỉnh và sẵn sàng hoạt động.\n"
        "> Tuy nhiên, hiện tại **`GROQ_API_KEY`** chưa được điền trong file cấu hình `.env` của Backend.\n\n"
        "#### 🛠️ Hướng dẫn kích hoạt tính năng:\n"
        "1. Mở file **`epl_backend/.env`** trên máy tính.\n"
        "2. Điền mã khóa API Groq của bạn vào dòng `GROQ_API_KEY=`.\n"
        "3. (Khuyến nghị) Điền thêm mã khóa Tavily vào dòng `TAVILY_API_KEY=` để cào tin chấn thương, góc, thẻ, họp báo thực tế từ internet.\n"
        "4. Khởi động lại Backend FastAPI và bấm lại nút phân tích trên giao diện!\n\n"
        "Cảm ơn bạn! Hệ thống đang chờ mã khóa cấu hình từ bạn để bắt đầu phân tích chiến thuật đỉnh cao."
    )

def _generate_env_invalid_key_message(err_msg: str) -> str:
    return (
        "### 🤖 EPL AI Premium Analyst\n\n"
        "> [!CAUTION]\n"
        "> **Khóa API Groq không hợp lệ (401 Unauthorized)**\n"
        ">\n"
        "> Phản hồi từ máy chủ Groq Cloud báo lỗi xác thực. API Key hiện tại của bạn không hợp lệ hoặc đã hết hạn:\n"
        f"> `Chi tiết lỗi hệ thống: {err_msg}`\n\n"
        "#### 🛠️ Hướng dẫn khắc phục:\n"
        "1. Mở file **`epl_backend/.env`** trong mã nguồn Backend.\n"
        "2. Kiểm tra xem bạn có dán thừa ký tự lạ, dấu nháy kép, khoảng trắng, hoặc sao chép nhầm mã không.\n"
        "3. Đảm bảo mã khóa API Groq bắt đầu bằng tiền tố **`gsk_`** (Ví dụ: `gsk_xxxxxxx...`).\n"
        "4. Nếu chưa có khóa hợp lệ hoặc muốn đổi khóa mới, bạn hãy lấy miễn phí tại: [Groq Console API Keys](https://console.groq.com/keys).\n"
        "5. **Khởi động lại Backend FastAPI** sau khi lưu file `.env` để nạp lại biến môi trường mới và nhấn thử lại!"
    )
