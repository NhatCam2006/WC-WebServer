from typing import TypedDict, Optional, List, Dict, Any

class AgentState(TypedDict):
    match_id: int
    status: str  # FINISHED, SCHEDULED, TIMED, etc.
    match_info: Dict[str, Any]  # Chi tiết trận đấu chính lấy từ PostgreSQL
    home_recent: List[Dict[str, Any]]  # 5 trận gần nhất của đội nhà
    away_recent: List[Dict[str, Any]]  # 5 trận gần nhất của đội khách
    standings: List[Dict[str, Any]]  # Dữ liệu bảng xếp hạng giải đấu của 2 đội
    search_query: str  # Câu truy vấn cào web tối ưu cho từng nhánh
    search_results: str  # Kết quả cào tin từ Tavily (chấn thương, góc, thẻ, báo cáo đấu)
    analysis_result: Optional[str]  # Nội dung phân tích chiến thuật hoặc tóm tắt Markdown cuối cùng
