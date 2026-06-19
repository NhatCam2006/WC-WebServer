from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, services

router = APIRouter()

def _score_value(score_section: dict | None, side: str) -> int:
    if not isinstance(score_section, dict):
        return 0
    value = score_section.get(side)
    if value is None:
        value = score_section.get(f"{side}Team")
    return value if value is not None else 0


def _map_players(players: list | None):
    if not isinstance(players, list):
        return []
    mapped = []
    for p in players:
        if not isinstance(p, dict):
            continue
        mapped.append({
            "id": p.get("id"),
            "name": p.get("name"),
            "position": p.get("position"),
            "shirt_number": p.get("shirtNumber")
        })
    return mapped


def _map_team(team_data: dict | None, db: Session):
    if not isinstance(team_data, dict):
        return {
            "id": None,
            "name": "Unknown",
            "short_name": "Unknown",
            "crest_url": None,
            "coach_name": None,
            "lineup": [],
            "bench": []
        }
    team_id = team_data.get("id")
    db_team = db.query(models.Team).filter(models.Team.id == team_id).first() if team_id else None
    name = db_team.name if db_team else team_data.get("name") or "Unknown"
    short_name = db_team.short_name if db_team else team_data.get("shortName") or name
    coach_obj = team_data.get("coach")
    coach_name = coach_obj.get("name") if isinstance(coach_obj, dict) else None
    if not coach_name and db_team:
        coach_name = db_team.coach_name
    return {
        "id": team_id,
        "name": name,
        "short_name": short_name,
        "crest_url": db_team.crest_url if db_team else None,
        "coach_name": coach_name,
        "lineup": _map_players(team_data.get("lineup")),
        "bench": _map_players(team_data.get("bench"))
    }

# 1. API Cổng lệnh: Đồng bộ hoặc cập nhật tỷ số biến động Live của các trận đấu
@router.post("/matches/sync", summary="Cập nhật hoặc đồng bộ tỷ số các trận đấu")
def sync_matches(db: Session = Depends(get_db)):
    success = services.sync_matches_data(db)
    if success:
        return {"status": "success", "message": "Đã đồng bộ toàn bộ lịch thi đấu và tỷ số mới nhất!"}
    
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Quá trình đồng bộ lịch thi đấu thất bại."
    )

# 2. API hiển thị: Lấy danh sách trận đấu (Hỗ trợ bộ lọc xem theo từng vòng đấu matchday)
@router.get("/matches", summary="Lấy danh sách lịch thi đấu và tỷ số Live Score")
def get_matches(
    matchday: int = Query(None, description="Lọc trận đấu theo vòng đấu"),
    stage: str = Query(None, description="Lọc trận đấu theo giai đoạn thi đấu"),
    group: str = Query(None, description="Lọc trận đấu theo bảng đấu"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Match)
    
    if matchday is not None:
        query = query.filter(models.Match.matchday == matchday)
    if stage is not None:
        query = query.filter(models.Match.stage == stage)
    if group is not None:
        query = query.filter(models.Match.group == group)
        
    matches = query.order_by(models.Match.utc_date.asc()).all()
    
    teams = db.query(models.Team).all()
    teams_dict = {t.id: t for t in teams}
    
    matches_list = []
    for m in matches:
        home_team = teams_dict.get(m.home_team_id)
        away_team = teams_dict.get(m.away_team_id)
        
        matches_list.append({
            "match_id": m.id,
            "matchday": m.matchday,
            "stage": m.stage,
            "group": m.group,
            "season_year": m.season_year,
            "status": m.status,
            "utc_date": m.utc_date,
            "home_team": {
                "id": home_team.id if home_team else None,
                "name": home_team.name if home_team else "Unknown",
                "short_name": home_team.short_name if home_team else "Unknown",
                "crest_url": home_team.crest_url if home_team else None
            },
            "away_team": {
                "id": away_team.id if away_team else None,
                "name": away_team.name if away_team else "Unknown",
                "short_name": away_team.short_name if away_team else "Unknown",
                "crest_url": away_team.crest_url if away_team else None
            },
            "score": {
                "half_time": {"home": m.score_half_time_home, "away": m.score_half_time_away},
                "full_time": {"home": m.score_full_time_home, "away": m.score_full_time_away}
            }
        })
        
    return {"status": "success", "count": len(matches_list), "data": matches_list}


@router.get("/matches/{match_id}", summary="Lấy chi tiết trận đấu")
def get_match_detail(match_id: int, db: Session = Depends(get_db)):
    # --- STRATEGY: LOCAL DB FIRST ---
    # Check local DB first for upcoming/scheduled or non-live matches
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    
    if db_match and db_match.status not in ["FINISHED", "IN_PLAY", "PAUSED", "LIVE"]:
        home_team = db.query(models.Team).filter(models.Team.id == db_match.home_team_id).first()
        away_team = db.query(models.Team).filter(models.Team.id == db_match.away_team_id).first()
        
        home_mapped = {
            "id": db_match.home_team_id,
            "name": home_team.name if home_team else "Unknown",
            "short_name": home_team.short_name if home_team else "Unknown",
            "crest_url": home_team.crest_url if home_team else None,
            "coach_name": home_team.coach_name if home_team else None,
            "lineup": [],
            "bench": []
        }
        
        away_mapped = {
            "id": db_match.away_team_id,
            "name": away_team.name if away_team else "Unknown",
            "short_name": away_team.short_name if away_team else "Unknown",
            "crest_url": away_team.crest_url if away_team else None,
            "coach_name": away_team.coach_name if away_team else None,
            "lineup": [],
            "bench": []
        }
        
        print(f"-> [Performance Opt] Serving upcoming/non-live match {match_id} ({db_match.status}) directly from local DB.")
        return {"status": "success", "data": {
            "match_id": db_match.id,
            "utc_date": db_match.utc_date.isoformat() if db_match.utc_date else None,
            "status": db_match.status,
            "matchday": db_match.matchday,
            "stage": db_match.stage if db_match.stage else "GROUP_STAGE",
            "venue": home_team.venue if home_team else None,
            "score": {
                "half_time": {"home": db_match.score_half_time_home, "away": db_match.score_half_time_away},
                "full_time": {"home": db_match.score_full_time_home, "away": db_match.score_full_time_away}
            },
            "home_team": home_mapped, 
            "away_team": away_mapped,
            "goals": [], 
            "bookings": [], 
            "substitutions": [], 
            "referees": [],
            "ai_analysis": db_match.ai_analysis if db_match else None,
        }}

    raw = services.fetch_match_detail(match_id)
    if not raw:
        # Thử lấy dữ liệu dự phòng từ cơ sở dữ liệu PostgreSQL cục bộ
        if not db_match:
            db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
        
        if not db_match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"Không tìm thấy trận đấu ID {match_id} (trong DB lẫn API)"
            )
        
        home_team = db.query(models.Team).filter(models.Team.id == db_match.home_team_id).first()
        away_team = db.query(models.Team).filter(models.Team.id == db_match.away_team_id).first()
        
        home_mapped = {
            "id": db_match.home_team_id,
            "name": home_team.name if home_team else "Unknown",
            "short_name": home_team.short_name if home_team else "Unknown",
            "crest_url": home_team.crest_url if home_team else None,
            "coach_name": home_team.coach_name if home_team else None,
            "lineup": [],
            "bench": []
        }
        
        away_mapped = {
            "id": db_match.away_team_id,
            "name": away_team.name if away_team else "Unknown",
            "short_name": away_team.short_name if away_team else "Unknown",
            "crest_url": away_team.crest_url if away_team else None,
            "coach_name": away_team.coach_name if away_team else None,
            "lineup": [],
            "bench": []
        }
        
        return {"status": "success", "data": {
            "match_id": db_match.id,
            "utc_date": db_match.utc_date.isoformat() if db_match.utc_date else None,
            "status": db_match.status,
            "matchday": db_match.matchday,
            "stage": db_match.stage if db_match.stage else "GROUP_STAGE",
            "venue": home_team.venue if home_team else None,
            "score": {
                "half_time": {"home": db_match.score_half_time_home, "away": db_match.score_half_time_away},
                "full_time": {"home": db_match.score_full_time_home, "away": db_match.score_full_time_away}
            },
            "home_team": home_mapped, 
            "away_team": away_mapped,
            "goals": [], 
            "bookings": [], 
            "substitutions": [], 
            "referees": [],
            "ai_analysis": db_match.ai_analysis if db_match else None,
        }}

    match_data = raw.get("match") if isinstance(raw, dict) and raw.get("match") else raw
    if not isinstance(match_data, dict):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Dữ liệu không hợp lệ.")

    score = match_data.get("score", {})
    full_time = score.get("fullTime") if isinstance(score, dict) else {}
    half_time = score.get("halfTime") if isinstance(score, dict) else {}

    def _goals(raw_list):
        if not isinstance(raw_list, list): return []
        out = []
        for g in raw_list:
            s = g.get("scorer") or {}; a = g.get("assist") or {}; t = g.get("team") or {}
            out.append({"minute": g.get("minute"), "injury_time": g.get("injuryTime"),
                         "type": g.get("type", "REGULAR"), "team_id": t.get("id"),
                         "scorer_name": s.get("name"), "scorer_id": s.get("id"),
                         "assist_name": a.get("name"), "assist_id": a.get("id")})
        return out

    def _bookings(raw_list):
        if not isinstance(raw_list, list): return []
        out = []
        for b in raw_list:
            p = b.get("player") or {}; t = b.get("team") or {}
            out.append({"minute": b.get("minute"), "card": b.get("card"),
                         "team_id": t.get("id"), "player_name": p.get("name"), "player_id": p.get("id")})
        return out

    def _subs(raw_list):
        if not isinstance(raw_list, list): return []
        out = []
        for s in raw_list:
            pi = s.get("playerIn") or {}; po = s.get("playerOut") or {}; t = s.get("team") or {}
            out.append({"minute": s.get("minute"), "team_id": t.get("id"),
                         "player_in_name": pi.get("name"), "player_in_id": pi.get("id"),
                         "player_out_name": po.get("name"), "player_out_id": po.get("id")})
        return out

    def _refs(raw_list):
        if not isinstance(raw_list, list): return []
        return [{"id": r.get("id"), "name": r.get("name"), "role": r.get("role"), "nationality": r.get("nationality")} for r in raw_list]

    home_team = _map_team(match_data.get("homeTeam"), db)
    away_team = _map_team(match_data.get("awayTeam"), db)
    home_id = home_team.get("id")

    goals = _goals(match_data.get("goals"))
    bookings = _bookings(match_data.get("bookings"))
    subs = _subs(match_data.get("substitutions"))
    referees = _refs(match_data.get("referees"))

    for ev in goals + bookings + subs:
        ev["side"] = "home" if ev.get("team_id") == home_id else "away"

    # Trust local DB status and score if it is already marked as FINISHED (prevents API stuck in LIVE/IN_PLAY)
    is_db_finished = db_match and db_match.status == "FINISHED"
    status_val = "FINISHED" if is_db_finished else match_data.get("status")
    
    score_val = {
        "half_time": {"home": db_match.score_half_time_home, "away": db_match.score_half_time_away} if is_db_finished else {"home": _score_value(half_time, "home"), "away": _score_value(half_time, "away")},
        "full_time": {"home": db_match.score_full_time_home, "away": db_match.score_full_time_away} if is_db_finished else {"home": _score_value(full_time, "home"), "away": _score_value(full_time, "away")}
    }

    return {"status": "success", "data": {
        "match_id": match_data.get("id"),
        "utc_date": match_data.get("utcDate"),
        "status": status_val,
        "matchday": match_data.get("matchday"),
        "stage": match_data.get("stage"),
        "venue": match_data.get("venue"),
        "score": score_val,
        "home_team": home_team, "away_team": away_team,
        "goals": goals, "bookings": bookings, "substitutions": subs, "referees": referees,
        "ai_analysis": db_match.ai_analysis if db_match else None,
    }}


# 4. API phân tích hoặc tóm tắt trận đấu bằng AI (LangGraph + Groq + Tavily)
from app.agent.graph import app_graph

@router.post("/matches/{match_id}/ai-analysis", summary="Kích hoạt phân tích nhận định hoặc tóm tắt trận đấu bằng AI Agent")
def get_match_ai_analysis(match_id: int, force_refresh: bool = False, db: Session = Depends(get_db)):
    try:
        # Kiểm tra CSDL cục bộ xem đã có nhận định lưu sẵn chưa để tránh phí API
        db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
        if not db_match:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy trận đấu.")
            
        if db_match.ai_analysis and not force_refresh:
            print(f"-> [Cache Hit] Serving cached AI analysis for match {match_id}")
            return {"status": "success", "data": {"analysis": db_match.ai_analysis}}

        print(f"-> [Cache Miss] Running LangGraph AI Agent for match {match_id} (force_refresh={force_refresh})")
        # Khởi chạy đồ thị LangGraph với db session truyền qua config configurable
        result = app_graph.invoke(
            {"match_id": match_id},
            config={"configurable": {"db": db}}
        )
        analysis = result.get("analysis_result", "Không tạo được kết quả nhận định.")
        
        # Lưu nhận định mới sinh vào cache CSDL
        db_match.ai_analysis = analysis
        db.commit()
        
        return {"status": "success", "data": {"analysis": analysis}}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("====== ERROR IN AI AGENT LANGGRAPH INVOKE ======")
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Quá trình phân tích trận đấu bằng AI thất bại: {e}"
        )


# 5. API lịch sử đối đầu (Head-to-Head) giữa 2 đội
@router.get("/h2h", summary="Lấy lịch sử đối đầu giữa 2 đội bóng")
def get_head_to_head(team1: int, team2: int, db: Session = Depends(get_db)):
    h2h = services.fetch_head_to_head(team1, team2, db)
    return {"status": "success", "count": len(h2h), "data": h2h}


# 6. API lấy trạng thái đồng bộ ngầm của hệ thống
@router.get("/sync/status", summary="Lấy trạng thái đồng bộ ngầm của hệ thống")
def get_sync_status():
    from app import sync_worker
    return {
        "status": "success",
        "last_synced": sync_worker.last_synced_time.isoformat() if sync_worker.last_synced_time else None,
        "is_syncing": sync_worker.is_syncing
    }
