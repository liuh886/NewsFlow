import React, { useMemo } from 'react';
import { NewsItem } from '../types';

interface IntelligenceRadarProps {
  news: NewsItem[];
  selectedTopicId: string;
  onFilterByEntity: (entity: string) => void;
  activeEntityFilter: string;
}

const IntelligenceRadar: React.FC<IntelligenceRadarProps> = ({ 
  news, 
  onFilterByEntity, 
  activeEntityFilter 
}) => {
  // Extract high frequency entities/keywords from news items
  const trendingEntities = useMemo(() => {
    const counts: Record<string, number> = {};
    const commonKeywords = [
      'DeepSeek', 'OpenAI', 'NVIDIA', 'Anthropic', 'GPU', 'SMR', 'Nuclear', 
      'Grid', 'VRAM', 'Transformers', 'Energy', 'Battery', 'Storage', 
      'LLM', 'Robotics', 'Semiconductor', 'Agents', 'Data Center', 'Cloud'
    ];

    news.forEach(item => {
      const text = `${item.title} ${item.short_summary || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
      commonKeywords.forEach(kw => {
        if (text.includes(kw.toLowerCase())) {
          counts[kw] = (counts[kw] || 0) + 1;
        }
      });
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [news]);

  // Executive highlights
  const topHighlights = useMemo(() => {
    return news
      .filter(n => n.key_quote || n.short_summary)
      .slice(0, 3);
  }, [news]);

  // Tier distribution
  const tierCounts = useMemo(() => {
    let tierA = 0;
    let tierB = 0;
    news.forEach(n => {
      if (n.source_tier === 'Tier A') tierA++;
      else tierB++;
    });
    return { tierA, tierB, total: news.length };
  }, [news]);

  return (
    <aside className="nexus-right-drawer">
      {/* Executive Brief Widget */}
      <div className="radar-widget-card">
        <div className="widget-title">
          <span>EXECUTIVE RADAR</span>
          <span style={{ color: 'var(--accent-gold)', fontSize: '10px' }}>● LIVE SYNTHESIS</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {topHighlights.map((item, idx) => (
            <div 
              key={item.id || idx} 
              className="brief-point-item"
              onClick={() => {
                document.getElementById(`card-${item.id || item.url}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              style={{ cursor: 'pointer' }}
              title="Click to scroll to signal"
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '11.5px', marginBottom: '3px' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>
                {item.key_quote ? `“${item.key_quote.slice(0, 80)}...”` : (item.short_summary ? item.short_summary.slice(0, 80) + '...' : '')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Entity Cloud Widget */}
      <div className="radar-widget-card">
        <div className="widget-title">
          <span>TRENDING ENTITIES</span>
          {activeEntityFilter && (
            <button 
              onClick={() => onFilterByEntity('')}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--accent-gold)', 
                fontFamily: 'var(--font-mono)', 
                fontSize: '10px', 
                cursor: 'pointer' 
              }}
            >
              [CLEAR FILTER]
            </button>
          )}
        </div>

        <div className="entity-tag-cloud">
          {trendingEntities.map(([entity, count]) => {
            const isActive = activeEntityFilter.toLowerCase() === entity.toLowerCase();
            return (
              <span
                key={entity}
                className="entity-chip"
                onClick={() => onFilterByEntity(isActive ? '' : entity)}
                style={{
                  background: isActive ? 'var(--accent-gold)' : undefined,
                  color: isActive ? '#000' : undefined,
                  fontWeight: isActive ? 800 : undefined
                }}
              >
                #{entity} <span style={{ opacity: 0.6, fontSize: '9px' }}>{count}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Source Health Widget */}
      <div className="radar-widget-card">
        <div className="widget-title">
          <span>SOURCE COVERAGE</span>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>TOTAL: {tierCounts.total}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Tier A (Institutional):</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{tierCounts.tierA} feeds</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Tier B (Expert & Blogs):</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{tierCounts.tierB} feeds</span>
          </div>
          <div style={{ 
            marginTop: '4px', 
            height: '4px', 
            background: 'var(--bg-surface-2)', 
            borderRadius: '2px', 
            overflow: 'hidden', 
            display: 'flex' 
          }}>
            <div style={{ width: `${(tierCounts.tierA / (tierCounts.total || 1)) * 100}%`, background: 'var(--accent-gold)' }} />
            <div style={{ width: `${(tierCounts.tierB / (tierCounts.total || 1)) * 100}%`, background: 'var(--channel-ai)' }} />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default IntelligenceRadar;
