import os
import sys
import json
import requests
import difflib

# Cấu hình đường dẫn để có thể import các module của ứng dụng (app)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from app.database import SessionLocal
from app import models

# URL tải ảnh gốc
FPL_API_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"
IMG_BASE_URL = "https://resources.premierleague.com/premierleague/photos/players/250x250/p{}.png"

# Thư mục lưu ảnh bên Frontend
FRONTEND_PLAYERS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "epl_frontend", "public", "players"))

def get_fpl_data():
    print("Đang lấy dữ liệu từ Fantasy Premier League API...")
    headers = {'User-Agent': 'Mozilla/5.0'}
    response = requests.get(FPL_API_URL, headers=headers)
    if response.status_code != 200:
        print("Lỗi khi kết nối FPL API!")
        return []
    
    data = response.json()
    elements = data.get("elements", [])
    
    # Tạo danh sách các cầu thủ FPL với tên đầy đủ, tên web, và mã ảnh
    fpl_players = []
    for el in elements:
        full_name = f"{el.get('first_name', '')} {el.get('second_name', '')}".strip()
        web_name = el.get('web_name', '').strip()
        photo_filename = el.get('photo', '')
        # photo thường có dạng "118748.jpg", ta chỉ cần lấy số 118748
        photo_code = photo_filename.replace('.jpg', '').replace('.png', '')
        
        fpl_players.append({
            'full_name': full_name,
            'web_name': web_name,
            'photo_code': photo_code
        })
    return fpl_players

def clean_name(name):
    # Loại bỏ các ký tự đặc biệt có thể gây nhiễu
    return name.lower().strip()

def download_image(photo_code, player_id):
    url = IMG_BASE_URL.format(photo_code)
    try:
        res = requests.get(url, stream=True, timeout=10)
        if res.status_code == 200:
            file_path = os.path.join(FRONTEND_PLAYERS_DIR, f"{player_id}.png")
            with open(file_path, 'wb') as f:
                for chunk in res.iter_content(1024):
                    f.write(chunk)
            return True
        else:
            # Fallback về ảnh nhỏ hơn nếu ảnh 250x250 không có
            fallback_url = f"https://resources.premierleague.com/premierleague/photos/players/110x140/p{photo_code}.png"
            res_fb = requests.get(fallback_url, stream=True, timeout=10)
            if res_fb.status_code == 200:
                file_path = os.path.join(FRONTEND_PLAYERS_DIR, f"{player_id}.png")
                with open(file_path, 'wb') as f:
                    for chunk in res_fb.iter_content(1024):
                        f.write(chunk)
                return True
    except Exception as e:
        print(f"  -> Lỗi tải ảnh: {e}")
    return False

def main():
    print("=== CÔNG CỤ TỰ ĐỘNG TẢI ẢNH CẦU THỦ ===")
    
    if not os.path.exists(FRONTEND_PLAYERS_DIR):
        os.makedirs(FRONTEND_PLAYERS_DIR)
        print(f"Đã tạo thư mục lưu ảnh: {FRONTEND_PLAYERS_DIR}")

    db = SessionLocal()
    local_players = db.query(models.Player).all()
    print(f"Đã tìm thấy {len(local_players)} cầu thủ trong CSDL (football-data.org).")
    
    fpl_players = get_fpl_data()
    print(f"Đã tìm thấy {len(fpl_players)} cầu thủ trên hệ thống FPL.")
    
    if not fpl_players:
        return

    # Gom tất cả tên FPL thành một danh sách để Fuzzy Match
    fpl_name_map = {}
    fpl_search_list = []
    for fp in fpl_players:
        c_full = clean_name(fp['full_name'])
        c_web = clean_name(fp['web_name'])
        fpl_name_map[c_full] = fp
        fpl_name_map[c_web] = fp
        fpl_search_list.extend([c_full, c_web])
        
    fpl_search_list = list(set(fpl_search_list)) # Xóa trùng lặp

    matched_count = 0
    downloaded_count = 0

    print("Bắt đầu xử lý...")
    for player in local_players:
        db_name = clean_name(player.name)
        
        # 1. Tìm chính xác trước
        match_fp = None
        if db_name in fpl_name_map:
            match_fp = fpl_name_map[db_name]
        else:
            # 2. Tìm gần đúng (Fuzzy Match)
            matches = difflib.get_close_matches(db_name, fpl_search_list, n=1, cutoff=0.7)
            if matches:
                match_fp = fpl_name_map[matches[0]]
                
        if match_fp:
            matched_count += 1
            photo_code = match_fp['photo_code']
            
            # Chỉ tải nếu file chưa tồn tại (để tiết kiệm thời gian chạy lại)
            file_path = os.path.join(FRONTEND_PLAYERS_DIR, f"{player.id}.png")
            if not os.path.exists(file_path):
                success = download_image(photo_code, player.id)
                if success:
                    print(f"[OK] {player.name} -> Đã tải ảnh thành công!")
                    downloaded_count += 1
                else:
                    print(f"[LỖI] {player.name} -> Không tải được ảnh từ máy chủ.")
        else:
            # Có một số cầu thủ dự bị ít ra sân có thể không có trên FPL
            print(f"[BỎ QUA] {player.name} -> Không tìm thấy trên FPL.")

    print("=======================================")
    print(f"Tổng kết:")
    print(f"- Cầu thủ có thông tin ảnh: {matched_count}/{len(local_players)}")
    print(f"- Ảnh mới đã tải: {downloaded_count}")
    print(f"- Các ảnh đã lưu trong thư mục: {FRONTEND_PLAYERS_DIR}")
    print("=======================================")

if __name__ == "__main__":
    main()
