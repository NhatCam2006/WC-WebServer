// ============================================
// EPL LIVE SCORE — TypeScript Interfaces
// Maps to backend FastAPI response structures
// ============================================

export interface Team {
  id: number;
  name: string;
  short_name: string | null;
  tla: string | null;
  crest_url: string | null;
  founded: number | null;
  club_colors: string | null;
  venue: string | null;
  coach_name: string | null;
  website: string | null;
  last_updated: string | null;
  players?: Player[];
}

export interface Player {
  id: number;
  team_id: number | null;
  name: string;
  position: string | null;
  shirt_number: number | null;
  date_of_birth: string | null;
  nationality: string | null;
}

export interface PlayerDetail {
  id: number;
  name: string;
  position: string | null;
  shirt_number: number | null;
  date_of_birth: string | null;
  nationality: string | null;
  team: {
    id: number | null;
    name: string;
    crest_url: string | null;
    short_name: string | null;
  } | null;
  contract: {
    start: string | null;
    until: string | null;
  } | null;
  stats: {
    goals: number;
    assists: number | null;
    penalties: number | null;
    played_matches: number | null;
  } | null;
}

export interface Scorer {
  rank: number;
  player_id: number | null;
  player_name: string;
  player_nationality: string | null;
  team: {
    id: number | null;
    name: string;
    crest_url: string | null;
    short_name: string | null;
  };
  goals: number;
  assists: number | null;
  penalties: number | null;
  played_matches: number | null;
}

export interface Standing {
  position: number;
  team_id: number;
  team_name: string;
  short_name: string | null;
  crest_url: string | null;
  played_games: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  form: string | null;
  group?: string | null;
}

export interface MatchTeam {
  id: number | null;
  name: string;
  short_name: string;
  crest_url: string | null;
}

export interface MatchScore {
  half_time: { home: number; away: number };
  full_time: { home: number; away: number };
}

export interface Match {
  match_id: number;
  matchday: number | null;
  season_year: number | null;
  status: string | null;
  utc_date: string;
  home_team: MatchTeam;
  away_team: MatchTeam;
  score: MatchScore;
  stage?: string | null;
  group?: string | null;
}

export interface MatchDetailPlayer {
  id: number | null;
  name: string;
  position: string | null;
  shirt_number: number | null;
}

export interface MatchDetailTeam {
  id: number | null;
  name: string;
  short_name: string | null;
  crest_url: string | null;
  coach_name: string | null;
  lineup: MatchDetailPlayer[];
  bench: MatchDetailPlayer[];
}

export interface MatchGoal {
  minute: number | null;
  injury_time: number | null;
  type: string;
  side: 'home' | 'away';
  scorer_name: string | null;
  scorer_id: number | null;
  assist_name: string | null;
  assist_id: number | null;
  team_id: number | null;
}

export interface MatchBooking {
  minute: number | null;
  card: string;
  side: 'home' | 'away';
  player_name: string | null;
  player_id: number | null;
  team_id: number | null;
}

export interface MatchSubstitution {
  minute: number | null;
  side: 'home' | 'away';
  team_id: number | null;
  player_in_name: string | null;
  player_in_id: number | null;
  player_out_name: string | null;
  player_out_id: number | null;
}

export interface MatchReferee {
  id: number | null;
  name: string | null;
  role: string | null;
  nationality: string | null;
}

export interface MatchDetail {
  match_id: number;
  utc_date: string;
  status: string | null;
  matchday: number | null;
  stage: string | null;
  venue: string | null;
  score: MatchScore;
  home_team: MatchDetailTeam;
  away_team: MatchDetailTeam;
  goals: MatchGoal[];
  bookings: MatchBooking[];
  substitutions: MatchSubstitution[];
  referees: MatchReferee[];
  ai_analysis?: string | null;
}

// API Response wrappers
export interface ApiResponse<T> {
  status: string;
  data: T;
  count?: number;
}

// Match status enum-like constants
export const MatchStatus = {
  SCHEDULED: 'SCHEDULED',
  TIMED: 'TIMED',
  IN_PLAY: 'IN_PLAY',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED',
  POSTPONED: 'POSTPONED',
  CANCELLED: 'CANCELLED',
  LIVE: 'LIVE',
} as const;

export type MatchStatusType = (typeof MatchStatus)[keyof typeof MatchStatus];

export function isLive(status: string | null): boolean {
  return status === MatchStatus.IN_PLAY || status === MatchStatus.PAUSED || status === MatchStatus.LIVE;
}

export function isFinished(status: string | null): boolean {
  return status === MatchStatus.FINISHED;
}

export function isScheduled(status: string | null): boolean {
  return status === MatchStatus.SCHEDULED || status === MatchStatus.TIMED;
}
