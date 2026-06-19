import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append('.')
try:
    from app.database import DATABASE_URL, SessionLocal
    from app import models
    
    db = SessionLocal()
    
    comp_count = db.query(models.Competition).count()
    team_count = db.query(models.Team).count()
    player_count = db.query(models.Player).count()
    match_count = db.query(models.Match).count()
    standing_count = db.query(models.Standing).count()
    scorer_count = db.query(models.Scorer).count()
    config_count = db.query(models.SystemConfig).count()
    log_count = db.query(models.SystemActivityLog).count()
    
    print("--- Database Content Diagnostic ---")
    print(f"Competitions: {comp_count}")
    print(f"Teams: {team_count}")
    print(f"Players: {player_count}")
    print(f"Matches: {match_count}")
    print(f"Standings: {standing_count}")
    print(f"Scorers: {scorer_count}")
    print(f"Configs: {config_count}")
    print(f"Logs: {log_count}")
    
    db.close()
except Exception as e:
    print(f"FAILED to query database content: {e}")
