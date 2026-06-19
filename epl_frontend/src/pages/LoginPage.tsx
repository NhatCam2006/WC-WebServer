import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
      // Đăng nhập thành công -> quay về trang trước đó hoặc Trang chủ
      const from = location.state?.from || '/';
      navigate(from);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Đăng nhập thất bại. Email hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container auth-page" id="login-page">
      <div className="auth-card animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo">WC</div>
          <h1 className="auth-title">Đăng nhập tài khoản</h1>
          <p className="auth-subtitle">Nhận nhận định AI & Xem Live Score World Cup 2026</p>
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

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">Email đăng nhập</label>
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <div className="spinner-small" /> : 'Đăng nhập'}
          </button>
        </form>

        <div className="auth-footer">
          Chưa có tài khoản thành viên?{' '}
          <Link to="/register" className="auth-link">
            Đăng ký tài khoản mới →
          </Link>
        </div>
      </div>
    </div>
  );
}
