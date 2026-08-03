import React from 'react';

interface TimelineProps {
  dates: string[];
  densities: { date: string; count: number }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({ dates = [], densities = [], selectedIndex = 0, onSelect }) => {
  if (!Array.isArray(dates) || !Array.isArray(densities)) return null;

  const validDensities = densities.length > 0 ? densities : [];
  const maxCount = validDensities.length > 0 ? Math.max(...validDensities.map(d => d.count || 0), 1) : 1;
  const totalSignals = validDensities.reduce((acc, curr) => acc + (curr.count || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Reset to All Dates */}
      <button
        className={`filter-pill ${selectedIndex === 0 ? 'active' : ''}`}
        onClick={() => onSelect(0)}
        style={{ width: '100%', justifyContent: 'space-between' }}
      >
        <span>● ALL DATES</span>
        <span style={{ opacity: 0.6, fontSize: '10px' }}>[{totalSignals}]</span>
      </button>

      {validDensities.map((d, idx) => {
        const count = d.count || 0;
        const percentage = Math.min(100, Math.max(12, (count / maxCount) * 100));
        const isActive = idx === selectedIndex;
        const displayDate = d.date ? d.date.split('-').slice(1).join('/') : `D-${idx}`;

        return (
          <button
            key={d.date || idx}
            className={`filter-pill ${isActive ? 'active' : ''}`}
            onClick={() => onSelect(idx)}
            title={`${d.date}: ${count} signals`}
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            <span>{displayDate}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ 
                width: '36px', 
                height: '4px', 
                background: 'var(--bg-surface-2)', 
                borderRadius: '2px', 
                overflow: 'hidden' 
              }}>
                <div 
                  style={{ 
                    width: `${percentage}%`, 
                    height: '100%', 
                    background: isActive ? 'var(--accent-gold)' : 'var(--text-tertiary)',
                    borderRadius: '2px'
                  }} 
                />
              </div>
              <span style={{ fontSize: '10px', minWidth: '14px', textAlign: 'right' }}>{count}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default Timeline;
