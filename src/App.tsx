import { useState, useEffect, useMemo, useCallback } from 'react'
import { NewsItem, RawNewsItem, Topic } from './types'
import NewsCard from './components/NewsCard'
import LeadSignalHero from './components/LeadSignalHero'
import IntelligenceRadar from './components/IntelligenceRadar'
import Timeline from './components/Timeline'
import ShareModal from './components/ShareModal'
import ConfigButton from './components/ConfigButton'
import ConfigModal from './components/ConfigModal'
import CommandPalette from './components/CommandPalette'
import ShortcutsModal from './components/ShortcutsModal'
import { AnimatePresence } from 'framer-motion'

/** Loading screen fallback timeout (ms) */
const LOADING_TIMEOUT_MS = 2000

type FilterMode = 'all' | 'tier-a' | 'high-conviction' | 'bookmarks';

/** Check if an item belongs to the given topic based on its tags. */
function matchesTopic(item: NewsItem, topicId: string): boolean {
  if (topicId === 'all') return true;
  const tags = (item.tags || []).map(t => String(t).toLowerCase());
  if (topicId === 'ai-digest') {
    return tags.includes('ai daily digest') || tags.includes('tech');
  } else if (topicId === 'energy') {
    return tags.includes('energy') || tags.includes('esg') || tags.includes('ccus');
  }
  return true;
}

function App() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string>('ai-digest')
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0)
  const [activeDateIndex, setActiveDateIndex] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeEntityFilter, setActiveEntityFilter] = useState<string>('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [isLoading, setIsLoading] = useState(true)
  
  // Bookmarks persisted in localStorage
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('newsflow_bookmarks');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleBookmark = useCallback((id: string) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('newsflow_bookmarks', JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error('Failed to save bookmarks:', e);
      }
      return next;
    });
  }, []);

  const [sharingItem, setSharingItem] = useState<NewsItem | null>(null)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null)
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set())

  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('layoutMode') as 'list' | 'grid') || 'list'
  })
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }, [])

  const toggleLayout = useCallback(() => {
    setLayoutMode(prev => {
      const next = prev === 'list' ? 'grid' : 'list';
      localStorage.setItem('layoutMode', next);
      return next;
    });
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const timeoutId = setTimeout(() => setIsLoading(false), LOADING_TIMEOUT_MS);
      try {
        const [newsRes, digestRes, topicsRes] = await Promise.allSettled([
          fetch('data/news.json'),
          fetch('data/ai_digest.json'),
          fetch('data/topics.json')
        ]);
        
        let newsData = [];
        let digestData = [];
        let topicsData = [];

        if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
          try { newsData = await newsRes.value.json(); } catch (e) { console.warn('Failed to parse news.json:', e); }
        }
        if (digestRes.status === 'fulfilled' && digestRes.value.ok) {
          try { digestData = await digestRes.value.json(); } catch (e) { console.warn('Failed to parse ai_digest.json:', e); }
        }
        if (topicsRes.status === 'fulfilled' && topicsRes.value.ok) {
          try { topicsData = await topicsRes.value.json(); } catch (e) { console.warn('Failed to parse topics.json:', e); }
        }

        const normalizedDigest = (Array.isArray(digestData) ? digestData : []).map((item: RawNewsItem) => ({
          ...item,
          published_at: item.published_at || item.date || new Date().toISOString(),
          quality_index: item.quality_index || "7.5",
          tags: Array.from(new Set([
            "AI Daily Digest",
            "Tech",
            item.source || "Feed",
            ...((Array.isArray(item.tags) ? item.tags : (item.tags ? [item.tags] : [])))
          ])),
          short_summary: item.short_summary || item.content || item.summary || "",
          long_summary: item.long_summary || item.full_translation || item.summary || item.content || "",
          key_quote: item.key_quote || "",
          supporting_quotes: Array.isArray(item.supporting_quotes) ? item.supporting_quotes : [],
          summary: item.long_summary || item.summary || item.content || ""
        }));

        const cleanedNews = (Array.isArray(newsData) ? newsData : []).map((item: RawNewsItem) => ({
          ...item,
          tags: Array.isArray(item.tags) ? item.tags : (item.tags ? [item.tags] : []),
          short_summary: item.short_summary || item.content || item.summary || "",
          long_summary: item.long_summary || item.full_translation || item.summary || "",
          key_quote: item.key_quote || "",
          supporting_quotes: Array.isArray(item.supporting_quotes) ? item.supporting_quotes : [],
        }));

        const allItems = [...cleanedNews, ...normalizedDigest];
        const uniqueMap = new Map<string, NewsItem>();

        allItems.forEach(item => {
          if (!item || !item.url) return;
          const newsItem: NewsItem = { ...item, id: item.id || item.url } as NewsItem;
          if (uniqueMap.has(item.url)) {
            const existing = uniqueMap.get(item.url)!;
            if ((item.summary?.length || 0) > (existing.summary?.length || 0)) {
              uniqueMap.set(item.url, newsItem);
            }
          } else {
            uniqueMap.set(item.url, newsItem);
          }
        });

        const merged = Array.from(uniqueMap.values());
        setNews(merged.sort((a, b) => {
          const dateA = new Date(a.published_at).getTime() || 0;
          const dateB = new Date(b.published_at).getTime() || 0;
          return dateB - dateA;
        }));
        setTopics(Array.isArray(topicsData) ? topicsData : []);
      } catch (error) {
        console.error('Data loading error:', error);
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const uniqueDates = useMemo(() => {
    const dates = [...new Set(news.map(item => {
      try {
        if (!item.published_at) return new Date().toISOString().split('T')[0];
        const d = new Date(item.published_at);
        return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
      } catch { return new Date().toISOString().split('T')[0]; }
    }))];
    return dates.sort();
  }, [news]);

  const densities = useMemo(() => {
    const baseNews = news.filter(item => matchesTopic(item, selectedTopicId));

    return uniqueDates.map(date => ({
      date,
      count: baseNews.filter(item => item.published_at && item.published_at.startsWith(date)).length
    }));
  }, [news, uniqueDates, selectedTopicId]);

  // Comprehensive Filtering
  const filteredNews = useMemo(() => {
    let filtered = news.filter(item => matchesTopic(item, selectedTopicId));

    // Date filter
    if (selectedDateIndex > 0) {
      const selectedDate = uniqueDates[selectedDateIndex];
      const selectedTime = new Date(selectedDate).getTime();
      filtered = filtered.filter(item => new Date(item.published_at).getTime() >= selectedTime);
    }

    // Quality Filter Mode
    if (filterMode === 'tier-a') {
      filtered = filtered.filter(item => item.source_tier === 'Tier A');
    } else if (filterMode === 'high-conviction') {
      filtered = filtered.filter(item => parseFloat(String(item.quality_index || 0)) >= 8.0);
    } else if (filterMode === 'bookmarks') {
      filtered = filtered.filter(item => bookmarkedIds.has(item.id || item.url));
    }

    // Entity Filter
    if (activeEntityFilter) {
      const ef = activeEntityFilter.toLowerCase();
      filtered = filtered.filter(item => 
        (item.title || '').toLowerCase().includes(ef) ||
        (item.short_summary || '').toLowerCase().includes(ef) ||
        (item.tags || []).some(t => String(t).toLowerCase().includes(ef))
      );
    }

    // Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        (item.title || '').toLowerCase().includes(q) ||
        (item.summary && item.summary.toLowerCase().includes(q)) ||
        (item.short_summary && item.short_summary.toLowerCase().includes(q)) ||
        (item.long_summary && item.long_summary.toLowerCase().includes(q)) ||
        (item.key_quote && item.key_quote.toLowerCase().includes(q)) ||
        (item.supporting_quotes && item.supporting_quotes.join(' ').toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [news, selectedTopicId, selectedDateIndex, uniqueDates, filterMode, bookmarkedIds, activeEntityFilter, searchQuery]);

  // Lead Anchor Story (Top-rated signal with key quote)
  const leadHeroItem = useMemo(() => {
    if (filteredNews.length === 0) return null;
    const scored = [...filteredNews].sort((a, b) => {
      const scoreA = (parseFloat(String(a.quality_index || 0))) + (a.key_quote ? 1.5 : 0);
      const scoreB = (parseFloat(String(b.quality_index || 0))) + (b.key_quote ? 1.5 : 0);
      return scoreB - scoreA;
    });
    return scored[0];
  }, [filteredNews]);

  // Remaining card stream items (excluding lead hero to prevent duplication)
  const streamNews = useMemo(() => {
    if (!leadHeroItem) return filteredNews;
    return filteredNews.filter(n => (n.id || n.url) !== (leadHeroItem.id || leadHeroItem.url));
  }, [filteredNews, leadHeroItem]);

  const toggleExpandCard = useCallback((cardId: string) => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);

  const handleSelectNewsItemFromPalette = useCallback((item: NewsItem) => {
    const idx = filteredNews.findIndex(n => (n.id || n.url) === (item.id || item.url));
    if (idx !== -1) {
      setFocusedCardIndex(idx);
      setTimeout(() => {
        const el = document.getElementById(`card-${item.id || item.url}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      const targetTopic = (item.tags || []).some(t => String(t).toLowerCase().includes('energy')) ? 'energy' : 'ai-digest';
      setSelectedTopicId(targetTopic);
      setTimeout(() => {
        const el = document.getElementById(`card-${item.id || item.url}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [filteredNews]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputActive = ['INPUT', 'TEXTAREA'].includes((document.activeElement?.tagName || ''));

      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      // Escape
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) { setIsCommandPaletteOpen(false); return; }
        if (isShortcutsOpen) { setIsShortcutsOpen(false); return; }
        if (isConfigOpen) { setIsConfigOpen(false); return; }
        if (sharingItem) { setSharingItem(null); return; }
        setFocusedCardIndex(null);
        return;
      }

      // Cockpit keys (only active when not typing)
      if (isInputActive || isCommandPaletteOpen || isShortcutsOpen || isConfigOpen || sharingItem) {
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedCardIndex(prev => {
          const next = prev === null ? 0 : Math.min(streamNews.length - 1, prev + 1);
          const item = streamNews[next];
          if (item) {
            document.getElementById(`card-${item.id || item.url}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return next;
        });
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedCardIndex(prev => {
          const next = prev === null ? 0 : Math.max(0, prev - 1);
          const item = streamNews[next];
          if (item) {
            document.getElementById(`card-${item.id || item.url}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return next;
        });
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (focusedCardIndex !== null && streamNews[focusedCardIndex]) {
          e.preventDefault();
          const item = streamNews[focusedCardIndex];
          toggleExpandCard(item.id || item.url);
        }
      } else if (e.key.toLowerCase() === 's') {
        if (focusedCardIndex !== null && streamNews[focusedCardIndex]) {
          e.preventDefault();
          setSharingItem(streamNews[focusedCardIndex]);
        }
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheme();
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        toggleLayout();
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isCommandPaletteOpen, 
    isShortcutsOpen, 
    isConfigOpen, 
    sharingItem, 
    focusedCardIndex, 
    streamNews, 
    toggleExpandCard, 
    toggleTheme, 
    toggleLayout
  ]);

  useEffect(() => {
    if (isLoading || streamNews.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          const topMost = visible.reduce((prev, curr) => 
            prev.boundingClientRect.top < curr.boundingClientRect.top ? prev : curr
          );
          const date = topMost.target.getAttribute('data-date');
          if (date) {
            const idx = uniqueDates.indexOf(date);
            if (idx !== -1) setActiveDateIndex(idx);
          }
        }
      },
      { threshold: 0, rootMargin: '-120px 0px -80% 0px' }
    );

    document.querySelectorAll('.nexus-card').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [streamNews, uniqueDates, isLoading]);

  if (isLoading) {
    return (
      <div className="nexus-loading-screen">
        <div className="brand-gem" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
          ⚡
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.15em', color: 'var(--text-primary)', fontWeight: 700 }}>
          NEWSFLOW NEXUS STATION
        </div>
        <div className="nexus-loading-bar"></div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>
          SYNCHRONIZING INTELLIGENCE STREAMS
        </div>
      </div>
    );
  }

  return (
    <div className="nexus-app-container">
      {/* Top Header / Mission Control */}
      <header className="nexus-header">
        <div className="brand-group" onClick={() => { setSelectedDateIndex(0); setFilterMode('all'); setActiveEntityFilter(''); }}>
          <div className="brand-gem">⚡</div>
          <div className="brand-titles">
            <h1 className="brand-name">Newsflow</h1>
            <div className="brand-badge-strip">
              <span className="live-dot"></span>
              <span>NEXUS INTELLIGENCE ONLINE</span>
            </div>
          </div>
        </div>

        {/* Global Search with ⌘K Badge */}
        <div 
          className="header-search-bar" 
          onClick={() => setIsCommandPaletteOpen(true)}
          title="Click or press ⌘K / Ctrl+K for Command Palette"
        >
          <span className="search-leading-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search signals, key entities, or press ⌘K..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="search-trailing-kbd">⌘K</span>
        </div>

        {/* Header Controls */}
        <div className="header-controls">
          <button 
            className="nexus-btn" 
            onClick={() => setIsShortcutsOpen(true)}
            title="Cockpit Keyboard Shortcuts (?)"
          >
            ⌨️ HUD
          </button>
          <button 
            className="nexus-btn" 
            onClick={toggleLayout}
            title="Toggle Card Grid/List View (L)"
          >
            {layoutMode === 'list' ? '☰ LIST' : '⊞ GRID'}
          </button>
          <button 
            className="nexus-btn" 
            onClick={toggleTheme}
            title="Toggle Night/Day Theme (T)"
          >
            {theme === 'dark' ? '🌙 NIGHT' : '☀️ DAY'}
          </button>
          <ConfigButton onClick={() => setIsConfigOpen(true)} />
        </div>
      </header>

      {/* 3-Column Intelligence Station Grid */}
      <div className="nexus-station-grid">
        {/* Left Navigation Rail */}
        <aside className="nexus-left-rail">
          {/* Topic Channels */}
          <div className="rail-section">
            <div className="rail-label">CHANNELS</div>
            <div className="channel-nav-list">
              {topics.map(topic => {
                const count = news.filter(n => matchesTopic(n, topic.id)).length;
                const icon = topic.id === 'ai-digest' ? '⚡' : (topic.id === 'energy' ? '🔋' : '💻');
                const isActive = selectedTopicId === topic.id;

                return (
                  <button
                    key={topic.id}
                    className={`channel-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => { setSelectedTopicId(topic.id); setActiveEntityFilter(''); }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{icon}</span>
                      <span>{topic.name}</span>
                    </span>
                    <span className="channel-badge">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Signal Filters */}
          <div className="rail-section">
            <div className="rail-label">FILTER RADAR</div>
            <div className="filter-pills-group">
              <button 
                className={`filter-pill ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                <span>●</span> ALL SIGNALS
              </button>
              <button 
                className={`filter-pill ${filterMode === 'high-conviction' ? 'active' : ''}`}
                onClick={() => setFilterMode('high-conviction')}
              >
                <span>★</span> HIGH CONVICTION (≥ 8.0)
              </button>
              <button 
                className={`filter-pill ${filterMode === 'tier-a' ? 'active' : ''}`}
                onClick={() => setFilterMode('tier-a')}
              >
                <span>◆</span> TIER A SOURCES ONLY
              </button>
              <button 
                className={`filter-pill ${filterMode === 'bookmarks' ? 'active' : ''}`}
                onClick={() => setFilterMode('bookmarks')}
              >
                <span>☆</span> SAVED BOOKMARKS ({bookmarkedIds.size})
              </button>
            </div>
          </div>

          {/* Temporal Density Timeline */}
          <div className="rail-section">
            <div className="rail-label">TIMELINE RADAR</div>
            <Timeline 
              dates={uniqueDates}
              densities={densities} 
              selectedIndex={activeDateIndex}
              onSelect={setSelectedDateIndex}
            />
          </div>
        </aside>

        {/* Center Editorial Stream */}
        <main className="nexus-center-stream">
          {/* Top Lead Signal Anchor Hero */}
          {leadHeroItem && filterMode !== 'bookmarks' && !searchQuery && !activeEntityFilter && (
            <LeadSignalHero 
              item={leadHeroItem}
              onShare={setSharingItem}
              onBookmark={toggleBookmark}
              isBookmarked={bookmarkedIds.has(leadHeroItem.id || leadHeroItem.url)}
            />
          )}

          {/* Stream Telemetry & Controls Bar */}
          <div className="stream-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                {activeEntityFilter ? `FILTERED BY #${activeEntityFilter.toUpperCase()}` : (filterMode === 'bookmarks' ? 'SAVED SIGNALS' : 'INTELLIGENCE STREAM')}
              </span>
              <span>•</span>
              <span>{filteredNews.length} SIGNALS</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', background: 'var(--bg-surface-2)', padding: '2px 5px', borderRadius: '3px' }}>J / K</kbd>
              <span>NAVIGATE</span>
            </div>
          </div>

          {/* News Card Grid / List */}
          <div className={`feed-stream ${layoutMode}`}>
            <AnimatePresence mode="popLayout">
              {streamNews.map((item, idx) => {
                const cardId = item.id || item.url;
                const isFocused = focusedCardIndex === idx;
                const isExpanded = expandedCardIds.has(cardId);
                const isBookmarked = bookmarkedIds.has(cardId);

                return (
                  <NewsCard 
                    key={cardId || idx} 
                    item={item} 
                    onShare={setSharingItem} 
                    layoutMode={layoutMode}
                    isFocused={isFocused}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleExpandCard(cardId)}
                    isBookmarked={isBookmarked}
                    onBookmark={toggleBookmark}
                  />
                );
              })}
            </AnimatePresence>

            {filteredNews.length === 0 && (
              <div style={{ 
                padding: '64px 20px', 
                textAlign: 'center', 
                background: 'var(--bg-surface-1)', 
                border: '1px solid var(--border-default)', 
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)'
              }}>
                <div style={{ fontSize: '36px', marginBottom: '14px' }}>📡</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                  NO INTELLIGENCE SIGNALS MATCH CURRENT CRITERIA
                </div>
                <div style={{ fontSize: '11.5px', marginTop: '8px', color: 'var(--text-tertiary)' }}>
                  Clear entity filters, reset timeline date, or expand search parameters.
                </div>
                <button 
                  className="nexus-btn active"
                  onClick={() => { setFilterMode('all'); setActiveEntityFilter(''); setSelectedDateIndex(0); setSearchQuery(''); }}
                  style={{ marginTop: '16px' }}
                >
                  RESET ALL FILTERS
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Right Intelligence Radar & Insights Drawer */}
        <IntelligenceRadar 
          news={filteredNews}
          selectedTopicId={selectedTopicId}
          onFilterByEntity={setActiveEntityFilter}
          activeEntityFilter={activeEntityFilter}
        />
      </div>

      {/* Unified Modals */}
      <ShareModal item={sharingItem} onClose={() => setSharingItem(null)} />
      <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
      
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        topics={topics}
        selectedTopicId={selectedTopicId}
        onSelectTopic={setSelectedTopicId}
        news={news}
        onSelectNewsItem={handleSelectNewsItemFromPalette}
        onToggleTheme={toggleTheme}
        theme={theme}
        onToggleLayout={toggleLayout}
        layoutMode={layoutMode}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenShortcutsHelp={() => setIsShortcutsOpen(true)}
      />

      <ShortcutsModal 
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  )
}

export default App
