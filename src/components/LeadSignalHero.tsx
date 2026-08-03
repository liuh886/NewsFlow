import React from 'react';
import { NewsItem } from '../types';

interface LeadSignalHeroProps {
  item: NewsItem;
  onShare: (item: NewsItem) => void;
  onBookmark: (id: string) => void;
  isBookmarked: boolean;
}

const LeadSignalHero: React.FC<LeadSignalHeroProps> = ({ 
  item, 
  onShare, 
  onBookmark, 
  isBookmarked 
}) => {
  const quality = parseFloat(String(item.quality_index || 0));
  const summaryText = item.long_summary || item.short_summary || item.summary || item.content || "";

  return (
    <section className="lead-hero-card">
      <div className="lead-hero-kicker">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="lead-hero-pill">
            ★ TOP SIGNAL
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {item.source.toUpperCase()} {item.source_tier === 'Tier A' ? '• TIER A' : ''}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {quality > 0 && (
            <span style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '11px', 
              color: 'var(--accent-gold)', 
              fontWeight: 800 
            }}>
              SCORE {quality.toFixed(1)} / 10
            </span>
          )}
        </div>
      </div>

      <h1 
        className="lead-hero-title"
        onClick={() => window.open(item.url, '_blank')}
        title="Open original publication source"
      >
        {item.title} ↗
      </h1>

      <p className="lead-hero-summary">
        {summaryText}
      </p>

      {item.key_quote && (
        <div className="lead-hero-quote">
          “{item.key_quote}”
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        borderTop: '1px solid var(--border-subtle)', 
        paddingTop: '16px',
        marginTop: '4px'
      }}>
        <div className="tags-group">
          {(item.tags || []).slice(0, 4).map(tag => (
            <span key={tag} className="tag-label">#{String(tag).toUpperCase()}</span>
          ))}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)' }}>
            {item.published_at ? new Date(item.published_at).toLocaleDateString() : ''}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className={`nexus-btn ${isBookmarked ? 'active' : ''}`}
            onClick={() => onBookmark(item.id || item.url)}
            title="Bookmark this lead signal"
          >
            {isBookmarked ? '★ SAVED' : '☆ SAVE'}
          </button>
          <button 
            className="nexus-btn active"
            onClick={() => onShare(item)}
            title="Generate poster card & export"
          >
            ⚡ SHARE SIGNAL
          </button>
        </div>
      </div>
    </section>
  );
};

export default LeadSignalHero;
