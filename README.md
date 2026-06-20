# 🏆 FIFA World Cup 2026 Live Dashboard & AI Analyst

Hệ thống cung cấp lịch thi đấu, tỷ số trực tiếp (Live Score), bảng xếp hạng các bảng đấu và thông tin chi tiết giải đấu **FIFA World Cup 2026**, tích hợp Trợ lý phân tích thông minh AI (RAG Agent) để đưa ra nhận định chiến thuật và tóm tắt trận đấu tự động bằng cách cào tin tức thể thao thời gian thực.

---

## 1. Kiến trúc & Công nghệ Sử dụng

*   **Backend**: Python + FastAPI + SQLAlchemy + PostgreSQL + Uvicorn
*   **AI Agent**: LangGraph + Tavily Search API + Groq Cloud (Llama-3.3-70b-versatile)
*   **Frontend**: React 19 + TypeScript + Vite + React Router + Pure CSS (World Cup Light Theme)
*   **Nguồn dữ liệu**: API `football-data.org` (tự động đồng bộ dữ liệu tĩnh và cập nhật live score)

---

## 2. Các Tính năng Chính

1.  **Thông tin giải đấu trực tiếp**: Xem lịch thi đấu phân nhóm theo vòng (Stage) / bảng đấu (Group), tỷ số trực tiếp (LIVE), bảng xếp hạng chi tiết 8 bảng đấu (Group A - H).
2.  **Thông tin Vua phá lưới**: Bảng xếp hạng Vua phá lưới (Top Scorers) với thiết kế Podium 3 hạng đầu nổi bật.
3.  **Trang Chi tiết đội bóng & Cầu thủ**:
    *   Hiển thị thông tin sân vận động, huấn luyện viên, lịch thi đấu gần đây của đội tuyển.
    *   Danh sách cầu thủ chia theo vị trí (Thủ môn, Hậu vệ, Tiền vệ, Tiền đạo).
    *   Hồ sơ chi tiết từng cầu thủ (số áo, ngày sinh, câu lạc bộ, thống kê số bàn thắng, kiến tạo).
4.  **Tích hợp Trợ lý phân tích AI (RAG Agent)**:
    *   **Trận đấu sắp diễn ra**: AI tự động cào tin tức chấn thương, chiến thuật, dự kiến đội hình ra sân từ các nguồn uy tín (`fifa.com`, `sofascore.com`, `goal.com`...) để đưa ra bài nhận định sâu sắc (Pre-match Preview).
    *   **Trận đấu đã kết thúc**: AI tự động tổng hợp kết quả, dòng thời gian bàn thắng (Timeline) thực tế trong database kết hợp báo cáo trận đấu trên internet để viết tóm tắt trận đấu (Match Report).
    *   **Bộ nhớ đệm (Caching)**: Lưu kết quả phân tích AI vào database giúp tải trang nhanh chóng.
    *   **Tính năng Phân tích lại (Re-analyze)**: Nút hành động cho phép gửi request `?force_refresh=true` yêu cầu AI cào dữ liệu mới nhất và viết lại phân tích.
5.  **Xác thực tài khoản & Phân quyền**: Đăng ký, đăng nhập nhận JWT Token. Phân quyền **Admin** để thay đổi đặc quyền thành viên, chỉnh sửa prompt hệ thống, xem nhật ký log hoạt động và giám sát dữ liệu.
6.  **Đặc tả thiết kế di động**: Cung cấp tệp đặc tả [MOBILE_BLUEPRINT.md](./MOBILE_BLUEPRINT.md) giúp AI dễ dàng xây dựng phiên bản di động (iOS/Android) bằng Flutter hoặc React Native.

---

## 3. Bản đồ API Backend (FastAPI)

Base URL: `http://127.0.0.1:8000/api/v1`

| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| **GET** | `/` | Kiểm tra trạng thái hệ thống (Health check) |
| **POST** | `/auth/register` | Đăng ký tài khoản người dùng mới |
| **POST** | `/auth/login` | Đăng nhập nhận JWT Token truy cập |
| **GET** | `/auth/me` | Lấy thông tin tài khoản hiện tại |
| **GET** | `/teams` | Danh sách 32 đội tuyển quốc gia tham dự |
| **GET** | `/teams/{team_id}` | Chi tiết đội bóng & danh sách cầu thủ |
| **GET** | `/standings` | Bảng xếp hạng 8 bảng đấu (phân theo Group) |
| **GET** | `/matches` | Lịch thi đấu và live score (hỗ trợ lọc theo stage/group/matchday) |
| **GET** | `/matches/{match_id}` | Chi tiết trận đấu (sự kiện, đội hình ra sân, nhận định AI) |
| **POST** | `/matches/{match_id}/ai-analysis` | Kích hoạt AI Agent phân tích trận đấu (hỗ trợ `?force_refresh=true`) |
| **GET** | `/scorers` | Danh sách Vua phá lưới giải đấu |
| **GET** | `/players/{player_id}` | Chi tiết cầu thủ và thống kê cá nhân |
| **GET** | `/search?q={key}` | Tìm kiếm nhanh cầu thủ và đội bóng |
| **GET** | `/sync/status` | Xem trạng thái đồng bộ dữ liệu ngầm của hệ thống |

---

## 4. Giao diện Thiết kế & Ảnh đại diện trực tuyến (DiceBear API)

Hệ thống loại bỏ hoàn toàn các tệp tin hình ảnh tĩnh cục bộ nặng nề của cầu thủ, thay vào đó tải hình đại diện trực tuyến:
*   **Ảnh chính**: Sử dụng API của **DiceBear** phong cách **`avataaars`**: `https://api.dicebear.com/7.x/avataaars/svg?seed={Uri_Encode_Tên_Cầu_Thủ}`. Mỗi cầu thủ sẽ có một avatar hoạt họa độc nhất tương ứng với tên của mình.
*   **Dự phòng (Fallback)**: Khi gặp sự cố mạng hoặc lỗi tải, hệ thống tự động bắt lỗi (`onError`) và chuyển sang avatar phong cách chữ cái viết tắt **`initials`**: `https://api.dicebear.com/7.x/initials/svg?seed={Uri_Encode_Tên_Cầu_Thủ}`.

---

## 5. Cấu trúc thư mục dự án

```text
DACS3/
├─ epl_backend/              # Thư mục chứa mã nguồn Backend FastAPI
│  ├─ app/
│  │  ├─ agent/              # LangGraph AI RAG Agent (nodes, prompts, graph)
│  │  ├─ routers/            # Các router endpoint API (auth, matches, teams, scorers)
│  │  ├─ database.py         # Cấu hình kết nối PostgreSQL
│  │  ├─ models.py           # Định nghĩa các SQLAlchemy Model Database
│  │  ├─ security.py         # Hàm mã hóa mật khẩu, JWT token
│  │  ├─ services.py         # Hàm kết nối gọi API football-data.org
│  │  └─ sync_worker.py      # Bộ chạy ngầm đồng bộ thích ứng tự động
│  ├─ run.py                 # Tệp chạy khởi động Server Uvicorn
│  └─ tools/
│     ├─ migrate.py          # Chạy cập nhật database
│     └─ recreate_db.py      # Xóa và tạo mới toàn bộ cơ sở dữ liệu
├─ epl_frontend/             # Thư mục chứa mã nguồn Frontend React + Vite
│  ├─ src/
│  │  ├─ api/                # Client Axios/Fetch gọi API Backend
│  │  ├─ components/         # Các component UI tái sử dụng (MatchCard, Navbar, StandingsTable...)
│  │  ├─ context/            # AuthContext quản lý trạng thái đăng nhập
│  │  ├─ pages/              # Các màn hình giao diện (Home, Matches, Standings, Details...)
│  │  ├─ types/              # Khai báo kiểu TypeScript Interfaces
│  │  └─ index.css           # Cấu hình phong cách và các biến màu World Cup Premium Light
│  └─ vite.config.ts         # Cấu hình bundling Vite
├─ MOBILE_BLUEPRINT.md       # Tài liệu đặc tả di động dành cho AI Mobile
└─ README.md                 # Tài liệu hướng dẫn này
```

---

## 6. Hướng dẫn cài đặt & Khởi chạy nhanh

### A. Khởi chạy Backend (FastAPI)

1.  Di chuyển vào thư mục backend:
    ```bash
    cd epl_backend
    ```
2.  Tạo môi trường ảo Python và kích hoạt:
    *   **Windows**:
        ```bash
        python -m venv .venv
        .venv\Scripts\activate
        ```
    *   **macOS/Linux**:
        ```bash
        python3 -m venv .venv
        source .venv/bin/activate
        ```
3.  Cài đặt các gói thư viện phụ thuộc:
    ```bash
    pip install -r requirements.txt
    ```
4.  Cấu hình các khóa API và kết nối database trong tệp `.env` tại thư mục `epl_backend/`:
    ```env
    DATABASE_URL=postgresql://postgres:123@localhost:5432/epl_db
    API_TOKEN=your_football_data_token
    GROQ_API_KEY=your_groq_api_key
    TAVILY_API_KEY=your_tavily_api_key
    ```
5.  Khởi chạy server:
    ```bash
    python run.py
    ```
    *Server backend chạy mặc định tại:* `http://127.0.0.1:8000`

### B. Khởi chạy Frontend (React)

1.  Di chuyển vào thư mục frontend:
    ```bash
    cd ../epl_frontend
    ```
2.  Cài đặt các gói npm:
    ```bash
    npm install
    ```
3.  Khởi chạy chế độ phát triển:
    ```bash
    npm run dev
    ```
    *Website frontend chạy mặc định tại:* `http://localhost:5174`

---
*Tài liệu được cập nhật mới nhất ngày 20 tháng 06 năm 2026 sau khi hoàn thành đợt cập nhật FIFA World Cup 2026.*
