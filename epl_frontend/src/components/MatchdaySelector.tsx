import { useRef, useEffect } from 'react';
import './MatchdaySelector.css';

interface MatchdaySelectorProps {
  selected: number | null;
  onSelect: (matchday: number | null) => void;
}

const TOTAL_MATCHDAYS = 38;

export default function MatchdaySelector({ selected, onSelect }: MatchdaySelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active button on mount
  useEffect(() => {
    if (scrollRef.current && selected) {
      const activeBtn = scrollRef.current.querySelector('.matchday-btn.active');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selected]);

  const matchdays = Array.from({ length: TOTAL_MATCHDAYS }, (_, i) => i + 1);

  return (
    <div className="matchday-selector" id="matchday-selector">
      <div className="matchday-scroll" ref={scrollRef}>
        <button
          className={`matchday-btn all-btn ${selected === null ? 'active' : ''}`}
          onClick={() => onSelect(null)}
        >
          Tất cả
        </button>
        {matchdays.map((md) => (
          <button
            key={md}
            className={`matchday-btn ${selected === md ? 'active' : ''}`}
            onClick={() => onSelect(md)}
          >
            {md}
          </button>
        ))}
      </div>
    </div>
  );
}
