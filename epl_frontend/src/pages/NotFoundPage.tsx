import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="notfound-container">
      <div className="notfound-glow" />
      <div className="notfound-content">
        <div className="notfound-score">
          <span>4</span>
          <span className="notfound-ball">⚽</span>
          <span>4</span>
        </div>
        <h1 className="notfound-title">Trang không tìm thấy</h1>
        <p className="notfound-subtitle">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển. Có thể bạn đã nhập sai địa chỉ URL.
        </p>
        <div className="notfound-actions">
          <Link to="/" className="notfound-btn-primary">
            ← Về Trang chủ
          </Link>
          <Link to="/matches" className="notfound-btn-secondary">
            ⚽ Xem Trận đấu
          </Link>
        </div>
      </div>
    </div>
  );
}
