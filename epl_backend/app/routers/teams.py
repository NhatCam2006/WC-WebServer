from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app import models, services

router = APIRouter()

# 1. API Cổng lệnh: Kích hoạt đồng bộ dữ liệu hệ thống từ API Football-Data về PostgreSQL
@router.post("/sync-all", summary="Kích hoạt đồng bộ toàn bộ dữ liệu nền tảng giải đấu")
def sync_all_base_data(db: Session = Depends(get_db)):
    # Đồng bộ thông tin giải đấu
    comp_success = services.sync_competition_data(db)
    # Đồng bộ thông tin 20 câu lạc bộ và danh sách cầu thủ
    teams_success = services.sync_teams_and_players_data(db)
    # Đồng bộ thông tin điểm số bảng xếp hạng và chuỗi phong độ
    standings_success = services.sync_standings_data(db)
    scorers_success = services.sync_scorers_data(db)
    
    if comp_success and teams_success and standings_success:
        return {"status": "success", "message": "Đã cào nạp dữ liệu hệ thống vào PostgreSQL đàng hoàng!", "scorers_synced": scorers_success}
    
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Quá trình đồng bộ dữ liệu thất bại, vui lòng kiểm tra lại API Token hoặc kết nối mạng."
    )

# 2. API hiển thị: Lấy danh sách toàn bộ các câu lạc bộ bóng đá trong DB
@router.get("/teams", summary="Lấy danh sách các đội tuyển quốc gia World Cup 2026")
def get_all_teams(db: Session = Depends(get_db)):
    teams = db.query(models.Team).order_by(models.Team.name.asc()).all()
    return {"status": "success", "count": len(teams), "data": teams}

# 3. API hiển thị: Lấy bảng xếp hạng điểm số hiện tại kèm thông tin đội
@router.get("/standings", summary="Lấy dữ liệu Bảng xếp hạng")
def get_current_standings(db: Session = Depends(get_db)):
    results = db.query(models.Standing, models.Team)\
                .join(models.Team, models.Standing.team_id == models.Team.id)\
                .order_by(models.Standing.group.asc(), models.Standing.position.asc()).all()
                
    grouped_standings = {}
    for standing, team in results:
        # Nhóm theo tên bảng đấu (Ví dụ: 'GROUP_A', 'GROUP_B', ...)
        g_name = standing.group if standing.group else "Others"
        # Định dạng lại tên bảng hiển thị cho đẹp (GROUP_A -> Group A)
        g_display = g_name.replace("GROUP_", "Group ") if g_name.startswith("GROUP_") else g_name
        
        if g_display not in grouped_standings:
            grouped_standings[g_display] = []
            
        grouped_standings[g_display].append({
            "position": standing.position,
            "team_id": team.id,
            "team_name": team.name,
            "short_name": team.short_name,
            "crest_url": team.crest_url,
            "played_games": standing.played_games,
            "won": standing.won,
            "draw": standing.draw,
            "lost": standing.lost,
            "points": standing.points,
            "goals_for": standing.goals_for,
            "goals_against": standing.goals_against,
            "goal_difference": standing.goal_difference,
            "form": standing.form,
            "group": standing.group
        })
        
    return {"status": "success", "data": grouped_standings}

# 4. API hiển thị: Lấy chi tiết thông tin một câu lạc bộ kèm danh sách cầu thủ
@router.get("/teams/{team_id}", summary="Lấy chi tiết đội bóng và cầu thủ")
def get_team_by_id(team_id: int, db: Session = Depends(get_db)):
    team = db.query(models.Team).options(joinedload(models.Team.players)).filter(models.Team.id == team_id).first()
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy thông tin đội bóng với ID {team_id}"
        )
        
    return {"status": "success", "data": team}


# 5. API: Lấy các trận đấu của 1 đội (gần đây và sắp tới)
@router.get("/teams/{team_id}/matches", summary="Lấy các trận đấu đã chơi và sắp tới của 1 đội bóng")
def get_team_recent_matches(team_id: int, db: Session = Depends(get_db)):
    matches = services.fetch_team_matches_all(team_id, db)
    if matches is None:
        raise HTTPException(status_code=404, detail="Không lấy được trận đấu của đội bóng này")
    return {"status": "success", "data": matches}


# 6. API: Lấy thông tin chi tiết cầu thủ
@router.get("/players/{player_id}", summary="Lấy thông tin chi tiết cầu thủ")
def get_player_detail(player_id: int, db: Session = Depends(get_db)):
    # Lấy dữ liệu từ DB trước
    db_player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not db_player:
        raise HTTPException(status_code=404, detail="Cầu thủ không tồn tại")

    # Lấy thêm thông tin từ football-data.org API
    person_data = services.fetch_person_detail(player_id)
    
    team = db.query(models.Team).filter(models.Team.id == db_player.team_id).first()
    
    # Lấy thống kê ghi bàn từ danh sách Vua phá lưới (nếu có)
    db_scorer = db.query(models.Scorer).filter(models.Scorer.player_id == player_id).first()
    stats = None
    if db_scorer:
        stats = {
            "goals": db_scorer.goals,
            "assists": db_scorer.assists,
            "penalties": db_scorer.penalties,
            "played_matches": db_scorer.played_matches
        }
    
    return {
        "status": "success",
        "data": {
            "id": db_player.id,
            "name": db_player.name,
            "position": db_player.position,
            "shirt_number": person_data.get("shirt_number") if person_data else db_player.shirt_number,
            "date_of_birth": str(db_player.date_of_birth) if db_player.date_of_birth else None,
            "nationality": db_player.nationality,
            "team": {
                "id": team.id if team else None,
                "name": team.name if team else None,
                "crest_url": team.crest_url if team else None,
                "short_name": team.short_name if team else None,
            } if team else None,
            "contract": person_data.get("current_team", {}).get("contract") if person_data else None,
            "stats": stats
        }
    }


# 7. API Tìm kiếm toàn cục: Tìm kiếm đội bóng, cầu thủ
@router.get("/search", summary="Tìm kiếm toàn cục đội bóng và cầu thủ")
def search_global(q: str = Query("", description="Từ khóa tìm kiếm"), db: Session = Depends(get_db)):
    if not q or len(q.strip()) < 2:
        return {"status": "success", "data": {"teams": [], "players": []}}
    
    query_str = f"%{q.strip()}%"
    
    # 1. Tìm kiếm đội bóng
    teams = db.query(models.Team).filter(
        (models.Team.name.ilike(query_str)) | (models.Team.short_name.ilike(query_str))
    ).all()
    
    # 2. Tìm kiếm cầu thủ (kèm thông tin đội bóng)
    players = db.query(models.Player, models.Team)\
                .outerjoin(models.Team, models.Player.team_id == models.Team.id)\
                .filter(models.Player.name.ilike(query_str))\
                .limit(20).all()
                
    players_list = []
    for player, team in players:
        players_list.append({
            "id": player.id,
            "name": player.name,
            "position": player.position,
            "shirt_number": player.shirt_number,
            "nationality": player.nationality,
            "team_name": team.name if team else None,
            "team_crest": team.crest_url if team else None,
            "team_id": team.id if team else None
        })
        
    return {
        "status": "success",
        "data": {
            "teams": teams,
            "players": players_list
        }
    }
