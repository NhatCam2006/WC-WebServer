from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, services

router = APIRouter()


@router.get("/scorers", summary="Lấy danh sách Vua phá lưới World Cup 2026")
def get_scorers(db: Session = Depends(get_db)):
    scorers = db.query(models.Scorer).order_by(models.Scorer.goals.desc()).all()
    result = []
    for s in scorers:
        team = db.query(models.Team).filter(models.Team.id == s.team_id).first()
        result.append({
            "rank": len(result) + 1,
            "player_id": s.player_id,
            "player_name": s.player_name,
            "player_nationality": s.player_nationality,
            "team": {
                "id": team.id if team else None,
                "name": team.name if team else "Unknown",
                "crest_url": team.crest_url if team else None,
                "short_name": team.short_name if team else None,
            },
            "goals": s.goals,
            "assists": s.assists,
            "penalties": s.penalties,
            "played_matches": s.played_matches,
        })
    return {"status": "success", "count": len(result), "data": result}


@router.post("/scorers/sync", summary="Đồng bộ Vua phá lưới")
def sync_scorers(db: Session = Depends(get_db)):
    success = services.sync_scorers_data(db)
    if success:
        return {"status": "success", "message": "Đã cập nhật danh sách Vua phá lưới!"}
    return {"status": "error", "message": "Đồng bộ thất bại."}
