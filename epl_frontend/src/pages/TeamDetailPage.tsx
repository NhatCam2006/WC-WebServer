import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchTeamById, fetchTeamMatches } from '../api/client';
import type { Team, Player } from '../types';
import './TeamDetailPage.css';

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCssColor = (colorName: string) => {
    const c = colorName.toLowerCase().trim();
    const map: Record<string, string> = {
      'red': '#ef4444',
      'white': '#f8fafc',
      'black': '#0f172a',
      'blue': '#3b82f6',
      'navy blue': '#1e3a8a',
      'sky blue': '#38bdf8',
      'claret': '#831843',
      'yellow': '#eab308',
      'gold': '#ca8a04',
      'green': '#22c55e',
      'purple': '#9333ea',
      'orange': '#f97316',
      'burgundy': '#800020',
      'royal blue': '#4169E1',
      'silver': '#94a3b8',
      'grey': '#64748b'
    };
    return map[c] || c.replace(' ', ''); // Fallback
  };

  const renderColorIcon = (colorsStr: string) => {
    const colors = colorsStr.split('/').map(c => getCssColor(c));
    let style: React.CSSProperties = { background: colors[0] };
    
    if (colors.length === 2) {
      style.background = `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50.5%)`;
    } else if (colors.length >= 3) {
      style.background = `linear-gradient(135deg, ${colors[0]} 33%, ${colors[1]} 33.5%, ${colors[1]} 66%, ${colors[2]} 66.5%)`;
    }
    return <span className="color-icon" style={style} />;
  };

  const formatTime = (utcDate: string) => {
    const d = new Date(utcDate);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (utcDate: string) => {
    const d = new Date(utcDate);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  useEffect(() => {
    async function loadTeam() {
      if (!teamId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetchTeamById(parseInt(teamId, 10));
        setTeam(res.data);
      } catch (err: any) {
        console.error('Failed to load team details:', err);
        setError('Không thể tải dữ liệu đội bóng. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    }
    loadTeam();
  }, [teamId]);

  useEffect(() => {
    async function loadMatches() {
      if (!teamId) return;
      setLoadingMatches(true);
      try {
        const res = await fetchTeamMatches(parseInt(teamId, 10));
        // Parse the new dynamic dual-array response
        const finished = res.data ? (res.data as any).finished || [] : [];
        const upcoming = res.data ? (res.data as any).upcoming || [] : [];
        setRecentMatches(finished);
        setUpcomingMatches(upcoming);
      } catch (err) {
        console.error('Failed to load recent team matches:', err);
      } finally {
        setLoadingMatches(false);
      }
    }
    loadMatches();
  }, [teamId]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner" />
          <span>Đang tải thông tin...</span>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-text" style={{ fontFamily: 'var(--font-mono)' }}>[ ERROR: {error || 'TEAM NOT FOUND'} ]</div>
          <button className="back-btn" onClick={() => navigate(-1)} style={{ fontFamily: 'var(--font-mono)', marginTop: '24px' }}>[ BACK ]</button>
        </div>
      </div>
    );
  }

  const getPositionInfo = (pos: string | null) => {
    if (!pos) return { short: 'UNK', type: 'unknown' };
    const p = pos.toUpperCase();
    
    if (p.includes('GOALKEEPER') || p === 'GK') return { short: 'GK', type: 'gk' };
    
    if (p === 'DEFENCE' || p === 'DEFENDER' || p === 'CB' || p.includes('BACK')) {
      if (p.includes('CENTRE') || p === 'CB') return { short: 'CB', type: 'def' };
      if (p.includes('LEFT') || p === 'LB' || p === 'LWB') return { short: 'LB', type: 'def' };
      if (p.includes('RIGHT') || p === 'RB' || p === 'RWB') return { short: 'RB', type: 'def' };
      return { short: 'DEF', type: 'def' };
    }
    
    if (p.includes('MIDFIELD') || p === 'CM' || p === 'CDM' || p === 'CAM' || p === 'LM' || p === 'RM' || p === 'AM') {
      if (p.includes('DEFENSIVE') || p === 'CDM') return { short: 'CDM', type: 'mid' };
      if (p.includes('ATTACKING') || p === 'CAM' || p === 'AM') return { short: 'CAM', type: 'mid' };
      if (p.includes('LEFT') || p === 'LM') return { short: 'LM', type: 'mid' };
      if (p.includes('RIGHT') || p === 'RM') return { short: 'RM', type: 'mid' };
      return { short: 'CM', type: 'mid' };
    }
    
    if (p.includes('OFFENCE') || p.includes('ATTACKER') || p.includes('FORWARD') || p.includes('WING') || p === 'ST' || p === 'RW' || p === 'LW' || p === 'CF') {
      if (p.includes('LEFT') || p === 'LW') return { short: 'LW', type: 'att' };
      if (p.includes('RIGHT') || p === 'RW') return { short: 'RW', type: 'att' };
      if (p.includes('CENTRE') || p === 'CF') return { short: 'CF', type: 'att' };
      if (p === 'STRIKER' || p === 'ST') return { short: 'ST', type: 'att' };
      return { short: 'ATT', type: 'att' };
    }

    const short = p.replace(/[^A-Z]/g, '').slice(0, 2) || 'UNK';
    return { short, type: 'unknown' };
  };

  const goalkeepers = team.players?.filter(p => getPositionInfo(p.position).type === 'gk') || [];
  const defenders = team.players?.filter(p => getPositionInfo(p.position).type === 'def') || [];
  const midfielders = team.players?.filter(p => getPositionInfo(p.position).type === 'mid') || [];
  const attackers = team.players?.filter(p => getPositionInfo(p.position).type === 'att') || [];
  const unknownPosition = team.players?.filter(p => getPositionInfo(p.position).type === 'unknown') || [];

  const renderPlayerSection = (title: string, players: Player[]) => {
    if (players.length === 0) return null;
    return (
      <div className="player-section">
        <h3 className="player-section-title">{title}</h3>
        <div className="players-grid">
          {players.map((player) => (
            <Link key={player.id} to={`/players/${player.id}`} className="player-card-link">
              <div className="player-card">
                <div className="player-avatar-placeholder">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.name)}`} 
                    alt={player.name} 
                    onError={(e) => {
                      e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(player.name)}`;
                    }}
                  />
                </div>
                <div className="player-info">
                  <div className="player-header-top">
                    <div className="player-name">{player.name}</div>
                    <span className={`position-badge pos-${getPositionInfo(player.position).type}`}>
                      {getPositionInfo(player.position).short}
                    </span>
                  </div>
                  <div className="player-meta">
                    {player.nationality && (
                      <span className="player-nat" title={player.nationality}>{player.nationality}</span>
                    )}
                    {player.date_of_birth && (
                      <span className="player-dob">{new Date(player.date_of_birth).getFullYear()}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const renderUpcomingMatches = () => {
    if (loadingMatches) {
      return (
        <div className="sidebar-loading">
          <div className="spinner small-spinner" />
          <span>Đang tải lịch thi đấu...</span>
        </div>
      );
    }
    if (upcomingMatches.length === 0) {
      return <div className="sidebar-empty">Không có trận đấu sắp tới</div>;
    }
    return (
      <ul className="sidebar-matches-list">
        {upcomingMatches.map((m) => {
          const isHome = m.home_team.id === team.id;
          const opponent = isHome ? m.away_team : m.home_team;
          
          return (
            <Link key={m.match_id} to={`/matches/${m.match_id}`} className="sidebar-match-link">
              <li className="sidebar-match-item upcoming">
                <div className="sidebar-match-top">
                  <span className="sidebar-match-date">
                    {formatDate(m.utc_date)} — {formatTime(m.utc_date)}
                  </span>
                  <span className="sidebar-match-day-badge">Vòng {m.matchday}</span>
                </div>
                <div className="sidebar-match-teams">
                  <span className="opp-crest-name">
                    {opponent.crest_url && (
                      <img src={opponent.crest_url} alt="" className="opp-crest" />
                    )}
                    {opponent.short_name || opponent.name}
                  </span>
                  <span className="sidebar-match-venue-badge">
                    {isHome ? 'Sân nhà' : 'Sân khách'}
                  </span>
                </div>
              </li>
            </Link>
          );
        })}
      </ul>
    );
  };

  const renderRecentMatches = () => {
    if (loadingMatches) {
      return (
        <div className="sidebar-loading">
          <div className="spinner small-spinner" />
          <span>Đang tải kết quả...</span>
        </div>
      );
    }
    if (recentMatches.length === 0) {
      return <div className="sidebar-empty">Không tìm thấy trận đấu gần đây</div>;
    }
    return (
      <ul className="sidebar-matches-list">
        {recentMatches.map((m) => {
          const isHome = m.home_team.id === team.id;
          const scoreHome = m.score?.full_time?.home ?? 0;
          const scoreAway = m.score?.full_time?.away ?? 0;
          let resultChar = 'H';
          let resultClass = 'result-d';
          let resultText = 'Hòa';

          if (scoreHome > scoreAway) {
            resultChar = isHome ? 'T' : 'B';
            resultClass = isHome ? 'result-w' : 'result-l';
            resultText = isHome ? 'Thắng' : 'Thua';
          } else if (scoreHome < scoreAway) {
            resultChar = isHome ? 'B' : 'T';
            resultClass = isHome ? 'result-l' : 'result-w';
            resultText = isHome ? 'Thua' : 'Thắng';
          }

          const opponent = isHome ? m.away_team : m.home_team;

          return (
            <Link key={m.match_id} to={`/matches/${m.match_id}`} className="sidebar-match-link">
              <li className="sidebar-match-item">
                <div className="sidebar-match-top">
                  <span className="sidebar-match-date">
                    {formatDate(m.utc_date)}
                  </span>
                  <span className={`result-bubble-small ${resultClass}`} title={resultText}>
                    {resultChar}
                  </span>
                </div>
                <div className="sidebar-match-teams">
                  <span className="opp-crest-name">
                    {opponent.crest_url && (
                      <img src={opponent.crest_url} alt="" className="opp-crest" />
                    )}
                    {opponent.short_name || opponent.name}
                  </span>
                  <span className="sidebar-match-score">
                    {m.score.full_time.home} - {m.score.full_time.away}
                  </span>
                </div>
              </li>
            </Link>
          );
        })}
      </ul>
    );
  };

  // Extract primary club color for dynamic styling
  const clubColors = team.club_colors
    ? team.club_colors.split('/').map(c => getCssColor(c))
    : ['#ccff00'];
  const primaryColor = clubColors[0];
  const isLightText = primaryColor.toLowerCase() === '#f8fafc' || primaryColor.toLowerCase() === '#ffffff' || primaryColor.toLowerCase() === 'white';

  return (
    <div className="page-container team-detail-page animate-fade-in" id={`team-detail-${team.id}`}>
      <button className="back-btn" onClick={() => navigate(-1)} style={{ fontFamily: 'var(--font-mono)' }}>
        [ BACK ]
      </button>

      {/* Header Banner */}
      <div 
        className="team-header" 
        style={{
          background: `linear-gradient(135deg, rgba(255, 255, 255, 0.01) 0%, rgba(255, 255, 255, 0.005) 100%), radial-gradient(circle at 10% 20%, ${primaryColor}15 0%, transparent 60%)`,
          borderColor: `${primaryColor}22`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px ${primaryColor}06`
        }}
      >
        <div 
          className="team-header-crest-wrapper"
          style={{
            borderColor: `${primaryColor}22`,
            boxShadow: `0 4px 20px rgba(0, 0, 0, 0.4), 0 0 15px ${primaryColor}10`
          }}
        >
          {team.crest_url ? (
            <img src={team.crest_url} alt={team.name} className="team-header-crest" />
          ) : (
            <div className="team-header-crest-placeholder" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>[ NO CREST ]</div>
          )}
        </div>
        <div className="team-header-info">
          <h1 className="team-title" style={{ textShadow: `0 0 20px ${primaryColor}30` }}>{team.name}</h1>
          <div className="team-subtitle">
            {team.tla && (
              <span 
                className="team-tla"
                style={{
                  background: primaryColor,
                  color: isLightText ? '#0f172a' : '#ffffff'
                }}
              >
                {team.tla}
              </span>
            )}
            {team.founded && <span className="team-founded">Est. {team.founded}</span>}
          </div>
        </div>
      </div>

      {/* Symmetrical Two-Column Portal Layout */}
      <div className="team-layout">
        {/* Main Content - Squad List */}
        <div className="team-main-content">
          <div className="team-squad-section">
            <h2 className="team-section-title" style={{ fontFamily: 'var(--font-body)', fontWeight: 800 }}>::: ĐỘI HÌNH CHÍNH THỨC</h2>
            {team.players && team.players.length > 0 ? (
              <div className="squad-container stagger-children">
                {renderPlayerSection('Thủ môn', goalkeepers)}
                {renderPlayerSection('Hậu vệ', defenders)}
                {renderPlayerSection('Tiền vệ', midfielders)}
                {renderPlayerSection('Tiền đạo', attackers)}
                {renderPlayerSection('Khác', unknownPosition)}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-text" style={{ fontFamily: 'var(--font-mono)' }}>[ NO PLAYER DATA AVAILABLE ]</div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Recent Matches & Stats */}
        <div className="team-sidebar">
          {/* Club Info Stats Card */}
          <div className="sidebar-card team-info-card cyber-glow-card">
            <h3 className="sidebar-section-title" style={{ fontFamily: 'var(--font-body)', fontWeight: 800 }}>::: THÔNG TIN ĐỘI TUYỂN</h3>
            <ul className="team-info-list" style={{ fontFamily: 'var(--font-mono)' }}>
              {team.venue && (
                <li>
                  <span className="info-lbl">SÂN VẬN ĐỘNG</span>
                  <span className="info-val">{team.venue}</span>
                </li>
              )}
              {team.coach_name && (
                <li>
                  <span className="info-lbl">HUẤN LUYỆN VIÊN</span>
                  <span className="info-val">{team.coach_name}</span>
                </li>
              )}
              {team.club_colors && (
                <li>
                  <span className="info-lbl">MÀU TRUYỀN THỐNG</span>
                  <span className="info-val">
                    {renderColorIcon(team.club_colors)}
                    <span className="color-text-lbl">{team.club_colors}</span>
                  </span>
                </li>
              )}
              {team.website && (
                <li>
                  <span className="info-lbl">WEBSITE</span>
                  <span className="info-val">
                    <a href={team.website} target="_blank" rel="noreferrer" className="team-website-link">
                      [ VISIT_SITE ]
                    </a>
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Upcoming Matches */}
          <div className="sidebar-card team-matches-card cyber-glow-card">
            <h3 className="sidebar-section-title" style={{ fontFamily: 'var(--font-body)', fontWeight: 800 }}>::: LỊCH THI ĐẤU SẮP TỚI</h3>
            {renderUpcomingMatches()}
          </div>

          {/* Recent Matches */}
          <div className="sidebar-card team-matches-card cyber-glow-card">
            <h3 className="sidebar-section-title" style={{ fontFamily: 'var(--font-body)', fontWeight: 800 }}>::: KẾT QUẢ GẦN ĐÂY</h3>
            {renderRecentMatches()}
          </div>
        </div>
      </div>
    </div>
  );
}
