import { Link, useLocation } from 'react-router-dom';
import './Breadcrumbs.css';

const ROUTE_LABELS: Record<string, string> = {
  '': 'Trang chủ',
  'matches': 'Trận đấu',
  'standings': 'Bảng xếp hạng',
  'teams': 'Đội bóng',
  'scorers': 'Vua phá lưới',
  'players': 'Cầu thủ',
};

function resolveLabel(segment: string): string {
  // If it's a number, it's an ID — show a generic label
  if (/^\d+$/.test(segment)) return '#' + segment;
  return ROUTE_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

export default function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on top-level pages
  if (segments.length <= 1) return null;

  const crumbs = [
    { label: 'Trang chủ', to: '/' },
    ...segments.map((seg, i) => ({
      label: resolveLabel(seg),
      to: '/' + segments.slice(0, i + 1).join('/'),
    })),
  ];

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.to} className="breadcrumbs-item">
              {isLast ? (
                <span className="breadcrumbs-current">{crumb.label}</span>
              ) : (
                <>
                  <Link to={crumb.to} className="breadcrumbs-link">{crumb.label}</Link>
                  <span className="breadcrumbs-sep" aria-hidden="true">›</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
