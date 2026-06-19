import { useState, useEffect } from 'react';
import { fetchScorers } from '../api/client';
import type { Scorer } from '../types';
import './ScorersPage.css';

export default function ScorersPage() {
  const [scorers, setScorers] = useState<Scorer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadScorers() {
      try {
        const res = await fetchScorers();
        setScorers(res.data || []);
      } catch {
        setError('Không thể tải danh sách Vua phá lưới. Hãy nhấn Sync để cập nhật dữ liệu.');
      } finally {
        setLoading(false);
      }
    }
    loadScorers();
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner" />
          <span>Đang tải Vua phá lưới...</span>
        </div>
      </div>
    );
  }

  const topThree = scorers.slice(0, 3);
  const remainingScorers = scorers.slice(3);

  const renderPodiumCard = (s: Scorer, type: 'gold' | 'silver' | 'bronze') => {
    const medal = type === 'gold' ? '🥇' : type === 'silver' ? '🥈' : '🥉';
    const rankTitle = type === 'gold' ? 'Hạng 1' : type === 'silver' ? 'Hạng 2' : 'Hạng 3';
    return (
      <div className={`podium-card podium-${type}`}>
        <div className="podium-rank-tag">{rankTitle}</div>
        <div className="podium-badge">{medal}</div>
        
        <div className="podium-avatar-wrapper">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.player_name)}`}
            alt={s.player_name}
            onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.player_name)}`; }}
            className="podium-avatar"
          />
          {s.team.crest_url && (
            <img src={s.team.crest_url} alt={s.team.name} className="podium-team-crest" />
          )}
        </div>

        <div className="podium-info">
          <div className="podium-name">{s.player_name}</div>
          <div className="podium-team-name">{s.team.short_name || s.team.name}</div>
        </div>

        <div className="podium-goals-badge">
          <span className="goals-num">{s.goals}</span>
          <span className="goals-unit">bàn</span>
        </div>
        
        {s.assists !== null && (
          <div className="podium-assists">
            <span>{s.assists} kiến tạo</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-container" id="scorers-page">
      <div className="page-header animate-fade-in">
        <h1 className="page-title">Vua Phá Lưới</h1>
        <p className="page-subtitle">FIFA World Cup 2026 — Top Scorers</p>
      </div>

      {error ? (
        <div className="scorers-error">
          <p>{error}</p>
        </div>
      ) : scorers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚽</div>
          <div className="empty-state-text">Chưa có dữ liệu. Nhấn Sync để cập nhật!</div>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Layout */}
          {topThree.length > 0 && (
            <div className="scorers-podium-container animate-fade-in">
              <div className="scorers-podium">
                {/* 2nd place */}
                {topThree[1] && renderPodiumCard(topThree[1], 'silver')}
                
                {/* 1st place */}
                {topThree[0] && renderPodiumCard(topThree[0], 'gold')}
                
                {/* 3rd place */}
                {topThree[2] && renderPodiumCard(topThree[2], 'bronze')}
              </div>
            </div>
          )}

          {/* Remaining players table */}
          {remainingScorers.length > 0 && (
            <div className="scorers-table-wrapper animate-fade-in">
              <table className="scorers-table">
                <thead>
                  <tr>
                    <th className="col-rank">#</th>
                    <th className="col-player">Cầu thủ</th>
                    <th className="col-team">Đội tuyển</th>
                    <th className="col-goals" title="Bàn thắng">⚽ Bàn</th>
                    <th className="col-assists" title="Kiến tạo">🎯 KT</th>
                    <th className="col-pens" title="Bàn thắng từ phạt đền">🎯 PK</th>
                    <th className="col-played" title="Trận đã chơi">📊 Trận</th>
                  </tr>
                </thead>
                <tbody>
                  {remainingScorers.map((s) => (
                    <tr key={s.player_id} className="scorer-row">
                      <td className="col-rank">
                        <span className="rank-badge">{s.rank}</span>
                      </td>
                      <td className="col-player">
                        <div className="scorer-player-info">
                          <div className="scorer-avatar">
                            <img
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.player_name)}`}
                              alt={s.player_name}
                              onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.player_name)}`; }}
                            />
                          </div>
                          <div>
                            <div className="scorer-name">{s.player_name}</div>
                            <div className="scorer-nat">{s.player_nationality}</div>
                          </div>
                        </div>
                      </td>
                      <td className="col-team">
                        <div className="scorer-team-info">
                          {s.team.crest_url && (
                            <img src={s.team.crest_url} alt={s.team.name} className="scorer-team-crest" />
                          )}
                          <span>{s.team.short_name || s.team.name}</span>
                        </div>
                      </td>
                      <td className="col-goals">
                        <span className="goals-count">{s.goals}</span>
                      </td>
                      <td className="col-assists">{s.assists ?? '-'}</td>
                      <td className="col-pens">{s.penalties ?? '-'}</td>
                      <td className="col-played">{s.played_matches ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
