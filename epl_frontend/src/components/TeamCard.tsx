import { Link } from 'react-router-dom';
import type { Team } from '../types';
import './TeamCard.css';

interface TeamCardProps {
  team: Team;
}

export default function TeamCard({ team }: TeamCardProps) {
  return (
    <Link to={`/teams/${team.id}`} className="team-card" id={`team-${team.id}`}>
      {team.founded && (
        <span className="team-card-founded">Est. {team.founded}</span>
      )}

      {team.crest_url ? (
        <img
          src={team.crest_url}
          alt={team.name}
          className="team-card-crest"
          loading="lazy"
        />
      ) : (
        <div className="team-card-crest-placeholder">🛡️</div>
      )}

      <div className="team-card-info">
        <div className="team-card-name">{team.name}</div>
        {team.tla && <div className="team-card-tla">{team.tla}</div>}
      </div>

      <div className="team-card-meta">
        {team.venue && (
          <div className="team-card-meta-item">
            {team.venue}
          </div>
        )}
        {team.coach_name && (
          <div className="team-card-meta-item">
            {team.coach_name}
          </div>
        )}
      </div>
    </Link>
  );
}
