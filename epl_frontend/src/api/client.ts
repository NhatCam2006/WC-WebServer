// ============================================
// EPL LIVE SCORE — API Client
// Fetch wrapper calling FastAPI backend
// ============================================

const BASE_URL = 'http://127.0.0.1:8000/api/v1';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ---- Teams & Standings ----

import type { ApiResponse, Team, Standing, Match, MatchDetail, Scorer, PlayerDetail } from '../types';

export async function fetchTeams(): Promise<ApiResponse<Team[]>> {
  return request<ApiResponse<Team[]>>('/teams');
}

export async function fetchTeamById(teamId: number): Promise<ApiResponse<Team>> {
  return request<ApiResponse<Team>>(`/teams/${teamId}`);
}

export async function fetchStandings(): Promise<ApiResponse<Record<string, Standing[]>>> {
  return request<ApiResponse<Record<string, Standing[]>>>('/standings');
}

// ---- Matches ----

export async function fetchMatches(matchday?: number, stage?: string, group?: string): Promise<ApiResponse<Match[]>> {
  const params = new URLSearchParams();
  if (matchday) params.append('matchday', matchday.toString());
  if (stage) params.append('stage', stage);
  if (group) params.append('group', group);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<ApiResponse<Match[]>>(`/matches${query}`);
}

export async function fetchMatchDetail(matchId: number): Promise<ApiResponse<MatchDetail>> {
  return request<ApiResponse<MatchDetail>>(`/matches/${matchId}`);
}

export async function fetchScorers(): Promise<ApiResponse<Scorer[]>> {
  return request<ApiResponse<Scorer[]>>('/scorers');
}

export async function fetchTeamMatches(teamId: number): Promise<ApiResponse<Match[]>> {
  return request<ApiResponse<Match[]>>(`/teams/${teamId}/matches`);
}

export async function fetchPlayerById(playerId: number): Promise<ApiResponse<PlayerDetail>> {
  return request<ApiResponse<PlayerDetail>>(`/players/${playerId}`);
}

export async function fetchAiAnalysis(matchId: number, forceRefresh?: boolean): Promise<{ status: string; data: { analysis: string } }> {
  const query = forceRefresh ? '?force_refresh=true' : '';
  return request<{ status: string; data: { analysis: string } }>(`/matches/${matchId}/ai-analysis${query}`, { method: 'POST' });
}

export async function fetchH2H(team1: number, team2: number): Promise<ApiResponse<any[]>> {
  return request<ApiResponse<any[]>>(`/h2h?team1=${team1}&team2=${team2}`);
}

// ---- Sync commands ----

export async function syncAll(): Promise<{ status: string; message: string }> {
  return request('/sync-all', { method: 'POST' });
}

export async function syncMatches(): Promise<{ status: string; message: string }> {
  return request('/matches/sync', { method: 'POST' });
}

export interface SyncStatus {
  status: string;
  last_synced: string | null;
  is_syncing: boolean;
}

export async function fetchSyncStatus(): Promise<SyncStatus> {
  return request<SyncStatus>('/sync/status');
}

export interface SearchResult {
  status: string;
  data: {
    teams: Team[];
    players: {
      id: number;
      name: string;
      position: string | null;
      shirt_number: number | null;
      nationality: string | null;
      team_name: string | null;
      team_crest: string | null;
      team_id: number | null;
    }[];
  };
}

export async function fetchSearchResult(q: string): Promise<SearchResult> {
  return request<SearchResult>(`/search?q=${encodeURIComponent(q)}`);
}
