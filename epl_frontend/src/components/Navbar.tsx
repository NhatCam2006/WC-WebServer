import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const navItems = [
    { to: '/', label: 'Trang chủ' },
    { to: '/matches', label: 'Trận đấu' },
    { to: '/standings', label: 'BXH' },
    { to: '/scorers', label: 'Phá lưới' },
    { to: '/teams', label: 'Đội tuyển' },
  ];

  // Nếu là Admin, chỉ hiển thị Trang chủ và Quản trị để tối ưu sự tập trung
  const visibleNavItems = user && user.role === 'admin'
    ? [
        { to: '/', label: 'Trang chủ' },
        { to: '/admin', label: 'Quản trị' }
      ]
    : navItems;

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <NavLink to="/" className="navbar-brand" onClick={closeMenu}>
          <div className="navbar-logo">WC</div>
          <div className="navbar-title">
            World Cup <span>Live</span>
          </div>
        </NavLink>

        {/* Desktop & Mobile Nav */}
        <div className={`navbar-nav ${menuOpen ? 'open' : ''}`}>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              onClick={closeMenu}
            >
              {item.label}
            </NavLink>
          ))}
          {/* Mobile Search Item - Chỉ hiện cho User thường */}
          {user?.role !== 'admin' && (
            <NavLink
              to="/search"
              className={({ isActive }) => `nav-link nav-link-search-mobile ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <span className="nav-link-search-mobile-content">
                [ SEARCH ]
              </span>
            </NavLink>
          )}

        </div>

        {/* Desktop Search & Auth Panel */}
        <div className="navbar-controls-desktop">
          {/* Desktop Search Button - Chỉ hiện cho User thường */}
          {user?.role !== 'admin' && (
            <NavLink 
              to="/search" 
              className={({ isActive }) => `navbar-search-btn ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
              aria-label="Tìm kiếm"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginRight: '12px' }}
            >
              [ SEARCH ]
            </NavLink>
          )}

          {user ? (
            <div className="nav-user-profile-wrapper">
              <div className="nav-user-info">
                {user.favorite_team && user.favorite_team.crest_url && (
                  <img 
                    src={user.favorite_team.crest_url} 
                    alt={user.favorite_team.name} 
                    className="nav-user-fav-crest"
                    title={`Cổ động viên ${user.favorite_team.name}`}
                  />
                )}
                <span className="nav-user-name" title={user.email}>{user.fullname || 'Thành viên'}</span>
              </div>
              <button className="nav-logout-btn" onClick={logout} title="Đăng xuất tài khoản">
                [ LOGOUT ]
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="nav-login-btn-desktop">
              Đăng nhập
            </NavLink>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="navbar-mobile-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  );
}
