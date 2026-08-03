import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { NewsItem } from '../types';

interface NewsCardProps {
  item: NewsItem;
  onShare: (item: NewsItem) => void;
  layoutMode: 'list' | 'grid';
  isFocused?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isBookmarked?: boolean;
  onBookmark?: (id: string) => void;
}

/** Calculate human-readable relative time */
function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'JUST NOW';
    if (diffHours < 24) return `${diffHours}H AGO`;
    if (diffDays === 1) return 'YESTERDAY';
    if (diffDays < 7) return `${diffDays}D AGO`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

const NewsCard: React.FC<NewsCardProps> = ({ 
  item, 
  onShare, 
  layoutMode, 
  isFocused = false,
  isExpanded,
  onToggleExpand,
  isBookmarked = false,
  onBookmark
}) => {
  const quality = parseFloat(String(item.quality_index || 0));
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  const isCardExpanded = isExpanded !== undefined ? isExpanded : internalExpanded;
  const toggleExpand = onToggleExpand || (() => setInternalExpanded(prev => !prev));

  const summaryText = item.short_summary || item.summary || item.content || "...";
  const detailText = item.long_summary || item.full_translation || item.summary || "";
  const hasDetails = Boolean(detailText || (item.supporting_quotes && item.supporting_quotes.length > 0));

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`nexus-card ${isFocused ? 'focused' : ''}`}
      data-date={item.published_at ? item.published_at.split('T')[0] : ''}
      id={`card-${item.id || item.url}`}
    >
      {/* Header Meta */}
      <div className="card-header-meta">
        <span 
          className="source-tag"
          onClick={() => window.open(item.url, '_blank')} 
          title="Open original publication source"
        >
          {item.source.toUpperCase()} ↗
        </span>

        {item.source_tier === 'Tier A' && (
          <span className="tier-a-tag">TIER A</span>
        )}

        {quality > 0 && (
          <span className="quality-pill">
            <span>★</span> {quality.toFixed(1)}
          </span>
        )}

        <span style={{ marginLeft: 'auto', opacity: 0.6, fontSize: '10px' }}>
          {formatRelativeTime(item.published_at)}
        </span>

        {isFocused && (
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '9px', 
            background: 'var(--accent-gold)', 
            color: '#000', 
            fontWeight: 800, 
            padding: '2px 5px', 
            borderRadius: '3px' 
          }}>
            ↵ EXPAND
          </span>
        )}
      </div>

      {/* Title */}
      <h2 
        className="card-title-text"
        onClick={() => window.open(item.url, '_blank')}
        title="Click to view full original source"
      >
        {item.title}
      </h2>

      {/* Takeaway / Summary */}
      <p 
        className="card-summary-text"
        onClick={() => window.open(item.url, '_blank')}
        style={{ 
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: layoutMode === 'grid' ? 4 : 3,
          overflow: 'hidden'
        }}
      >
        {summaryText}
      </p>

      {/* Verified Quote Callout */}
      {item.key_quote && (
        <div className="card-quote-box">
          “{item.key_quote}”
        </div>
      )}

      {/* Expand / Collapse Toggle */}
      {hasDetails && (
        <button
          type="button"
          className="expand-drawer-btn"
          onClick={toggleExpand}
        >
          <span>{isCardExpanded ? '▲ COLLAPSE BRIEF' : '▼ DEEP SYNTHESIS'}</span>
        </button>
      )}

      {/* Expanded Accordion Body */}
      {isCardExpanded && (
        <div className="card-drawer-content">
          {detailText && (
            <div>
              <div className="drawer-heading">INTELLIGENCE BRIEF & TRANSLATION</div>
              <p className="drawer-body-text">
                {detailText}
              </p>
            </div>
          )}

          {(item.supporting_quotes || []).length > 0 && (
            <div>
              <div className="drawer-heading" style={{ marginTop: '6px' }}>VERIFIED EVIDENCE & QUOTES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {(item.supporting_quotes || []).map((quote, index) => (
                  <div key={`${item.id || item.url}-quote-${index}`} className="card-quote-box" style={{ fontSize: '11.5px', padding: '8px 12px' }}>
                    {quote}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Card Footer Strip */}
      <div className="card-footer-strip">
        <div className="tags-group">
          {(item.tags || []).slice(0, 3).map(tag => (
            <span key={tag} className="tag-label">#{String(tag).toUpperCase()}</span>
          ))}
        </div>

        <div className="card-action-icons">
          {onBookmark && (
            <button 
              className={`icon-action-btn ${isBookmarked ? 'bookmarked' : ''}`}
              onClick={() => onBookmark(item.id || item.url)}
              title={isBookmarked ? "Remove from bookmarks" : "Save to bookmarks"}
            >
              {isBookmarked ? '★' : '☆'}
            </button>
          )}

          <button 
            className="icon-action-btn"
            onClick={() => onShare(item)}
            title="Generate poster card & share"
          >
            ⚡ POSTER
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default NewsCard;
