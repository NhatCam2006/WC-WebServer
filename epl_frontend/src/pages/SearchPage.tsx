import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchSearchResult } from '../api/client';
import type { Team } from '../types';
import './SearchPage.css';

interface SearchPlayer {
  id: number;
  name: string;
  position: string | null;
  shirt_number: number | null;
  nationality: string | null;
  team_name: string | null;
  team_crest: string | null;
  team_id: number | null;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ teams: Team[]; players: SearchPlayer[] }>({
    teams: [],
    players: []
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'teams' | 'players'>('all');

  // Debounced search logic (tự động gọi API sau khi người dùng dừng gõ 300ms)
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ teams: [], players: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetchSearchResult(query);
        setResults(res.data || { teams: [], players: [] });
      } catch (err) {
        console.error('Failed to search:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const hasResults = results.teams.length > 0 || results.players.length > 0;
  const showTeams = activeTab === 'all' || activeTab === 'teams';
  const showPlayers = activeTab === 'all' || activeTab === 'players';

  return (
    <div className="page-container animate-fade-in" id="search-page">
      <div className="page-header">
        <h1 className="page-title">Tìm kiếm toàn cục</h1>
        <p className="page-subtitle">Tìm nhanh đội tuyển hoặc cầu thủ World Cup 2026</p>
      </div>

      {/* Ô tìm kiếm trung tâm */}
      <div className="search-bar-container">
        <div className="search-input-wrapper">
          <span className="search-icon-inside">
            <svg className="search-icon-inside-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            className="search-input-field"
            placeholder="Gõ tên đội tuyển hoặc cầu thủ (ví dụ: Argentina, Messi, Mbappe)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button className="search-clear-btn" onClick={() => setQuery('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Hướng dẫn khi chưa gõ đủ ký tự */}
      {query.trim().length < 2 && (
        <div className="search-guide animate-fade-in">
          <div className="search-guide-icon">
            <svg className="search-guide-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              <path d="M2 12h20"></path>
            </svg>
          </div>
          <h3>Khởi đầu tìm kiếm của bạn</h3>
          <p>Nhập tối thiểu 2 ký tự tên đội tuyển hoặc cầu thủ để quét toàn bộ cơ sở dữ liệu World Cup.</p>
        </div>
      )}

      {/* Trạng thái tải dữ liệu */}
      {loading && (
        <div className="search-loading animate-fade-in">
          <div className="spinner-small" />
          <span>Đang tìm kiếm thông tin...</span>
        </div>
      )}

      {/* Hiển thị kết quả */}
      {!loading && query.trim().length >= 2 && (
        <>
          {/* Tabs Filter */}
          {hasResults && (
            <div className="search-tabs animate-fade-in">
              <button
                className={`search-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                Tất cả ({results.teams.length + results.players.length})
              </button>
              <button
                className={`search-tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
                onClick={() => setActiveTab('teams')}
              >
                Đội bóng ({results.teams.length})
              </button>
              <button
                className={`search-tab-btn ${activeTab === 'players' ? 'active' : ''}`}
                onClick={() => setActiveTab('players')}
              >
                Cầu thủ ({results.players.length})
              </button>
            </div>
          )}

          {/* Không tìm thấy gì */}
          {!hasResults && (
            <div className="search-empty animate-fade-in">
              <div className="search-empty-icon">
                <svg className="search-empty-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="8" x2="14" y2="14"></line>
                  <line x1="14" y1="8" x2="8" y2="14"></line>
                </svg>
              </div>
              <h3>Không tìm thấy kết quả nào</h3>
              <p>Thử tìm kiếm với tên khác hoặc từ khóa ngắn gọn hơn (Ví dụ: "Manc" thay vì "Manchester").</p>
            </div>
          )}

          <div className="search-results-container stagger-children">
            {/* Lưới câu lạc bộ */}
            {showTeams && results.teams.length > 0 && (
              <section className="search-section animate-fade-in">
                <h2 className="search-section-title">Câu lạc bộ ({results.teams.length})</h2>
                <div className="search-teams-grid">
                  {results.teams.map((team) => (
                    <Link to={`/teams/${team.id}`} key={team.id} className="search-team-card">
                      {team.crest_url ? (
                        <img src={team.crest_url} alt={team.name} className="search-team-crest" />
                      ) : (
                        <div className="search-team-crest placeholder">
                          <svg className="search-placeholder-shield-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                          </svg>
                        </div>
                      )}
                      <div className="search-team-info">
                        <div className="search-team-name">{team.name}</div>
                        <div className="search-team-tla">{team.tla} • HLV: {team.coach_name || 'Không rõ'}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Danh sách cầu thủ */}
            {showPlayers && results.players.length > 0 && (
              <section className="search-section animate-fade-in">
                <h2 className="search-section-title">Cầu thủ ({results.players.length})</h2>
                <div className="search-players-list">
                  {results.players.map((player) => (
                    <Link to={`/players/${player.id}`} key={player.id} className="search-player-row">
                      <div className="search-player-avatar-mini">
                        <svg className="search-player-avatar-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      </div>
                      <div className="search-player-main-info">
                        <div className="search-player-name">{player.name}</div>
                        <div className="search-player-sub-info">
                          <span>Số áo: {player.shirt_number || '—'}</span>
                          <span className="dot-divider">•</span>
                          <span>Vị trí: {player.position || '—'}</span>
                          <span className="dot-divider">•</span>
                          <span>Quốc tịch: {player.nationality || '—'}</span>
                        </div>
                      </div>
                      
                      {player.team_name && (
                        <div className="search-player-club">
                          {player.team_crest && (
                            <img src={player.team_crest} alt={player.team_name} className="search-player-club-crest" />
                          )}
                          <span className="search-player-club-name">{player.team_name}</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
