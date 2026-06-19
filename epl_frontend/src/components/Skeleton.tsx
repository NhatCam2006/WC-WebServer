import './Skeleton.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  borderRadius?: string;
}

export function Skeleton({ width = '100%', height = '16px', className = '', borderRadius }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, ...(borderRadius ? { borderRadius } : {}) }}
      aria-hidden="true"
    />
  );
}

// Pre-built MatchCard skeleton
export function MatchCardSkeleton() {
  return (
    <div className="skeleton-match-card">
      <div className="skeleton-mc-header">
        <Skeleton width="60px" height="11px" />
        <Skeleton width="80px" height="11px" />
      </div>
      <div className="skeleton-mc-body">
        <div className="skeleton-mc-team">
          <Skeleton width="40px" height="40px" borderRadius="50%" />
          <Skeleton width="80px" height="13px" />
        </div>
        <div className="skeleton-mc-score">
          <Skeleton width="60px" height="32px" borderRadius="6px" />
        </div>
        <div className="skeleton-mc-team">
          <Skeleton width="40px" height="40px" borderRadius="50%" />
          <Skeleton width="80px" height="13px" />
        </div>
      </div>
    </div>
  );
}

// Pre-built StandingsRow skeleton
export function StandingRowSkeleton() {
  return (
    <tr className="skeleton-standing-row">
      <td><Skeleton width="20px" height="13px" /></td>
      <td>
        <div className="skeleton-standing-team">
          <Skeleton width="20px" height="20px" borderRadius="50%" />
          <Skeleton width="100px" height="13px" />
        </div>
      </td>
      <td><Skeleton width="18px" height="13px" /></td>
      <td><Skeleton width="18px" height="13px" /></td>
      <td><Skeleton width="18px" height="13px" /></td>
      <td><Skeleton width="18px" height="13px" /></td>
      <td><Skeleton width="28px" height="13px" /></td>
    </tr>
  );
}

// Pre-built ScorerRow skeleton
export function ScorerRowSkeleton() {
  return (
    <div className="skeleton-scorer-row">
      <Skeleton width="28px" height="28px" borderRadius="50%" />
      <Skeleton width="20px" height="20px" borderRadius="50%" />
      <div className="skeleton-scorer-info">
        <Skeleton width="130px" height="14px" />
        <Skeleton width="80px" height="11px" />
      </div>
      <Skeleton width="40px" height="32px" borderRadius="6px" />
    </div>
  );
}
