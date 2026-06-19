import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { fetchMatchDetail, fetchTeamMatches, fetchAiAnalysis, fetchH2H } from '../api/client';
import LiveBadge from '../components/LiveBadge';
import type { MatchDetail } from '../types';
import { isFinished, isLive, isScheduled } from '../types';
import { useAuth } from '../context/AuthContext';
import './MatchDetailPage.css';

// Trình biên dịch Markdown siêu nhẹ, an toàn không cần thư viện ngoài
function parseMarkdown(md: string): string {
  if (!md) return '';
  let html = md;

  // Escape HTML entities to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Parse Markdown Tables
  const lines = html.split('\n');
  const resultLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let alignConfigs: ('left' | 'center' | 'right')[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.slice(1, -1).split('|').map(c => c.trim());
      const isSeparator = cells.every(c => /^:?-+:?$/.test(c));
      if (isSeparator) {
        alignConfigs = cells.map(c => {
          if (c.startsWith(':') && c.endsWith(':')) return 'center';
          if (c.endsWith(':')) return 'right';
          return 'left';
        });
        if (tableRows.length === 0) {
          tableRows.push(cells.map(() => ''));
        }
      } else {
        tableRows.push(cells);
      }
      inTable = true;
    } else {
      if (inTable) {
        if (tableRows.length > 0) {
          let tableHtml = '<div class="table-responsive"><table>';
          const headerRow = tableRows[0];
          tableHtml += '<thead><tr>';
          headerRow.forEach((cell, idx) => {
            const align = alignConfigs[idx] || 'left';
            let cellText = cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            tableHtml += `<th style="text-align: ${align}">${cellText}</th>`;
          });
          tableHtml += '</tr></thead><tbody>';
          
          for (let r = 1; r < tableRows.length; r++) {
            tableHtml += '<tr>';
            tableRows[r].forEach((cell, idx) => {
              const align = alignConfigs[idx] || 'left';
              let cellText = cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              tableHtml += `<td style="text-align: ${align}">${cellText}</td>`;
            });
            tableHtml += '</tr>';
          }
          tableHtml += '</tbody></table></div>';
          resultLines.push(tableHtml);
        }
        inTable = false;
        tableRows = [];
        alignConfigs = [];
      }
      resultLines.push(lines[i]);
    }
  }
  
  if (inTable && tableRows.length > 0) {
    let tableHtml = '<div class="table-responsive"><table>';
    const headerRow = tableRows[0];
    tableHtml += '<thead><tr>';
    headerRow.forEach((cell, idx) => {
      const align = alignConfigs[idx] || 'left';
      let cellText = cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      tableHtml += `<th style="text-align: ${align}">${cellText}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    
    for (let r = 1; r < tableRows.length; r++) {
      tableHtml += '<tr>';
      tableRows[r].forEach((cell, idx) => {
        const align = alignConfigs[idx] || 'left';
        let cellText = cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        tableHtml += `<td style="text-align: ${align}">${cellText}</td>`;
      });
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table></div>';
    resultLines.push(tableHtml);
  }

  html = resultLines.join('\n');

  // Khôi phục các thẻ thông báo [!WARNING], [!IMPORTANT], vv. dạng GitHub Alert
  html = html.replace(/&gt;\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br\s*\/?>)?\s*([\s\S]*?)(?=<br\s*\/?>\s*&gt;|<br\s*\/?>\s*<br\s*\/?>|\n\n|$)/gi, (_match, type, content) => {
    const titleMap: Record<string, string> = {
      NOTE: 'Ghi chú',
      TIP: 'Mẹo phân tích',
      IMPORTANT: 'Lưu ý quan trọng',
      WARNING: 'Cảnh báo cấu hình',
      CAUTION: 'Cẩn trọng'
    };
    return `<div class="ai-alert alert-${type.toLowerCase()}">
      <div class="ai-alert-title">[ ${titleMap[type.toUpperCase()] || type} ]</div>
      <div class="ai-alert-content">${content.replace(/&gt;\s*/g, '').trim()}</div>
    </div>`;
  });

  // Blockquotes thông thường
  html = html.replace(/&gt;\s*(.*)/g, '<blockquote>$1</blockquote>');

  // Headers (H1, H2, H3)
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Bullet points
  html = html.replace(/^\*\s*(.*)/gim, '<li>$1</li>');
  html = html.replace(/^\-\s*(.*)/gim, '<li>$1</li>');
  
  // Wrap list items in ul
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Line breaks
  html = html.replace(/\n/g, '<br />');

  return html;
}

function formatTime(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDate(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function translateRole(role: string | null): string {
  if (!role) return 'Trọng tài';
  const r = role.toUpperCase();
  if (r === 'REFEREE') return 'Trọng tài chính';
  if (r.includes('ASSISTANT_REFEREE')) return 'Trợ lý trọng tài';
  if (r === 'FOURTH_OFFICIAL') return 'Trọng tài bàn';
  if (r.includes('VIDEO_ASSISTANT_REFEREE') || r === 'VAR') return 'Trọng tài VAR';
  return 'Trọng tài';
}

function getMatchResult(m: any, teamId: number) {
  const isHome = m.home_team.id === teamId;
  const scoreHome = m.score?.full_time?.home ?? 0;
  const scoreAway = m.score?.full_time?.away ?? 0;
  
  if (scoreHome === scoreAway) {
    return { char: 'H', class: 'result-d', text: 'Hòa' };
  }
  if (scoreHome > scoreAway) {
    return isHome ? { char: 'T', class: 'result-w', text: 'Thắng' } : { char: 'B', class: 'result-l', text: 'Bại' };
  }
  return isHome ? { char: 'B', class: 'result-l', text: 'Bại' } : { char: 'T', class: 'result-w', text: 'Thắng' };
}



export default function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [homeMatches, setHomeMatches] = useState<any[]>([]);
  const [awayMatches, setAwayMatches] = useState<any[]>([]);
  const [h2hMatches, setH2hMatches] = useState<any[]>([]);
  const [loadingForm, setLoadingForm] = useState(false);

  // AI Analyst States
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingAiStage, setLoadingAiStage] = useState<string>('');

  const handleTriggerAiAnalysis = async (forceRefresh: boolean = false) => {
    if (!matchId) return;
    
    // Check if user is logged in. If not, redirect to login page with back-redirect state
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    setLoadingAi(true);
    setAiAnalysis(null);

    // Tiến trình hiển thị loading mô phỏng theo LangGraph RAG thực tế
    const stages = match?.status === 'FINISHED'
      ? [
          'Đang kết nối database PostgreSQL cục bộ...',
          'Đang cào dữ liệu báo cáo trận đấu từ Tavily Search...',
          'Đang thu thập các phát biểu họp báo sau trận đấu...',
          'World Cup AI đang tổng hợp và viết bài tóm tắt trận đấu...'
        ]
      : [
          'Đang đọc BXH & Phong độ 5 trận gần nhất của 2 đội...',
          'Đang quét tin chấn thương & đội hình dự kiến từ Tavily...',
          'Đang phân tích hiệu suất ghi bàn & phạt góc, thẻ phạt...',
          'World Cup AI (llama3-70b) đang lập bài nhận định & dự đoán tỉ số...'
        ];

    let stageIdx = 0;
    setLoadingAiStage(stages[0]);

    const interval = setInterval(() => {
      stageIdx++;
      if (stageIdx < stages.length) {
        setLoadingAiStage(stages[stageIdx]);
      }
    }, 2500);

    try {
      const res = await fetchAiAnalysis(parseInt(matchId, 10), forceRefresh);
      setAiAnalysis(res.data?.analysis || 'Không nhận được dữ liệu phản hồi từ AI Analyst.');
    } catch (err) {
      console.error('Lỗi khi kích hoạt AI Analyst:', err);
      setAiAnalysis(
        '### 🤖 World Cup AI Premium Analyst\n\n' +
        '> [!WARNING]\n' +
        '> **Lỗi Kết nối Hệ thống**\n' +
        '>\n' +
        '> Không thể kết nối với máy chủ AI Backend. Vui lòng kiểm tra lại trạng thái máy chủ FastAPI ' +
        'và cấu hình file `.env` chứa `GROQ_API_KEY` của bạn.'
      );
    } finally {
      clearInterval(interval);
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    async function loadMatch() {
      if (!matchId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetchMatchDetail(parseInt(matchId, 10));
        setMatch(res.data);
        if (res.data && res.data.ai_analysis) {
          setAiAnalysis(res.data.ai_analysis);
        }
      } catch (err) {
        console.error('Failed to load match detail:', err);
        setError('Không thể tải chi tiết trận đấu. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    }
    loadMatch();
  }, [matchId]);

  useEffect(() => {
    async function loadRecentMatches() {
      if (!match) return;
      setLoadingForm(true);
      try {
        const homeId = match.home_team.id;
        const awayId = match.away_team.id;
        
        if (homeId && awayId) {
          const [homeRes, awayRes, h2hRes] = await Promise.all([
            fetchTeamMatches(homeId),
            fetchTeamMatches(awayId),
            fetchH2H(homeId, awayId),
          ]);
          setHomeMatches((homeRes.data as any)?.finished || []);
          setAwayMatches((awayRes.data as any)?.finished || []);
          setH2hMatches(h2hRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load form/h2h data:', err);
      } finally {
        setLoadingForm(false);
      }
    }
    if (match) {
      loadRecentMatches();
    }
  }, [match]);

  // Background polling every 30 seconds if the match is not finished
  useEffect(() => {
    if (!matchId || !match || isFinished(match.status)) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetchMatchDetail(parseInt(matchId, 10));
        setMatch(res.data);
        if (res.data && res.data.ai_analysis && !loadingAi) {
          setAiAnalysis(res.data.ai_analysis);
        }
      } catch (err) {
        console.error('Failed to poll match detail update:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [matchId, match?.status, loadingAi]);



  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner" />
          <span>Đang tải trận đấu...</span>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-text" style={{ fontFamily: 'var(--font-mono)' }}>[ ERROR: {error || 'MATCH NOT FOUND'} ]</div>
          <button className="back-btn" onClick={() => navigate(-1)} style={{ fontFamily: 'var(--font-mono)', marginTop: '24px' }}>[ BACK ]</button>
        </div>
      </div>
    );
  }

  const live = isLive(match.status);
  const finished = isFinished(match.status);
  const scheduled = isScheduled(match.status);





  const renderRecentMatchesColumn = (teamName: string, matches: any[], teamId: number) => {
    return (
      <div className="recent-matches-column">
        <h4 className="recent-matches-column-title">Phong độ {teamName}</h4>
        
        {/* W/D/L Bubble Row */}
        <div className="form-bubble-row">
          {matches.map((m, idx) => {
            const res = getMatchResult(m, teamId);
            return (
              <span key={idx} className={`form-bubble ${res.class}`} title={`${res.text}`}>
                {res.char}
              </span>
            );
          })}
          {matches.length === 0 && <span className="no-data-text">Chưa có dữ liệu phong độ</span>}
        </div>

        <ul className="recent-matches-list">
          {matches.map((m) => {
            const res = getMatchResult(m, teamId);
            const isHomeTeam = m.home_team.id === teamId;
            const opponent = isHomeTeam ? m.away_team : m.home_team;
            
            return (
              <li key={m.match_id} className="recent-match-row">
                <span className="match-date-small">{formatDate(m.utc_date)}</span>
                <div className="match-opponent-info">
                  <span className={`match-side-badge ${isHomeTeam ? 'home' : 'away'}`}>
                    {isHomeTeam ? 'Sân nhà' : 'Sân khách'}
                  </span>
                  <span className="opponent-name">gặp {opponent.name}</span>
                </div>
                <div className="recent-match-score-result">
                  <span className="recent-match-score">
                    {m.score.full_time.home} - {m.score.full_time.away}
                  </span>
                  <span className={`result-indicator-badge ${res.class}`}>
                    {res.text}
                  </span>
                </div>
              </li>
            );
          })}
          {matches.length === 0 && <li className="no-data-text-list">Không tìm thấy trận đấu gần đây</li>}
        </ul>
      </div>
    );
  };

  return (
    <div className="page-container match-detail-page animate-fade-in">
      <button className="back-btn" onClick={() => navigate(-1)} style={{ fontFamily: 'var(--font-mono)' }}>
        [ BACK ]
      </button>

      {/* Scoreboard Header */}
      <div className="match-detail-header">
        <div className="match-detail-team">
          {match.home_team.crest_url ? (
            <img src={match.home_team.crest_url} alt={match.home_team.name} className="match-detail-crest" />
          ) : (
            <div className="match-detail-crest placeholder" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>[ NO CREST ]</div>
          )}
          <div className="match-detail-team-info">
            <div className="match-detail-team-name">{match.home_team.name}</div>
            {match.home_team.coach_name && (
              <div className="match-detail-coach" style={{ fontFamily: 'var(--font-mono)' }}>HLV: {match.home_team.coach_name}</div>
            )}
          </div>
        </div>

        <div className="match-detail-scoreboard">
          {scheduled ? (
            <>
              <div className="match-detail-time">{formatTime(match.utc_date)}</div>
              <div className="match-detail-date">{formatDate(match.utc_date)}</div>
            </>
          ) : (
            <div className={`match-detail-score ${live ? 'live-score' : ''}`}>
              <span>{match.score.full_time.home}</span>
              <span className="match-detail-score-divider" />
              <span>{match.score.full_time.away}</span>
            </div>
          )}

          <div className="match-detail-status">
            {live && <LiveBadge />}
            {finished && <span className="match-finished-badge">KT</span>}
            {finished && (
              <span className="match-halftime">
                HT {match.score.half_time.home} - {match.score.half_time.away}
              </span>
            )}
          </div>
        </div>

        <div className="match-detail-team right">
          {match.away_team.crest_url ? (
            <img src={match.away_team.crest_url} alt={match.away_team.name} className="match-detail-crest" />
          ) : (
            <div className="match-detail-crest placeholder" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>[ NO CREST ]</div>
          )}
          <div className="match-detail-team-info">
            <div className="match-detail-team-name">{match.away_team.name}</div>
            {match.away_team.coach_name && (
              <div className="match-detail-coach" style={{ fontFamily: 'var(--font-mono)' }}>HLV: {match.away_team.coach_name}</div>
            )}
          </div>
        </div>
      </div>

      <div className="match-detail-meta" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
        {match.matchday && <span>VÒNG {match.matchday}</span>}
        {match.venue && <span>• {match.venue.toUpperCase()}</span>}
      </div>

      {/* Premium AI Analyst RAG Widget */}
      <section className="match-detail-section ai-analyst-section card animate-fade-in">
        <div className="ai-analyst-header">
          <div className="ai-analyst-title-wrapper">
            <span className="ai-status-dot" />
            <h2 className="ai-analyst-title">WORLD CUP AI PREMIUM ANALYST</h2>
          </div>
          <span className="ai-model-tag">Groq Llama-3 70B</span>
        </div>

        <div className="ai-analyst-body">
          {aiAnalysis ? (
            <div className="ai-analysis-wrapper">
              <div 
                className="ai-analysis-content markdown-body"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(aiAnalysis) }}
              />
              <button className="ai-reanalyze-btn" onClick={() => handleTriggerAiAnalysis(true)}>
                PHÂN TÍCH LẠI
              </button>
            </div>
          ) : loadingAi ? (
            <div className="ai-loading-container">
              <div className="ai-loading-progress-container">
                <div className="ai-progress-track">
                  <div className="ai-progress-bar-fill" />
                </div>
                <div className="ai-loading-terminal">
                  <span className="ai-terminal-prompt">&gt;</span>
                  <span className="ai-loading-stage-text">{loadingAiStage}</span>
                </div>
                <p className="ai-loading-subtext">Hệ thống đang truy cập dữ liệu và biên soạn nội dung chiến thuật qua Tavily Search API...</p>
              </div>
            </div>
          ) : (
            <div className="ai-placeholder-container">
              <div className="ai-tech-display-box">
                <div className="ai-tech-line-top" />
                <div className="ai-tech-badge">WC-AI ENGINE v1.0</div>
              </div>
              <h3>Trợ lý Phân tích & Tóm tắt Trận đấu AI</h3>
              <p className="ai-placeholder-desc">
                {scheduled 
                  ? 'Kích hoạt nhận định chuyên sâu: Phân tích sơ đồ chiến thuật, hiệu suất tấn công/phòng ngự của hai đội tuyển, thống kê thẻ phạt, phạt góc dự kiến và dự báo tỉ số có độ tin cậy cao.'
                  : 'Kích hoạt báo cáo tóm tắt trận đấu: Tường thuật diễn biến nổi bật, các pha lập công, thông số trận đấu và tổng hợp phát biểu họp báo sau trận đấu từ báo chí.'
                }
              </p>
              <button className="ai-trigger-btn" onClick={() => handleTriggerAiAnalysis(false)}>
                {scheduled ? 'KÍCH HOẠT PHÂN TÍCH CHIẾN THUẬT' : 'KHỞI TẠO BÁO CÁO TÓM TẮT TRẬN ĐẤU'}
              </button>
            </div>
          )}
        </div>
      </section>


      {/* Analysis Form & Recent Matches Section */}
      {!scheduled && (
        <section className="match-detail-section form-analysis-section">
          <h2 className="match-detail-section-title" style={{ fontFamily: 'var(--font-body)', fontWeight: 800 }}>::: PHÂN TÍCH PHONG ĐỘ & ĐỐI ĐẦU</h2>
          {loadingForm ? (
            <div className="loading-form-container" style={{ fontFamily: 'var(--font-mono)' }}>
              <div className="spinner small-spinner" />
              <span>Đang phân tích phong độ gần đây...</span>
            </div>
          ) : (
            <div className="recent-matches-grid">
              {renderRecentMatchesColumn(match.home_team.short_name || match.home_team.name, homeMatches, match.home_team.id!)}
              {renderRecentMatchesColumn(match.away_team.short_name || match.away_team.name, awayMatches, match.away_team.id!)}
            </div>
          )}
        </section>
      )}

      {/* Head-to-Head Section */}
      {h2hMatches.length > 0 && (
        <section className="match-detail-section h2h-section">
          <h2 className="match-detail-section-title" style={{ fontFamily: 'var(--font-body)', fontWeight: 800 }}>::: LỊCH SỬ ĐỐI ĐẦU TRỰC TIẾP</h2>
          {(() => {
            const homeId = match.home_team.id;
            let homeWins = 0, draws = 0, awayWins = 0;
            h2hMatches.forEach(m => {
              const sh = m.score?.full_time?.home ?? 0;
              const sa = m.score?.full_time?.away ?? 0;
              if (sh === sa) draws++;
              else if ((m.home_team.id === homeId && sh > sa) || (m.away_team.id === homeId && sa > sh)) homeWins++;
              else awayWins++;
            });
            return (
              <>
                <div className="h2h-summary">
                  <div className="h2h-summary-item h2h-win">
                    <span className="h2h-summary-count">{homeWins}</span>
                    <span className="h2h-summary-label">{match.home_team.short_name || match.home_team.name}</span>
                  </div>
                  <div className="h2h-summary-item h2h-draw">
                    <span className="h2h-summary-count">{draws}</span>
                    <span className="h2h-summary-label">Hòa</span>
                  </div>
                  <div className="h2h-summary-item h2h-loss">
                    <span className="h2h-summary-count">{awayWins}</span>
                    <span className="h2h-summary-label">{match.away_team.short_name || match.away_team.name}</span>
                  </div>
                </div>
                <ul className="h2h-list">
                  {h2hMatches.map((m) => {
                    const sh = m.score?.full_time?.home ?? 0;
                    const sa = m.score?.full_time?.away ?? 0;
                    return (
                      <li key={m.match_id} className="h2h-row">
                        <span className="h2h-date">{formatDate(m.utc_date)}</span>
                        <span className="h2h-team-name h2h-home">{m.home_team.short_name || m.home_team.name}</span>
                        <span className="h2h-score">{sh} – {sa}</span>
                        <span className="h2h-team-name h2h-away">{m.away_team.short_name || m.away_team.name}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            );
          })()}
        </section>
      )}

      {/* Stadium & Referees Section */}
      <section className="match-detail-section referees-section">
        <h2 className="match-detail-section-title" style={{ fontFamily: 'var(--font-body)', fontWeight: 800 }}>::: THÔNG TIN TRẬN ĐẤU</h2>
        <div className="match-info-grid">
          {match.venue && (
            <div className="info-card cyber-glow-card">
              <div className="info-icon" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent)' }}>[ STADIUM ]</div>
              <div className="info-details">
                <span className="info-label" style={{ fontFamily: 'var(--font-mono)' }}>Sân vận động</span>
                <span className="info-value">{match.venue}</span>
              </div>
            </div>
          )}
          {match.referees && match.referees.length > 0 ? (
            match.referees.map((ref) => (
              <div className="info-card referee-card cyber-glow-card" key={ref.id ?? ref.name}>
                <div className="info-icon" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent)' }}>[ REF_STAFF ]</div>
                <div className="info-details">
                  <span className="info-label" style={{ fontFamily: 'var(--font-mono)' }}>{translateRole(ref.role)}</span>
                  <span className="info-value">{ref.name}</span>
                  {ref.nationality && <span className="info-subtext" style={{ fontFamily: 'var(--font-mono)' }}>{ref.nationality}</span>}
                </div>
              </div>
            ))
          ) : (
            <div className="info-card referee-card cyber-glow-card">
              <div className="info-icon" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent)' }}>[ REF_STAFF ]</div>
              <div className="info-details">
                <span className="info-label" style={{ fontFamily: 'var(--font-mono)' }}>Trọng tài</span>
                <span className="info-value">Đang cập nhật</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
