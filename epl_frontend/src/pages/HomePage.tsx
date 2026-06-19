import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchMatches, fetchStandings, fetchSyncStatus } from '../api/client';
import type { Match, Standing } from '../types';
import { isLive, isScheduled } from '../types';
import MatchCard from '../components/MatchCard';
import StandingsTable from '../components/StandingsTable';
import './HomePage.css';

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Record<string, Standing[]>>({});
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<{ lastSynced: string | null; isSyncing: boolean }>({
    lastSynced: null,
    isSyncing: false
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [matchRes, standRes, syncRes] = await Promise.all([
          fetchMatches(),
          fetchStandings(),
          fetchSyncStatus().catch(() => ({ status: 'error', last_synced: null, is_syncing: false }))
        ]);
        setMatches(matchRes.data || []);
        setStandings(standRes.data || {});
        setSyncStatus({
          lastSynced: syncRes.last_synced,
          isSyncing: syncRes.is_syncing
        });
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Background Auto-Polling every 30 seconds when the component is active
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [matchRes, standRes, syncRes] = await Promise.all([
          fetchMatches(),
          fetchStandings(),
          fetchSyncStatus().catch(() => ({ status: 'error', last_synced: null, is_syncing: false }))
        ]);
        setMatches(matchRes.data || []);
        setStandings(standRes.data || {});
        setSyncStatus({
          lastSynced: syncRes.last_synced,
          isSyncing: syncRes.is_syncing
        });
      } catch (err) {
        console.error('Failed to poll homepage updates:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Compute featured matches: live first, then latest finished, then next scheduled
  const liveMatches = matches.filter((m) => isLive(m.status));
  const scheduledMatches = matches
    .filter((m) => isScheduled(m.status))
    .sort((a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime());
  const finishedMatches = matches
    .filter((m) => m.status === 'FINISHED')
    .sort((a, b) => new Date(b.utc_date).getTime() - new Date(a.utc_date).getTime());

  const liveAndRecentMatches = liveMatches.length > 0
    ? [...liveMatches, ...finishedMatches.slice(0, 2)]
    : finishedMatches.slice(0, 4);

  const upcomingFeaturedMatches = scheduledMatches.slice(0, 4);

  // Stats
  const totalFinished = finishedMatches.length;
  const totalScheduled = scheduledMatches.length;
  const currentMatchday = matches.length > 0
    ? Math.max(...matches.filter(m => m.status === 'FINISHED' && m.stage === 'GROUP_STAGE').map(m => m.matchday || 0))
    : 0;

  const groupAStandings = standings['Group A'] || [];

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner" />
          <span>Đang tải dữ liệu World Cup...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" id="home-page">
      {/* Live Sync Status Bar */}
      <div className="live-sync-indicator-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '24px' }}>
        <span className="sync-text" style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
          {syncStatus.isSyncing ? '[SYS_STATUS: SYNCING_DATA]' : '[SYS_STATUS: ONLINE_LIVE]'}
        </span>
        {syncStatus.lastSynced && (
          <span className="sync-time" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            LƯỢT CẬP NHẬT: {new Date(syncStatus.lastSynced).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>

      {/* Hero */}
      <div className="home-hero animate-fade-in">
        <div className="home-hero-text">
          <h1 className="home-hero-title">
            FIFA World Cup 2026<br />
            <span className="accent">Live Score</span>
          </h1>
          <p className="home-hero-subtitle">
            Giải vô địch bóng đá thế giới 2026 • Mỹ, Canada, Mexico • ENGINE v1.0
          </p>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="home-stats animate-fade-in">
        <div className="home-stat-card cyber-glow-card">
          <div className="home-stat-value">{currentMatchday || 3}</div>
          <div className="home-stat-label">Lượt trận vòng bảng</div>
        </div>
        <div className="home-stat-card cyber-glow-card">
          <div className="home-stat-value" style={{ color: 'var(--live-red)' }}>{liveMatches.length}</div>
          <div className="home-stat-label">Đang diễn ra</div>
        </div>
        <div className="home-stat-card cyber-glow-card">
          <div className="home-stat-value">{totalFinished}</div>
          <div className="home-stat-label">Đã kết thúc</div>
        </div>
        <div className="home-stat-card cyber-glow-card">
          <div className="home-stat-value">{totalScheduled}</div>
          <div className="home-stat-label">Sắp diễn ra</div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="home-main-layout animate-fade-in">
        <div className="home-main-content">
          {/* 1. Trận đấu đang diễn ra & Kết quả gần đây */}
          {liveAndRecentMatches.length > 0 && (
            <section className="home-section animate-fade-in">
              <div className="section-header">
                <h2 className="section-title">
                  {liveMatches.length > 0 ? 'Trận đấu trực tiếp & Kết quả gần đây' : 'Kết quả gần đây'}
                </h2>
                <Link to="/matches" className="section-link">Xem tất cả {"->"}</Link>
              </div>
              <div className="home-matches-grid stagger-children">
                {liveAndRecentMatches.map((m) => (
                  <MatchCard key={m.match_id} match={m} showMatchday />
                ))}
              </div>
            </section>
          )}

          {/* 2. Lịch thi đấu sắp diễn ra */}
          {upcomingFeaturedMatches.length > 0 && (
            <section className="home-section animate-fade-in">
              <div className="section-header">
                <h2 className="section-title">
                  Lịch thi đấu sắp diễn ra
                </h2>
                <Link to="/matches" className="section-link">Xem lịch thi đấu đầy đủ {"->"}</Link>
              </div>
              <div className="home-matches-grid stagger-children">
                {upcomingFeaturedMatches.map((m) => (
                  <MatchCard key={m.match_id} match={m} showMatchday />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="home-sidebar">
          {groupAStandings.length > 0 && (
            <section className="home-section">
              <div className="section-header">
                <h2 className="section-title">
                  Bảng xếp hạng - Bảng A
                </h2>
                <Link to="/standings" className="section-link">Xem đầy đủ {"->"}</Link>
              </div>
              <StandingsTable standings={groupAStandings} compact />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
