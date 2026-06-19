import { useState, useEffect } from 'react';
import { fetchTeams } from '../api/client';
import type { Team } from '../types';
import TeamCard from '../components/TeamCard';
import './TeamsPage.css';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTeams() {
      setLoading(true);
      try {
        const res = await fetchTeams();
        setTeams(res.data || []);
      } catch (err) {
        console.error('Failed to load teams:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTeams();
  }, []);

  return (
    <div className="page-container" id="teams-page">
      <div className="page-header animate-fade-in">
        <h1 className="page-title">Đội tuyển</h1>
        <p className="page-subtitle">48 đội tuyển quốc gia tham dự World Cup 2026</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Đang tải danh sách đội tuyển...</span>
        </div>
      ) : teams.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🛡️</div>
          <div className="empty-state-text">Chưa có dữ liệu đội tuyển</div>
        </div>
      ) : (
        <>
          <div className="teams-count">
            <span>{teams.length}</span> đội tuyển quốc gia
          </div>
          <div className="teams-grid stagger-children">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
