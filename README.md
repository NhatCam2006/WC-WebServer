# Tổng quan dự án EPL Live Score

## 1. Mục tiêu
Dự án cung cấp hệ thống **tỷ số trực tiếp giải Ngoại hạng Anh (EPL)** gồm:
- **Backend FastAPI**: thu thập dữ liệu từ football-data.org, lưu vào PostgreSQL và cung cấp API.
- **Frontend React + Vite**: hiển thị lịch thi đấu, bảng xếp hạng, đội bóng và chi tiết đội.

## 2. Kiến trúc tổng thể
- **Backend**: Python + FastAPI + SQLAlchemy + PostgreSQL  
- **Frontend**: React 19 + TypeScript + Vite + React Router  
- **Nguồn dữ liệu**: API football-data.org (đội bóng, BXH, lịch thi đấu)

## 3. Chức năng chính
- Đồng bộ dữ liệu EPL vào PostgreSQL (đội bóng, cầu thủ, BXH, lịch thi đấu).
- Xem **bảng xếp hạng**, **lịch thi đấu & tỷ số**, **danh sách đội bóng**.
- Trang **chi tiết đội bóng** kèm danh sách cầu thủ.

## 4. API Backend (FastAPI)
Base URL: `http://127.0.0.1:8000/api/v1`

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/` | Health check + link tài liệu API |
| POST | `/sync-all` | Đồng bộ dữ liệu giải đấu, đội, BXH |
| GET | `/teams` | Danh sách 20 đội bóng |
| GET | `/teams/{team_id}` | Chi tiết đội + cầu thủ |
| GET | `/standings` | Bảng xếp hạng |
| POST | `/matches/sync` | Đồng bộ lịch thi đấu & tỷ số |
| GET | `/matches?matchday=` | Danh sách trận đấu (lọc theo vòng) |

Swagger UI: `http://127.0.0.1:8000/docs`

## 5. Cấu trúc thư mục
```
DACS3/
├─ epl_backend/
│  ├─ app/
│  │  ├─ main.py          # Khởi tạo FastAPI, CORS, include routers
│  │  ├─ models.py        # SQLAlchemy models
│  │  ├─ database.py      # Kết nối PostgreSQL + session
│  │  ├─ services.py      # Đồng bộ dữ liệu từ football-data.org
│  │  └─ routers/
│  │     ├─ teams.py      # API Teams & Standings
│  │     └─ matches.py    # API Matches
│  ├─ run.py              # Chạy server Uvicorn
│  └─ tools/
│     └─ download_images.py  # Tải ảnh cầu thủ về frontend
└─ epl_frontend/
   ├─ src/
   │  ├─ api/             # client gọi API backend
   │  ├─ pages/           # Home, Matches, Standings, Teams, TeamDetail
   │  ├─ components/      # UI components
   │  └─ types/           # Interface dữ liệu
   └─ public/players/     # Ảnh cầu thủ (tải bằng script)
```

## 6. Hướng dẫn chạy nhanh
### Backend
```
cd epl_backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

### Frontend
```
cd epl_frontend
npm install
npm run dev
```

## 7. Lưu ý cấu hình
- **Database**: chỉnh chuỗi kết nối trong `epl_backend/app/database.py`
  - Mặc định: `postgresql://postgres:123@localhost:5432/epl_db`
- **API Token**: cấu hình trong `epl_backend/app/services.py`
  - Biến `API_TOKEN` dùng cho football-data.org
- **Frontend gọi API**: `epl_frontend/src/api/client.ts`
  - Mặc định: `http://127.0.0.1:8000/api/v1`

## 8. Tiện ích tải ảnh cầu thủ
Chạy script để tải ảnh cầu thủ vào `epl_frontend/public/players/`:
```
cd epl_backend
python tools\download_images.py
```

