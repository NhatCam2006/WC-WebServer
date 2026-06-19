import { Link } from 'react-router-dom';
import type { Standing } from '../types';
import './StandingsTable.css';

interface StandingsTableProps {
  standings: Standing[];
  compact?: boolean;
}

function getZoneClass(position: number): string {
  if (position <= 2) return 'qualify';
  if (position === 3) return 'playoff';
  return 'eliminated';
}

function renderForm(form: string | null) {
  if (!form) return null;
  const chars = form.includes(',') ? form.split(',') : form.split('');
  return (
    <div className="standings-form">
      {chars.slice(-5).map((ch, i) => (
        <span key={i} className={`form-dot ${ch.trim()}`}>
          {ch.trim()}
        </span>
      ))}
    </div>
  );
}

export default function StandingsTable({ standings, compact = false }: StandingsTableProps) {
  const data = compact ? standings.slice(0, 4) : standings;

  return (
    <div className="standings-table-wrapper">
      <table className="standings-table" id="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Đội tuyển</th>
            <th>Tr</th>
            <th>T</th>
            <th>H</th>
            <th>B</th>
            <th>Đ</th>
            <th>BT</th>
            <th>BB</th>
            <th>HS</th>
            {!compact && <th>PĐ</th>}
          </tr>
        </thead>
        <tbody className="stagger-children">
          {data.map((s) => {
            const zone = getZoneClass(s.position);
            return (
              <tr key={s.team_id} className={zone ? `zone-${zone}-row` : ''}>
                <td className={`standings-pos ${zone ? `zone-${zone}` : ''}`}>
                  {s.position}
                </td>
                <td>
                  <Link to={`/teams/${s.team_id}`} className="standings-team-cell">
                    {s.crest_url && (
                      <img
                         src={s.crest_url}
                         alt={s.team_name}
                         className="standings-team-crest"
                         loading="lazy"
                      />
                    )}
                    <span className="standings-team-name">{s.team_name}</span>
                    <span className="standings-team-shortname">{s.short_name || s.team_name}</span>
                  </Link>
                </td>
                <td>{s.played_games}</td>
                <td>{s.won}</td>
                <td>{s.draw}</td>
                <td>{s.lost}</td>
                <td className="standings-points">{s.points}</td>
                <td>{s.goals_for}</td>
                <td>{s.goals_against}</td>
                <td className={`standings-gd ${s.goal_difference > 0 ? 'positive' : s.goal_difference < 0 ? 'negative' : ''}`}>
                  {s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference}
                </td>
                {!compact && <td>{renderForm(s.form)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>

      {!compact && (
        <div className="standings-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ background: 'var(--wc-green)' }} />
            Hạng 1-2: Vào vòng Knockout
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: 'var(--draw-amber)' }} />
            Hạng 3: Tranh vé vớt
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: 'var(--live-red)' }} />
            Hạng 4: Bị loại
          </div>
        </div>
      )}
    </div>
  );
}
