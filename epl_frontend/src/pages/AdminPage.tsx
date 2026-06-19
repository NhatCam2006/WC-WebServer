import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminPage.css';

interface AdminUserRow {
  id: number;
  email: string;
  fullname: string | null;
  role: string;
  created_at: string | null;
  favorite_team: { id: number; name: string; crest_url: string | null } | null;
}

interface SystemConfigItem {
  key: string;
  value: string;
  description: string | null;
  category: string;
  last_updated: string | null;
}

interface SystemStats {
  users: number;
  teams: number;
  matches: number;
  finished_matches: number;
  scheduled_matches: number;
  live_matches: number;
  last_synced: string | null;
  groq_configured: boolean;
  tavily_configured: boolean;
  football_data_configured: boolean;
}

interface SystemActivity {
  id: number;
  activity_type: 'auth' | 'config' | 'sync';
  actor_email: string | null;
  description: string;
  timestamp: string | null;
}

export default function AdminPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  // UI Tabs State
  const [activeTab, setActiveTab] = useState<'members' | 'ai' | 'apis' | 'stats'>('members');
  
  // Data States
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [, setConfigs] = useState<SystemConfigItem[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [activeActivityFilter, setActiveActivityFilter] = useState<'all' | 'auth' | 'config' | 'sync'>('all');
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  
  // Local Config Inputs State
  const [upcomingPrompt, setUpcomingPrompt] = useState('');
  const [finishedPrompt, setFinishedPrompt] = useState('');
  const [groqModel, setGroqModel] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [tavilyKey, setTavilyKey] = useState('');
  
  // Visibility Toggles for API Keys
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showTavilyKey, setShowTavilyKey] = useState(false);

  // Router Protection: Admin only
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Load Data based on Tab
  const loadTabContent = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'members') {
        const res = await fetch('http://127.0.0.1:8000/api/v1/auth/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const body = await res.json();
        if (res.ok) {
          setUsers(body.data || []);
        } else {
          setError(body.detail || 'Không thể tải danh sách tài khoản.');
        }
      } else if (activeTab === 'ai' || activeTab === 'apis') {
        const res = await fetch('http://127.0.0.1:8000/api/v1/auth/admin/configs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const body = await res.json();
        if (res.ok) {
          const cfgData: SystemConfigItem[] = body.data || [];
          setConfigs(cfgData);
          
          // Map to local input states
          const upcoming = cfgData.find(c => c.key === 'ai_upcoming_prompt')?.value || '';
          const finished = cfgData.find(c => c.key === 'ai_finished_prompt')?.value || '';
          const model = cfgData.find(c => c.key === 'groq_model')?.value || 'llama-3.3-70b-versatile';
          const gkey = cfgData.find(c => c.key === 'groq_api_key')?.value || '';
          const tkey = cfgData.find(c => c.key === 'tavily_api_key')?.value || '';
          
          setUpcomingPrompt(upcoming);
          setFinishedPrompt(finished);
          setGroqModel(model);
          setGroqKey(gkey);
          setTavilyKey(tkey);
        } else {
          setError(body.detail || 'Không thể tải cấu hình hệ thống.');
        }
      } else if (activeTab === 'stats') {
        const [statsRes, actRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/v1/auth/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://127.0.0.1:8000/api/v1/auth/admin/activities', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        const statsBody = await statsRes.json();
        const actBody = await actRes.json();
        
        if (statsRes.ok) {
          setStats(statsBody.data || null);
        } else {
          setError(statsBody.detail || 'Không thể tải chỉ số thống kê.');
        }
        
        if (actRes.ok) {
          setActivities(actBody.data || []);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối cơ sở dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabContent();
  }, [token, activeTab]);

  // Polling ngầm cập nhật chỉ số & nhật ký hoạt động (15 giây/lần)
  useEffect(() => {
    if (activeTab !== 'stats' || !token) return;
    
    const intervalId = setInterval(() => {
      Promise.all([
        fetch('http://127.0.0.1:8000/api/v1/auth/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://127.0.0.1:8000/api/v1/auth/admin/activities', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]).then(async ([statsRes, actRes]) => {
        if (statsRes.ok) {
          const statsBody = await statsRes.json();
          setStats(statsBody.data || null);
        }
        if (actRes.ok) {
          const actBody = await actRes.json();
          setActivities(actBody.data || []);
        }
      }).catch(err => console.error("Silent polling failed:", err));
    }, 15000);
    
    return () => clearInterval(intervalId);
  }, [token, activeTab]);

  // Toggle user role handler
  const handleToggleRole = async (targetUser: AdminUserRow) => {
    if (!token || actionLoadingId !== null) return;
    
    if (targetUser.id === user?.id) {
      alert('Bạn không thể tự hạ quyền của chính mình!');
      return;
    }

    if (!window.confirm(`Xác nhận đổi quyền của tài khoản ${targetUser.email}?`)) {
      return;
    }

    setActionLoadingId(targetUser.id);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/auth/admin/users/${targetUser.id}/toggle-role`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const body = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: body.new_role } : u));
      } else {
        alert(body.detail || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Save Config handler
  const handleSaveConfigs = async (keysToSave: string[]) => {
    if (!token) return;
    setSaveLoading(true);
    
    const payloadConfigs = keysToSave.map(key => {
      let value = '';
      if (key === 'ai_upcoming_prompt') value = upcomingPrompt;
      else if (key === 'ai_finished_prompt') value = finishedPrompt;
      else if (key === 'groq_model') value = groqModel;
      else if (key === 'groq_api_key') value = groqKey;
      else if (key === 'tavily_api_key') value = tavilyKey;
      
      return { key, value };
    });

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/auth/admin/configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ configs: payloadConfigs })
      });

      const body = await res.json();
      if (res.ok) {
        alert('Đã lưu cấu hình thành công! Các thay đổi sẽ được áp dụng ngay lập tức.');
        loadTabContent();
      } else {
        alert(body.detail || 'Không thể lưu cấu hình.');
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi kết nối máy chủ.');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="page-container" id="admin-page">
      <div className="page-header animate-fade-in">
        <h1 className="page-title">Quản trị Hệ thống</h1>
        <p className="page-subtitle">Điều phối nền tảng, tinh chỉnh cấu hình trợ lý AI & chỉ số hệ thống</p>
      </div>

      {/* Admin Dashboard Navigation Tabs */}
      <div className="admin-tabs animate-fade-in">
        <button 
          className={`admin-tab-btn ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <svg className="admin-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Thành viên
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          <svg className="admin-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          Tính cách AI
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'apis' ? 'active' : ''}`}
          onClick={() => setActiveTab('apis')}
        >
          <svg className="admin-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
            <line x1="6" y1="6" x2="6.01" y2="6"></line>
            <line x1="6" y1="18" x2="6.01" y2="18"></line>
          </svg>
          Khóa API Keys
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <svg className="admin-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          Chỉ số Thống kê
        </button>
      </div>

      {error && (
        <div className="auth-error-alert animate-fade-in">
          <svg className="alert-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Loading state spinner */}
      {loading ? (
        <div className="loading-container animate-fade-in">
          <div className="spinner" />
          <span>Đang truy xuất thông tin dữ liệu...</span>
        </div>
      ) : (
        <div className="admin-dashboard-content animate-fade-in">
          
          {/* TAB 1: MEMBERS MANAGEMENT */}
          {activeTab === 'members' && (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Họ và Tên</th>
                    <th>Email liên hệ</th>
                    <th>Đội bóng yêu thích</th>
                    <th>Ngày tham gia</th>
                    <th>Vai trò hiện tại</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className={u.id === user?.id ? 'admin-self-row' : ''}>
                      <td className="admin-td-mono">{u.id}</td>
                      <td>
                        <strong>{u.fullname || '—'}</strong>
                        {u.id === user?.id && <span className="admin-badge-self">Tôi</span>}
                      </td>
                      <td className="admin-td-mono">{u.email}</td>
                      <td>
                        {u.favorite_team ? (
                          <div className="admin-fav-team-cell">
                            {u.favorite_team.crest_url && (
                              <img src={u.favorite_team.crest_url} alt={u.favorite_team.name} className="admin-team-crest" />
                            )}
                            <span>{u.favorite_team.name}</span>
                          </div>
                        ) : (
                          <span style={{ opacity: 0.4 }}>Chưa chọn</span>
                        )}
                      </td>
                      <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                      <td>
                        <span className={`admin-role-badge badge-${u.role}`}>
                          {u.role === 'admin' ? (
                            <>
                              <svg className="role-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                              </svg>
                              ADMIN
                            </>
                          ) : (
                            <>
                              <svg className="role-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                              USER
                            </>
                          )}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="admin-btn-action"
                          disabled={u.id === user?.id || actionLoadingId === u.id}
                          onClick={() => handleToggleRole(u)}
                        >
                          {actionLoadingId === u.id ? 'Đang lưu...' : 'Đổi vai trò'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: AI ASSISTANT PERSONALITY CONFIG */}
          {activeTab === 'ai' && (
            <div className="admin-config-card-container">
              <div className="admin-config-form">
                <h3 className="config-section-heading">Cấu hình Hệ thống & Tính cách AI</h3>
                <p className="config-section-desc">Thay đổi System Prompt để thay đổi hoàn toàn phong cách, cấu trúc, và triết lý nhận định của chuyên gia AI.</p>

                <div className="config-form-group">
                  <label className="config-form-label">Groq AI LLM Model</label>
                  <input 
                    type="text" 
                    className="config-text-input" 
                    placeholder="ví dụ: llama-3.3-70b-versatile, llama3-70b-8192" 
                    value={groqModel}
                    onChange={(e) => setGroqModel(e.target.value)}
                  />
                  <small className="config-field-hint">Dòng mô hình ngôn ngữ lớn để suy luận nhận định. Khuyên dùng: `llama-3.3-70b-versatile` hoặc `llama3-70b-8192`.</small>
                </div>

                <div className="config-form-group">
                  <label className="config-form-label">Tính cách Nhận định Trước trận đấu (Upcoming Preview Prompt)</label>
                  <textarea 
                    rows={10}
                    className="config-textarea-input"
                    value={upcomingPrompt}
                    onChange={(e) => setUpcomingPrompt(e.target.value)}
                  />
                  <small className="config-field-hint">Chỉ đạo vai trò hệ thống giúp AI phân tích sâu sắc sơ đồ, chấn thương, góc, thẻ và dự đoán tỉ số.</small>
                </div>

                <div className="config-form-group">
                  <label className="config-form-label">Tính cách Tóm tắt Sau trận đấu (Finished Recap Prompt)</label>
                  <textarea 
                    rows={10}
                    className="config-textarea-input"
                    value={finishedPrompt}
                    onChange={(e) => setFinishedPrompt(e.target.value)}
                  />
                  <small className="config-field-hint">Chỉ đạo vai trò hệ thống giúp AI viết bài tường thuật sôi động như một nhà báo thể thao thực thụ.</small>
                </div>

                <button 
                  className="config-save-btn" 
                  disabled={saveLoading}
                  onClick={() => handleSaveConfigs(['ai_upcoming_prompt', 'ai_finished_prompt', 'groq_model'])}
                >
                  {saveLoading ? 'Đang lưu...' : 'Lưu & Cập nhật Tính cách AI'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: API KEYS & CONNECTION LINKS */}
          {activeTab === 'apis' && (
            <div className="admin-config-card-container">
              <div className="admin-config-form">
                <h3 className="config-section-heading">Cấu hình API Keys & Kết nối</h3>
                <p className="config-section-desc">Cấu hình hoặc đè các khóa bí mật an toàn trực tiếp trong database. Nếu để trống hệ thống sẽ tự động sử dụng biến môi trường .env làm dự phòng.</p>

                <div className="config-form-group">
                  <label className="config-form-label">Groq Cloud API Key</label>
                  <div className="config-password-wrapper">
                    <input 
                      type={showGroqKey ? "text" : "password"} 
                      className="config-text-input" 
                      placeholder="gsk_..." 
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="password-toggle-btn"
                      onClick={() => setShowGroqKey(!showGroqKey)}
                    >
                      {showGroqKey ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                  <small className="config-field-hint">Mã API khóa Groq lấy tại console.groq.com. Dùng để chạy LLM nhận định chiến thuật.</small>
                </div>

                <div className="config-form-group">
                  <label className="config-form-label">Tavily Search API Key</label>
                  <div className="config-password-wrapper">
                    <input 
                      type={showTavilyKey ? "text" : "password"} 
                      className="config-text-input" 
                      placeholder="tvly-..." 
                      value={tavilyKey}
                      onChange={(e) => setTavilyKey(e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="password-toggle-btn"
                      onClick={() => setShowTavilyKey(!showTavilyKey)}
                    >
                      {showTavilyKey ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                  <small className="config-field-hint">Mã API khóa Tavily lấy tại tavily.com. Dùng để cào tin tức chấn thương, họp báo tức thời trên mạng.</small>
                </div>

                <button 
                  className="config-save-btn" 
                  disabled={saveLoading}
                  onClick={() => handleSaveConfigs(['groq_api_key', 'tavily_api_key'])}
                >
                  {saveLoading ? 'Đang lưu...' : 'Lưu & Khóa API Keys'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM STATS & STATUS INDICATORS */}
          {activeTab === 'stats' && stats && (
            <div className="admin-stats-tab-content">
              {/* Stat Cards Grid */}
              <div className="stats-dashboard-grid">
                <div className="stat-dashboard-card">
                  <div className="stat-card-label">Người dùng đăng ký</div>
                  <div className="stat-card-value">{stats.users}</div>
                  <div className="stat-card-desc">Tài khoản thành viên trong hệ thống</div>
                </div>
                <div className="stat-dashboard-card">
                  <div className="stat-card-label">Đội tuyển World Cup</div>
                  <div className="stat-card-value">{stats.teams}</div>
                  <div className="stat-card-desc">Số đội tuyển trong CSDL cục bộ</div>
                </div>
                <div className="stat-dashboard-card">
                  <div className="stat-card-label">Tổng số trận đấu</div>
                  <div className="stat-card-value">{stats.matches}</div>
                  <div className="stat-card-desc">Gồm cả trận đã đá và sắp đá</div>
                </div>
              </div>

              {/* Hệ thống Nhật ký Hoạt động 3D Đa chiều */}
              {(() => {
                const filteredActivities = activities.filter(act => {
                  if (activeActivityFilter === 'all') return true;
                  return act.activity_type === activeActivityFilter;
                });

                return (
                  <div className="admin-config-card-container timeline-3d-card animate-fade-in" style={{ marginBottom: 'var(--space-2xl)' }}>
                    <h4 className="details-card-heading" style={{ borderLeftColor: 'var(--accent)' }}>Log hệ thống</h4>
                    <p className="config-section-desc" style={{ marginBottom: 'var(--space-xl)' }}>
                      Dòng chảy thời gian lập thể 3D thể hiện các hoạt động điều hành, xác thực tài khoản và tác vụ đồng bộ ngầm thời gian thực.
                    </p>

                    {/* Bộ lọc loại hoạt động */}
                    <div className="timeline-filters">
                      {(['all', 'auth', 'config', 'sync'] as const).map((filter) => (
                        <button
                          key={filter}
                          className={`timeline-filter-btn ${activeActivityFilter === filter ? 'active' : ''}`}
                          onClick={() => setActiveActivityFilter(filter)}
                        >
                          {filter === 'all' && 'Tất cả'}
                          {filter === 'auth' && 'Xác thực'}
                          {filter === 'config' && 'Cấu hình AI'}
                          {filter === 'sync' && 'Tác vụ ngầm'}
                        </button>
                      ))}
                    </div>

                    {/* 3D Isometric Viewport */}
                    <div className="timeline-3d-viewport">
                      <div className="timeline-3d-isometric-grid">
                        
                        {filteredActivities.length === 0 ? (
                          <div className="timeline-empty-state">
                            <p>Không có hoạt động nào được ghi nhận cho bộ lọc này.</p>
                          </div>
                        ) : (
                          <div className="isometric-pipeline-wrapper">
                            {/* Neon Pipeline Line SVG */}
                            <div className="pipeline-svg-container">
                              <svg className="pipeline-svg" viewBox={`0 0 100 ${Math.max(100, filteredActivities.length * 150)}`} preserveAspectRatio="none">
                                <defs>
                                  <linearGradient id="pipeline-gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--accent)" />
                                    <stop offset="50%" stopColor="#00d2ff" />
                                    <stop offset="100%" stopColor="#ff453a" />
                                  </linearGradient>
                                  <filter id="neon-glow">
                                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                    <feMerge>
                                      <feMergeNode in="coloredBlur"/>
                                      <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                  </filter>
                                </defs>
                                {/* Path matching the flow */}
                                <line
                                  x1="20"
                                  y1="10"
                                  x2="20"
                                  y2={filteredActivities.length * 150 - 40}
                                  stroke="url(#pipeline-gradient)"
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                  filter="url(#neon-glow)"
                                  className="pulse-path"
                                />
                              </svg>
                            </div>

                            {/* Cards & Nodes Loop */}
                            <div className="isometric-nodes-list">
                              {filteredActivities.map((act) => {
                                const dateStr = act.timestamp ? new Date(act.timestamp).toLocaleString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit'
                                }) : '—';

                                return (
                                  <div key={act.id} className={`timeline-3d-node node-${act.activity_type}`}>
                                    
                                    {/* Hologram Scanner Node */}
                                    <div className="node-hologram-point">
                                      <svg className="hologram-ring" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
                                        <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="4" fill="none" className="inner-pulse" />
                                      </svg>
                                      <span className="glow-node-core" />
                                    </div>

                                    {/* 3D Glassmorphic Card */}
                                    <div className="timeline-card-3d">
                                      <div className="card-glass-glow" />
                                      <div className="card-content-header">
                                        <span className={`activity-category-tag tag-${act.activity_type}`}>
                                          {act.activity_type === 'auth' && 'Xác thực'}
                                          {act.activity_type === 'config' && 'Cấu hình'}
                                          {act.activity_type === 'sync' && 'Đồng bộ'}
                                        </span>
                                        <span className="card-timestamp-3d">{dateStr}</span>
                                      </div>
                                      <p className="card-description-3d">{act.description}</p>
                                      {act.actor_email && (
                                        <div className="card-actor-box">
                                          <span>Tác nhân: <strong>{act.actor_email}</strong></span>
                                        </div>
                                      )}
                                    </div>

                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Match breakdown & API timing details */}
              <div className="stats-breakdown-container">
                <div className="stats-details-card">
                  <h4 className="details-card-heading">Phân rã trạng thái trận đấu</h4>
                  <div className="details-row">
                    <span className="details-row-label">Trận đấu đã kết thúc (Finished)</span>
                    <span className="details-row-val">{stats.finished_matches} / 380</span>
                  </div>
                  <div className="details-row">
                    <span className="details-row-label">Trận đấu đang diễn ra (Live)</span>
                    <span className="details-row-val live-glow-text">{stats.live_matches}</span>
                  </div>
                  <div className="details-row">
                    <span className="details-row-label">Trận đấu sắp diễn ra (Scheduled)</span>
                    <span className="details-row-val">{stats.scheduled_matches}</span>
                  </div>
                  {stats.last_synced && (
                    <div className="details-row" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '12px' }}>
                      <span className="details-row-label">Mốc đồng bộ CSDL gần nhất</span>
                      <span className="details-row-val" style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>
                        {new Date(stats.last_synced).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="stats-details-card">
                  <h4 className="details-card-heading">Trạng thái kết nối API ngoài</h4>
                  <div className="details-row">
                    <span className="details-row-label">Groq Cloud LLM API</span>
                    <span className={`details-row-val api-status-pill ${stats.groq_configured ? 'active' : 'inactive'}`}>
                      <span className="api-status-dot" />
                      {stats.groq_configured ? 'Đã cấu hình' : 'Chưa cấu hình'}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-row-label">Tavily Search API</span>
                    <span className={`details-row-val api-status-pill ${stats.tavily_configured ? 'active' : 'inactive'}`}>
                      <span className="api-status-dot" />
                      {stats.tavily_configured ? 'Đã cấu hình' : 'Chưa cấu hình'}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-row-label">Football-Data.org API</span>
                    <span className={`details-row-val api-status-pill ${stats.football_data_configured ? 'active' : 'inactive'}`}>
                      <span className="api-status-dot" />
                      {stats.football_data_configured ? 'Đã cấu hình' : 'Chưa cấu hình'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
