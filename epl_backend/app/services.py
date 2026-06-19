import requests
from sqlalchemy.orm import Session
from app import models

# KHAI BÁO TOKEN VÀ CẤU TRÚC URL ĐỂ VƯỢT QUA BỘ LỌC
API_TOKEN = "33df00104c7d4d008c49c023699ad311"  # Dán mã Token dài từ Email của bạn vào đây
HEADERS = {"X-Auth-Token": API_TOKEN}

URL_COMPETITION = "https://api.football-data.org/v4/competitions/WC"
URL_TEAMS = "https://api.football-data.org/v4/competitions/WC/teams"
URL_STANDINGS = "https://api.football-data.org/v4/competitions/WC/standings"
URL_MATCHES = "https://api.football-data.org/v4/competitions/WC/matches"
URL_MATCH_DETAIL = "https://api.football-data.org/v4/matches/{match_id}"
URL_SCORERS = "https://api.football-data.org/v4/competitions/WC/scorers?limit=20"
URL_TEAM_MATCHES = "https://api.football-data.org/v4/teams/{team_id}/matches?competitions=WC&limit=10&status=FINISHED"
URL_PERSON = "https://api.football-data.org/v4/persons/{person_id}"

# 1. Hàm đồng bộ thông tin Giải đấu
def sync_competition_data(db: Session):
    try:
        response = requests.get(URL_COMPETITION, headers=HEADERS)
        if response.status_code != 200:
            return False
        data = response.json()
        comp_id = data.get("id")
        db_comp = db.query(models.Competition).filter(models.Competition.id == comp_id).first()
        if not db_comp:
            db_comp = models.Competition(id=comp_id, name=data.get("name"), code=data.get("code"), emblem_url=data.get("emblem"))
            db.add(db_comp)
        else:
            db_comp.name = data.get("name")
            db_comp.code = data.get("code")
            db_comp.emblem_url = data.get("emblem")
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False

# 2. Hàm đồng bộ 20 Đội bóng và danh sách Cầu thủ
def sync_teams_and_players_data(db: Session):
    try:
        response = requests.get(URL_TEAMS, headers=HEADERS)
        if response.status_code != 200:
            return False
        raw_data = response.json()
        teams_list = raw_data.get("teams", [])
        for team_data in teams_list:
            t_id = team_data.get("id")
            coach_obj = team_data.get("coach")
            c_name = coach_obj.get("name") if isinstance(coach_obj, dict) else None
            db_team = db.query(models.Team).filter(models.Team.id == t_id).first()
            if not db_team:
                db_team = models.Team(
                    id=t_id, name=team_data.get("name"), short_name=team_data.get("shortName"),
                    tla=team_data.get("tla"), crest_url=team_data.get("crest"), founded=team_data.get("founded"),
                    club_colors=team_data.get("clubColors"), venue=team_data.get("venue"), coach_name=c_name, website=team_data.get("website")
                )
                db.add(db_team)
            else:
                db_team.name = team_data.get("name")
                db_team.short_name = team_data.get("shortName")
                db_team.tla = team_data.get("tla")
                db_team.crest_url = team_data.get("crest")
                db_team.coach_name = c_name  # type: ignore
                db_team.venue = team_data.get("venue")
            squad_list = team_data.get("squad", [])
            for p_data in squad_list:
                p_id = p_data.get("id")
                db_player = db.query(models.Player).filter(models.Player.id == p_id).first()
                if not db_player:
                    db_player = models.Player(
                        id=p_id, team_id=t_id, name=p_data.get("name"), position=p_data.get("position"),
                        shirt_number=p_data.get("shirtNumber"),
                        date_of_birth=p_data.get("dateOfBirth"), nationality=p_data.get("nationality")
                    )
                    db.add(db_player)
                else:
                    db_player.name = p_data.get("name")
                    db_player.position = p_data.get("position")
                    db_player.shirt_number = p_data.get("shirtNumber")
                    db_player.team_id = t_id
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False

# 3. Hàm đồng bộ Bảng xếp hạng và Phong độ
def sync_standings_data(db: Session):
    try:
        response = requests.get(URL_STANDINGS, headers=HEADERS)
        if response.status_code != 200:
            return False
        raw_data = response.json()
        standings_lists = raw_data.get("standings", [])
        if not standings_lists or not isinstance(standings_lists, list):
            return False
        
        comp_id = raw_data.get("competition", {}).get("id")
        for group_data in standings_lists:
            group_name = group_data.get("group")
            standings_table = group_data.get("table", [])
            for row in standings_table:
                t_id = row.get("team", {}).get("id")
                db_standing = db.query(models.Standing).filter(models.Standing.competition_id == comp_id, models.Standing.team_id == t_id).first()
                if not db_standing:
                    db_standing = models.Standing(
                        competition_id=comp_id, team_id=t_id, position=row.get("position"), played_games=row.get("playedGames"),
                        won=row.get("won"), draw=row.get("draw"), lost=row.get("lost"), points=row.get("points"),
                        goals_for=row.get("goalsFor"), goals_against=row.get("goalsAgainst"), goal_difference=row.get("goalDifference"), form=row.get("form"),
                        group=group_name
                    )
                    db.add(db_standing)
                else:
                    db_standing.position = row.get("position")
                    db_standing.played_games = row.get("playedGames")
                    db_standing.won = row.get("won")
                    db_standing.draw = row.get("draw")
                    db_standing.lost = row.get("lost")
                    db_standing.points = row.get("points")
                    db_standing.goals_for = row.get("goalsFor")
                    db_standing.goals_against = row.get("goalsAgainst")
                    db_standing.goal_difference = row.get("goalDifference")
                    db_standing.form = row.get("form")
                    db_standing.group = group_name
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error in sync_standings_data: {e}")
        return False

# 4. Hàm đồng bộ Lịch thi đấu và Tỷ số Live
from dateutil import parser

def sync_matches_data(db: Session):
    try:
        response = requests.get(URL_MATCHES, headers=HEADERS)
        
        if response.status_code != 200:
            return False
        raw_data = response.json()
        matches_list = raw_data.get("matches", [])
        comp_id = raw_data.get("competition", {}).get("id")
        start_date = raw_data.get("season", {}).get("startDate", "")
        season_year = int(start_date[:4]) if start_date else None

        for match in matches_list:
            m_id = match.get("id")
            score = match.get("score", {})
            
            # Bóc tách an toàn dữ liệu bàn thắng
            half_home = score.get("halfTime", {}).get("home") if isinstance(score.get("halfTime"), dict) else None
            half_away = score.get("halfTime", {}).get("away") if isinstance(score.get("halfTime"), dict) else None
            full_home = score.get("fullTime", {}).get("home") if isinstance(score.get("fullTime"), dict) else None
            full_away = score.get("fullTime", {}).get("away") if isinstance(score.get("fullTime"), dict) else None

            half_home = half_home if half_home is not None else 0
            half_away = half_away if half_away is not None else 0
            full_home = full_home if full_home is not None else 0
            full_away = full_away if full_away is not None else 0

            raw_date = match.get("utcDate")
            formatted_date = parser.parse(raw_date) if raw_date else None

            db_match = db.query(models.Match).filter(models.Match.id == m_id).first()
            
            match_stage = match.get("stage")
            match_group = match.get("group")

            if not db_match:
                db_match = models.Match(
                    id=m_id, competition_id=comp_id, season_year=season_year,
                    home_team_id=match.get("homeTeam", {}).get("id"), away_team_id=match.get("awayTeam", {}).get("id"),
                    utc_date=formatted_date,
                    status=match.get("status"), matchday=match.get("matchday"),
                    stage=match_stage,
                    group=match_group,
                    score_half_time_home=half_home, score_half_time_away=half_away,  # type: ignore
                    score_full_time_home=full_home, score_full_time_away=full_away   # type: ignore
                )
                db.add(db_match)
            else:
                db_match.status = match.get("status")
                db_match.utc_date = formatted_date # type: ignore
                db_match.matchday = match.get("matchday")
                db_match.stage = match_stage
                db_match.group = match_group
                db_match.score_half_time_home = half_home  # type: ignore
                db_match.score_half_time_away = half_away  # type: ignore
                db_match.score_full_time_home = full_home  # type: ignore
                db_match.score_full_time_away = full_away  # type: ignore
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        import traceback
        print("====== ERROR IN SYNC MATCHES ======")
        print(f"Error detail: {e}")
        traceback.print_exc()
        print("====================================")
        return False


def fetch_match_detail(match_id: int):
    response = requests.get(URL_MATCH_DETAIL.format(match_id=match_id), headers=HEADERS)
    if response.status_code != 200:
        return None
    return response.json()


# 5. Hàm đồng bộ Vua phá lưới
def sync_scorers_data(db: Session):
    try:
        response = requests.get(URL_SCORERS, headers=HEADERS)
        if response.status_code != 200:
            return False
        raw_data = response.json()
        scorers_list = raw_data.get("scorers", [])
        comp_id = raw_data.get("competition", {}).get("id")
        start_date = raw_data.get("season", {}).get("startDate", "")
        season_year = int(start_date[:4]) if start_date else None

        # Xóa dữ liệu cũ trước khi cập nhật mới
        db.query(models.Scorer).filter(models.Scorer.competition_id == comp_id).delete()
        db.commit()

        for scorer_data in scorers_list:
            player = scorer_data.get("player", {})
            team = scorer_data.get("team", {})
            db_scorer = models.Scorer(
                player_id=player.get("id"),
                player_name=player.get("name", "Unknown"),
                player_nationality=player.get("nationality"),
                team_id=team.get("id"),
                competition_id=comp_id,
                season_year=season_year,
                goals=scorer_data.get("goals", 0),
                assists=scorer_data.get("assists"),
                penalties=scorer_data.get("penalties"),
                played_matches=scorer_data.get("playedMatches")
            )
            db.add(db_scorer)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error in sync scorers: {e}")
        return False


# 6. Lấy các trận đã đá và sắp tới của 1 đội bóng
def fetch_team_matches_all(team_id: int, db: Session = None):
    # --- STRATEGY: LOCAL DB FIRST ---
    if db is not None:
        try:
            # Query all matches where this team is home or away
            db_matches = db.query(models.Match).filter(
                (models.Match.home_team_id == team_id) | (models.Match.away_team_id == team_id)
            ).order_by(models.Match.utc_date.asc()).all()
            
            if db_matches:
                finished = []
                upcoming = []
                
                for m in db_matches:
                    home_team = db.query(models.Team).filter(models.Team.id == m.home_team_id).first()
                    away_team = db.query(models.Team).filter(models.Team.id == m.away_team_id).first()
                    
                    match_data = {
                        "match_id": m.id,
                        "utc_date": m.utc_date.isoformat() if m.utc_date else None,
                        "status": m.status,
                        "matchday": m.matchday,
                        "home_team": {
                            "id": m.home_team_id,
                            "name": home_team.name if home_team else "Unknown Team",
                            "crest_url": home_team.crest_url if home_team else None
                        },
                        "away_team": {
                            "id": m.away_team_id,
                            "name": away_team.name if away_team else "Unknown Team",
                            "crest_url": away_team.crest_url if away_team else None
                        },
                        "score": {
                            "full_time": {"home": m.score_full_time_home, "away": m.score_full_time_away},
                            "half_time": {"home": m.score_half_time_home, "away": m.score_half_time_away}
                        }
                    }
                    if m.status in ["FINISHED", "AWARDED"]:
                        finished.append(match_data)
                    else:
                        upcoming.append(match_data)
                
                # Take latest 5 finished, reverse so latest is first
                finished_res = finished[-5:]
                finished_res.reverse()
                
                # Take earliest 5 upcoming
                upcoming_res = upcoming[:5]
                
                print(f"-> [Performance Opt] Loaded {len(finished_res)} finished & {len(upcoming_res)} upcoming matches from local PostgreSQL for team {team_id} (instant).")
                return {
                    "finished": finished_res,
                    "upcoming": upcoming_res
                }
        except Exception as db_err:
            print(f"Error querying local DB first for team matches: {db_err}. Falling back to API...")

    # --- FALLBACK: EXTERNAL API CALL ---
    try:
        url = f"https://api.football-data.org/v4/teams/{team_id}/matches?competitions=WC"
        response = requests.get(url, headers=HEADERS)
        if response.status_code != 200:
            raise Exception(f"API trả về mã trạng thái {response.status_code}")
        data = response.json()
        matches = data.get("matches", [])
        
        finished = []
        upcoming = []
        
        for m in matches:
            score = m.get("score", {})
            match_data = {
                "match_id": m.get("id"),
                "utc_date": m.get("utcDate"),
                "status": m.get("status"),
                "matchday": m.get("matchday"),
                "home_team": {"id": m.get("homeTeam", {}).get("id"), "name": m.get("homeTeam", {}).get("name"), "crest_url": m.get("homeTeam", {}).get("crest")},
                "away_team": {"id": m.get("awayTeam", {}).get("id"), "name": m.get("awayTeam", {}).get("name"), "crest_url": m.get("awayTeam", {}).get("crest")},
                "score": {
                    "full_time": score.get("fullTime", {"home": None, "away": None}),
                    "half_time": score.get("halfTime", {"home": None, "away": None})
                }
            }
            if m.get("status") in ["FINISHED", "AWARDED"]:
                finished.append(match_data)
            else:
                upcoming.append(match_data)
                
        # Take latest 5 finished, reverse so latest is first
        finished_res = finished[-5:]
        finished_res.reverse()
        
        # Take earliest 5 upcoming
        upcoming_res = upcoming[:5]
        
        return {
            "finished": finished_res,
            "upcoming": upcoming_res
        }
    except Exception as e:
        print(f"Error fetch_team_matches_all from API fallback: {e}")
        return None


# 7. Lấy lịch sử đối đầu trực tiếp giữa 2 đội (Head-to-Head)
def fetch_head_to_head(team_id_1: int, team_id_2: int, db: Session, limit: int = 6):
    """Lấy tối đa 'limit' trận đã kết thúc giữa 2 đội bóng từ DB cục bộ."""
    try:
        db_matches = db.query(models.Match).filter(
            models.Match.status == "FINISHED",
            (
                (models.Match.home_team_id == team_id_1) & (models.Match.away_team_id == team_id_2)
            ) | (
                (models.Match.home_team_id == team_id_2) & (models.Match.away_team_id == team_id_1)
            )
        ).order_by(models.Match.utc_date.desc()).limit(limit).all()

        result = []
        for m in db_matches:
            home_team = db.query(models.Team).filter(models.Team.id == m.home_team_id).first()
            away_team = db.query(models.Team).filter(models.Team.id == m.away_team_id).first()
            result.append({
                "match_id": m.id,
                "utc_date": m.utc_date.isoformat() if m.utc_date else None,
                "matchday": m.matchday,
                "status": m.status,
                "home_team": {
                    "id": m.home_team_id,
                    "name": home_team.name if home_team else "Unknown",
                    "short_name": home_team.short_name if home_team else "Unknown",
                    "crest_url": home_team.crest_url if home_team else None,
                },
                "away_team": {
                    "id": m.away_team_id,
                    "name": away_team.name if away_team else "Unknown",
                    "short_name": away_team.short_name if away_team else "Unknown",
                    "crest_url": away_team.crest_url if away_team else None,
                },
                "score": {
                    "full_time": {"home": m.score_full_time_home, "away": m.score_full_time_away},
                    "half_time": {"home": m.score_half_time_home, "away": m.score_half_time_away},
                }
            })
        return result
    except Exception as e:
        print(f"Error fetching H2H matches: {e}")
        return []


# 7. Lấy thông tin chi tiết cầu thủ
def fetch_person_detail(person_id: int):
    try:
        response = requests.get(URL_PERSON.format(person_id=person_id), headers=HEADERS)
        if response.status_code != 200:
            return None
        data = response.json()
        return {
            "id": data.get("id"),
            "name": data.get("name"),
            "first_name": data.get("firstName"),
            "last_name": data.get("lastName"),
            "date_of_birth": data.get("dateOfBirth"),
            "nationality": data.get("nationality"),
            "position": data.get("position"),
            "shirt_number": data.get("shirtNumber"),
            "current_team": data.get("currentTeam")
        }
    except Exception:
        return None
