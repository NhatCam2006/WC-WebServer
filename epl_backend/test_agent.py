import sys
import os

sys.path.append('.')
from dotenv import load_dotenv
load_dotenv()

try:
    from app.database import SessionLocal
    from app.agent.graph import app_graph
    from app import models
    
    db = SessionLocal()
    match = db.query(models.Match).filter(models.Match.status == "FINISHED").first()
    if not match:
        print("No finished matches found in DB to test!")
        sys.exit(1)
        
    print(f"Testing LangGraph invocation for finished Match ID: {match.id}")
    print(f"Home: {match.home_team_id}, Away: {match.away_team_id}")
    
    # Run graph invoke
    result = app_graph.invoke(
        {"match_id": match.id},
        config={"configurable": {"db": db}}
    )
    
    print("\nSUCCESS! AI Report generated successfully:")
    print(result.get("analysis_result")[:500] + "...")
    db.close()
except Exception as e:
    import traceback
    print("\nFAILED! Exception raised during LangGraph invocation:")
    traceback.print_exc()
