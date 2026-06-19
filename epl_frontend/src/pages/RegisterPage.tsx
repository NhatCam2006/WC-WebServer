import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchTeams } from '../api/client';
import type { Team } from '../types';
import './LoginPage.css'; // Chia sẻ chung file CSS thiết kế với LoginPage

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [favoriteTeamId, setFavoriteTeamId] = useState<number | null>(null);
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tải danh sách 48 đội tuyển trực tiếp từ Database cục bộ để vẽ Select Options
  useEffect(() => {
    async function loadTeams() {
      try {
        const res = await fetchTeams();
        setTeams(res.data || []);
      } catch (err) {
        console.error('Không thể tải danh sách đội tuyển:', err);
      }
    }
    loadTeams();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập Email và Mật khẩu.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu bảo mật phải dài từ 6 ký tự trở lên.');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await register(
        email.trim(),
        password,
        fullname.trim() || email.trim().split('@')[0],
        favoriteTeamId
      );
      setSuccess(res.message || 'Đăng ký thành công! Đang chuyển hướng sang Đăng nhập...');
      // Đợi 2 giây rồi tự chuyển hướng sang trang đăng nhập để User gõ mật khẩu
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Đăng ký thất bại. Email có thể đã được sử dụng trước đó.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container auth-page" id="register-page">
      <div className="auth-card animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo">WC</div>
          <h1 className="auth-title">Đăng ký thành viên</h1>
          <p className="auth-subtitle">Cá nhân hóa và trải nghiệm thế giới World Cup 2026</p>
        </div>

        {error && (
          <div className="auth-error-alert animate-fade-in">
            <svg className="alert-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="auth-error-alert animate-fade-in" style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', borderColor: 'rgba(52, 199, 89, 0.2)', color: '#34c759' }}>
            <svg className="alert-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="fullname-input">Họ và tên của bạn</label>
            <input
              id="fullname-input"
              type="text"
              className="form-input"
              placeholder="Ví dụ: Nguyễn Văn A"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email-input">Địa chỉ Email</label>
            <input
              id="email-input"
              type="email"
              className="form-input"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Mật khẩu bảo mật</label>
            <input
              id="password-input"
              type="password"
              className="form-input"
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="favorite-team-select">Đội tuyển yêu thích nhất</label>
            <select
              id="favorite-team-select"
              className="form-input form-select"
              value={favoriteTeamId || ''}
              onChange={(e) => setFavoriteTeamId(e.target.value ? Number(e.target.value) : null)}
              disabled={loading}
            >
              <option value="">-- Chọn đội tuyển --</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <div className="spinner-small" /> : 'Đăng ký tài khoản'}
          </button>
        </form>

        <div className="auth-footer">
          Đã có tài khoản thành viên?{' '}
          <Link to="/login" className="auth-link">
            Đăng nhập ngay →
          </Link>
        </div>
      </div>
    </div>
  );
}
