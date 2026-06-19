import { useState, useEffect, useMemo } from 'react';
import { fetchMatches, fetchSyncStatus } from '../api/client';
import type { Match } from '../types';
import MatchCard from '../components/MatchCard';
import { MatchCardSkeleton } from '../components/Skeleton';
import './MatchesPage.css';

const STAGES = [
  { id: 'GROUP_STAGE', label: 'Vòng bảng' },
  { id: 'LAST_32', label: 'Vòng 32 đội' },
  { id: 'LAST_16', label: 'Vòng 16 đội' },
  { id: 'QUARTER_FINALS', label: 'Tứ kết' },
  { id: 'SEMI_FINALS', label: 'Bán kết' },
  { id: 'FINALS', label: 'Chung kết' }
];

const GROUPS = [
  { id: '', label: 'Tất cả bảng' },
  { id: 'GROUP_A', label: 'Bảng A' },
  { id: 'GROUP_B', label: 'Bảng B' },
  { id: 'GROUP_C', label: 'Bảng C' },
  { id: 'GROUP_D', label: 'Bảng D' },
  { id: 'GROUP_E', label: 'Bảng E' },
  { id: 'GROUP_F', label: 'Bảng F' },
  { id: 'GROUP_G', label: 'Bảng G' },
  { id: 'GROUP_H', label: 'Bảng H' },
  { id: 'GROUP_I', label: 'Bảng I' },
  { id: 'GROUP_J', label: 'Bảng J' },
  { id: 'GROUP_K', label: 'Bảng K' },
  { id: 'GROUP_L', label: 'Bảng L' }
];

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState('GROUP_STAGE');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedMatchday, setSelectedMatchday] = useState<number | null>(null);

  const [syncStatus, setSyncStatus] = useState<{ lastSynced: string | null; isSyncing: boolean }>({
    lastSynced: null,
    isSyncing: false
  });

  useEffect(() => {
    async function loadMatches() {
      setLoading(true);
      try {
        const [res, syncRes] = await Promise.all([
          fetchMatches(),
          fetchSyncStatus().catch(() => ({ status: 'error', last_synced: null, is_syncing: false }))
        ]);
        setMatches(res.data || []);
        setSyncStatus({
          lastSynced: syncRes.last_synced,
          isSyncing: syncRes.is_syncing
        });
      } catch (err) {
        console.error('Failed to load matches:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMatches();
  }, []);

  // Auto-polling updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [res, syncRes] = await Promise.all([
          fetchMatches(),
          fetchSyncStatus().catch(() => ({ status: 'error', last_synced: null, is_syncing: false }))
        ]);
        setMatches(res.data || []);
        setSyncStatus({
          lastSynced: syncRes.last_synced,
          isSyncing: syncRes.is_syncing
        });
      } catch (err) {
        console.error('Failed to poll matches updates:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Filter matches locally
  const displayedMatches = useMemo(() => {
    return matches.filter((m) => {
      // Filter by stage
      if (activeStage === 'FINALS') {
        if (m.stage !== 'FINAL' && m.stage !== 'THIRD_PLACE') return false;
      } else {
        if (m.stage !== activeStage) return false;
      }

      // Group stage specific sub-filters
      if (activeStage === 'GROUP_STAGE') {
        if (selectedGroup && m.group !== selectedGroup) return false;
        if (selectedMatchday !== null && m.matchday !== selectedMatchday) return false;
      }

      return true;
    });
  }, [matches, activeStage, selectedGroup, selectedMatchday]);

  return (
    <div className="page-container" id="matches-page">
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

      <div className="page-header matches-header animate-fade-in">
        <h1 className="page-title">Trận đấu</h1>
        <p className="page-subtitle">Lịch thi đấu & Tỷ số trực tiếp World Cup 2026</p>
      </div>

      {/* Stage Tabs */}
      <div className="stage-tabs animate-fade-in">
        {STAGES.map((stage) => (
          <button
            key={stage.id}
            className={`stage-tab-btn ${activeStage === stage.id ? 'active' : ''}`}
            onClick={() => {
              setActiveStage(stage.id);
              // Reset sub-filters when switching stages
              setSelectedGroup('');
              setSelectedMatchday(null);
            }}
          >
            {stage.label}
          </button>
        ))}
      </div>

      {/* Sub Filters for Group Stage */}
      {activeStage === 'GROUP_STAGE' && (
        <div className="sub-filters-bar animate-fade-in">
          <div className="filter-group">
            <span className="filter-label">Bảng đấu:</span>
            <select
              className="filter-select"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              {GROUPS.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label" style={{ marginRight: '8px' }}>Lượt trận:</span>
            <div className="matchday-pills">
              <button
                className={`matchday-pill-btn ${selectedMatchday === null ? 'active' : ''}`}
                onClick={() => setSelectedMatchday(null)}
              >
                Tất cả
              </button>
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  className={`matchday-pill-btn ${selectedMatchday === num ? 'active' : ''}`}
                  onClick={() => setSelectedMatchday(num)}
                >
                  Lượt {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="matches-grid stagger-children">
          {Array.from({ length: 6 }).map((_, i) => <MatchCardSkeleton key={i} />)}
        </div>
      ) : displayedMatches.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-text" style={{ fontFamily: 'var(--font-mono)' }}>Chưa tìm thấy trận đấu nào phù hợp</div>
        </div>
      ) : (
        <>
          <div className="matches-count" style={{ fontFamily: 'var(--font-mono)' }}>
            Hiển thị <span>{displayedMatches.length}</span> trận đấu
            {activeStage === 'GROUP_STAGE' && (
              <span className="timeline-badge">VÒNG BẢNG</span>
            )}
            {activeStage !== 'GROUP_STAGE' && (
              <span className="timeline-badge" style={{ background: 'var(--wc-blue)', color: '#FFFFFF' }}>KNOCKOUT</span>
            )}
          </div>

          <div className="matches-grid stagger-children">
            {displayedMatches.map((m) => (
              <MatchCard key={m.match_id} match={m} showMatchday={activeStage === 'GROUP_STAGE' && !selectedGroup} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
