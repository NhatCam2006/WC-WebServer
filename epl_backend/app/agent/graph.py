from langgraph.graph import StateGraph, START, END
from app.agent.state import AgentState
from app.agent.nodes import (
    fetch_match_data,
    search_upcoming_stats,
    search_finished_reports,
    analyze_upcoming_match,
    summarize_finished_match,
    respond_to_user
)

# Hàm điều hướng phân nhánh thông minh dựa trên trạng thái trận đấu
def status_routing(state: AgentState) -> str:
    status = state.get("status")
    # Nếu trận đấu đã hoàn thành, đi vào luồng Tóm tắt kết quả sau trận (Recap RAG)
    if status in ["FINISHED", "AWARDED"]:
        return "search_finished_reports"
    # Nếu trận đấu chưa bắt đầu hoặc hoãn, đi vào luồng Nhận định trước trận (Preview RAG)
    else:
        return "search_upcoming_stats"

# Khởi tạo đồ thị StateGraph của LangGraph
workflow = StateGraph(AgentState)

# 1. Khai báo toàn bộ các Node xử lý nghiệp vụ vào Graph
workflow.add_node("fetch_match_data", fetch_match_data)
workflow.add_node("search_upcoming_stats", search_upcoming_stats)
workflow.add_node("search_finished_reports", search_finished_reports)
workflow.add_node("analyze_upcoming_match", analyze_upcoming_match)
workflow.add_node("summarize_finished_match", summarize_finished_match)
workflow.add_node("respond_to_user", respond_to_user)

# 2. Xây dựng cấu trúc cạnh nối (Edges)
workflow.add_edge(START, "fetch_match_data")

# Thêm liên kết điều kiện (Conditional Edges) từ node nạp dữ liệu DB
workflow.add_conditional_edges(
    "fetch_match_data",
    status_routing,
    {
        "search_finished_reports": "search_finished_reports",
        "search_upcoming_stats": "search_upcoming_stats"
    }
)

# Luồng 1: Tóm tắt trận đấu (Finished Recap RAG)
workflow.add_edge("search_finished_reports", "summarize_finished_match")
workflow.add_edge("summarize_finished_match", "respond_to_user")

# Luồng 2: Nhận định trước trận đấu (Upcoming Preview RAG)
workflow.add_edge("search_upcoming_stats", "analyze_upcoming_match")
workflow.add_edge("analyze_upcoming_match", "respond_to_user")

# Kết thúc đồ thị
workflow.add_edge("respond_to_user", END)

# Biên dịch đồ thị LangGraph hoàn chỉnh để gọi trực tiếp từ Router
app_graph = workflow.compile()
