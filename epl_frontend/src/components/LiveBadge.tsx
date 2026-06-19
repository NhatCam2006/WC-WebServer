import './LiveBadge.css';

interface LiveBadgeProps {
  large?: boolean;
}

export default function LiveBadge({ large = false }: LiveBadgeProps) {
  return (
    <span className={`live-badge ${large ? 'large' : ''}`}>
      <span className="live-dot" />
      Live
    </span>
  );
}
