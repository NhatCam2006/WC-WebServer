import { useState, useEffect } from 'react';
import { fetchStandings } from '../api/client';
import type { Standing } from '../types';
import StandingsTable from '../components/StandingsTable';
import { StandingRowSkeleton } from '../components/Skeleton';
import './StandingsPage.css';

export default function StandingsPage() {
  const [groupedStandings, setGroupedStandings] = useState<Record<string, Standing[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStandings() {
      setLoading(true);
      try {
        const res = await fetchStandings();
        setGroupedStandings(res.data || {});
      } catch (err) {
        console.error('Failed to load standings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStandings();
  }, []);

  const hasData = Object.keys(groupedStandings).length > 0;

  return (
    <div className="page-container" id="standings-page">
      <div className="page-header standings-page-header animate-fade-in">
        <h1 className="page-title">Bảng xếp hạng</h1>
        <p className="page-subtitle">FIFA World Cup 2026 • Thể thức mới 48 đội</p>
      </div>

      {loading ? (
        <div className="standings-layout animate-fade-in">
          <div className="standings-main-content">
            <div className="standings-groups-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="group-card card">
                  <div className="skeleton" style={{ height: '24px', width: '100px', marginBottom: '12px' }} />
                  <table style={{ width: '100%' }}>
                    <tbody>
                      {Array.from({ length: 4 }).map((_, j) => <StandingRowSkeleton key={j} />)}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : !hasData ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏆</div>
          <div className="empty-state-text">Chưa có dữ liệu bảng xếp hạng</div>
        </div>
      ) : (
        <div className="standings-layout animate-fade-in">
          {/* Main content - 12 Groups Grid */}
          <div className="standings-main-content">
            <div className="standings-groups-grid">
              {Object.entries(groupedStandings).map(([groupName, groupData]) => (
                <div key={groupName} className="group-card card animate-fade-in">
                  <h3 className="group-title">{groupName}</h3>
                  <StandingsTable standings={groupData} compact />
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar - Context & Rules */}
          <div className="standings-sidebar">
            {/* Qualification Rules */}
            <div className="sidebar-card league-rules-card">
              <h3 className="sidebar-section-title">Quy tắc vượt qua Vòng bảng</h3>
              
              <div className="rules-list">
                <div className="rule-item">
                  <span className="rule-color-bullet qualify" />
                  <div className="rule-info">
                    <span className="rule-title">Hạng 1 - 2: Vào thẳng vòng 32 đội</span>
                    <span className="rule-desc">Lọt vào vòng loại trực tiếp đầu tiên (Round of 32).</span>
                  </div>
                </div>
                
                <div className="rule-item">
                  <span className="rule-color-bullet playoff" />
                  <div className="rule-info">
                    <span className="rule-title">Hạng 3: Tranh vé vớt thành tích tốt</span>
                    <span className="rule-desc">8 trên 12 đội đứng thứ ba có thành tích xuất sắc nhất sẽ đi tiếp.</span>
                  </div>
                </div>
                
                <div className="rule-item">
                  <span className="rule-color-bullet eliminated" />
                  <div className="rule-info">
                    <span className="rule-title">Hạng 4: Bị loại</span>
                    <span className="rule-desc">Chính thức chia tay giải đấu và rời World Cup.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tournament Stats */}
            <div className="sidebar-card league-stats-card">
              <h3 className="sidebar-section-title">Thông tin Giải đấu</h3>
              <ul className="league-stats-list">
                <li>
                  <span className="stat-label">Số đội tuyển</span>
                  <span className="stat-val">48 ĐTQG</span>
                </li>
                <li>
                  <span className="stat-label">Số bảng đấu</span>
                  <span className="stat-val">12 Bảng (A đến L)</span>
                </li>
                <li>
                  <span className="stat-label">Tổng số trận</span>
                  <span className="stat-val">104 Trận đấu</span>
                </li>
                <li>
                  <span className="stat-label">Quốc gia đăng cai</span>
                  <span className="stat-val">Mỹ, Canada, Mexico</span>
                </li>
                <li>
                  <span className="stat-label">Năm tổ chức</span>
                  <span className="stat-val">2026</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
