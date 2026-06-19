import type { Match } from '../types';
import { isLive, isFinished, isScheduled } from '../types';
import { Link } from 'react-router-dom';
import LiveBadge from './LiveBadge';
import './MatchCard.css';

interface MatchCardProps {
  match: Match;
  showMatchday?: boolean;
  linkToDetail?: boolean;
}

function formatTime(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDate(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function TeamCrest({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="match-team-crest"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  return <div className="match-team-crest placeholder">🛡️</div>;
}

export default function MatchCard({ match, showMatchday = false, linkToDetail = true }: MatchCardProps) {
  const live = isLive(match.status);
  const finished = isFinished(match.status);
  const scheduled = isScheduled(match.status);

  const content = (
    <>
      {showMatchday && match.matchday && (
        <span className="match-matchday">MD {match.matchday}</span>
      )}

      {/* Home Team */}
      <div className="match-team home">
        <TeamCrest url={match.home_team.crest_url} name={match.home_team.name} />
        <div>
          <div className="match-team-name">{match.home_team.name}</div>
          <div className="match-team-shortname">{match.home_team.short_name}</div>
        </div>
      </div>

      {/* Center: Score or Time */}
      <div className="match-center">
        {scheduled ? (
          <div className="match-status">
            <div className="match-scheduled-time">{formatTime(match.utc_date)}</div>
            <div className="match-scheduled-date">{formatDate(match.utc_date)}</div>
          </div>
        ) : (
          <>
            <div className={`match-score ${live ? 'live-score' : ''}`}>
              <span>{match.score.full_time.home}</span>
              <span className="match-score-divider" />
              <span>{match.score.full_time.away}</span>
            </div>
            <div className="match-status">
              {live && <LiveBadge />}
              {finished && <span className="match-finished-badge">KT</span>}
              {finished && (
                <span className="match-halftime">
                  HT {match.score.half_time.home} - {match.score.half_time.away}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Away Team */}
      <div className="match-team away">
        <TeamCrest url={match.away_team.crest_url} name={match.away_team.name} />
        <div>
          <div className="match-team-name">{match.away_team.name}</div>
          <div className="match-team-shortname">{match.away_team.short_name}</div>
        </div>
      </div>
    </>
  );

  if (linkToDetail) {
    return (
      <Link to={`/matches/${match.match_id}`} className={`match-card ${live ? 'is-live' : ''}`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={`match-card ${live ? 'is-live' : ''}`}>
      {content}
    </div>
  );
}
