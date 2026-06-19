import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchPlayerById } from '../api/client';
import type { PlayerDetail } from '../types';
import './PlayerDetailPage.css';

function calcAge(dob: string | null): string {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return `${Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))} tuổi`;
}

function formatDate(dob: string | null): string {
  if (!dob) return '—';
  return new Date(dob).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PlayerDetailPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!playerId) return;
      try {
        setLoading(true);
        const res = await fetchPlayerById(Number(playerId));
        setPlayer(res.data);
      } catch {
        setError('Không tìm thấy thông tin cầu thủ này.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [playerId]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container"><div className="spinner" /><span>Đang tải thông tin cầu thủ...</span></div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="page-container">
        <button className="btn-back" onClick={() => navigate(-1)}>← Quay lại</button>
        <div className="empty-state"><div className="empty-state-icon">❌</div><div className="empty-state-text">{error}</div></div>
      </div>
    );
  }

  return (
    <div className="page-container player-detail-page" id="player-detail-page">
      <button className="btn-back animate-fade-in" onClick={() => navigate(-1)}>← Quay lại</button>

      <div className="player-detail-hero animate-fade-in">
        {/* Avatar */}
        <div className="player-detail-avatar">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.name)}`}
            alt={player.name}
            onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(player.name)}`; }}
          />
          {player.shirt_number && (
            <div className="shirt-number-badge">#{player.shirt_number}</div>
          )}
        </div>

        {/* Info */}
        <div className="player-detail-info">
          <h1 className="player-detail-name">{player.name}</h1>
          {player.team && (
            <Link to={`/teams/${player.team.id}`} className="player-team-link">
              {player.team.crest_url && (
                <img src={player.team.crest_url} alt={player.team.name} className="player-team-crest" />
              )}
              <span>{player.team.name}</span>
            </Link>
          )}

          <div className="player-stats-grid">
            <div className="player-stat-item">
              <div className="player-stat-label">Vị trí</div>
              <div className="player-stat-value">{player.position || '—'}</div>
            </div>
            <div className="player-stat-item">
              <div className="player-stat-label">Quốc tịch</div>
              <div className="player-stat-value">{player.nationality || '—'}</div>
            </div>
            <div className="player-stat-item">
              <div className="player-stat-label">Ngày sinh</div>
              <div className="player-stat-value">{formatDate(player.date_of_birth)}</div>
            </div>
            <div className="player-stat-item">
              <div className="player-stat-label">Tuổi</div>
              <div className="player-stat-value">{calcAge(player.date_of_birth)}</div>
            </div>
            {player.contract && (
              <>
                <div className="player-stat-item">
                  <div className="player-stat-label">Bắt đầu HĐ</div>
                  <div className="player-stat-value">{player.contract.start || '—'}</div>
                </div>
                <div className="player-stat-item">
                  <div className="player-stat-label">Hết hạn HĐ</div>
                  <div className="player-stat-value contract-until">{player.contract.until || '—'}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Thống kê hiệu suất mùa giải (Stats Section) */}
      {player.stats && (
        <div className="player-detail-season-stats animate-fade-in">
          <h2 className="stats-section-title">Hiệu suất thi đấu World Cup 2026</h2>
          <div className="stats-cards-grid">
            <div className="stat-value-card">
              <div className="stat-value-card-num">{player.stats.goals}</div>
              <div className="stat-value-card-label">Bàn thắng ⚽</div>
            </div>
            <div className="stat-value-card">
              <div className="stat-value-card-num">{player.stats.assists !== null ? player.stats.assists : '0'}</div>
              <div className="stat-value-card-label">Kiến tạo 🎯</div>
            </div>
            <div className="stat-value-card">
              <div className="stat-value-card-num">
                {player.stats.goals + (player.stats.assists || 0)}
              </div>
              <div className="stat-value-card-label">Đóng góp bàn thắng 🤝</div>
            </div>
            <div className="stat-value-card">
              <div className="stat-value-card-num">{player.stats.played_matches || '—'}</div>
              <div className="stat-value-card-label">Số trận đã đấu 🏃‍♂️</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
