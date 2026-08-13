import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const appVersion = String(packageJson.version || '').trim();
const PUBLIC_BASE_URL = 'https://liuh886.github.io/NewsFlow/';
const PUBLICATION_NAME = 'Frontier Systems Review';

if (!/^\d+\.\d+\.\d+$/.test(appVersion)) throw new Error(`Invalid package version: ${appVersion}`);

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const escapeXml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const safePublicSegment = (value) => {
  const segment = String(value || '').trim();
  if (!segment || !/^[A-Za-z0-9._-]+$/.test(segment)) throw new Error(`Unsafe public route segment: ${segment}`);
  return segment;
};

const absoluteUrl = (path = '') => new URL(path, PUBLIC_BASE_URL).href;
const articleUrl = (id) => absoluteUrl(`articles/${safePublicSegment(id)}/`);
const issueUrl = (issueNumber) => absoluteUrl(`issues/${safePublicSegment(issueNumber)}/`);
const shareCardUrl = (id) => absoluteUrl(`share/${safePublicSegment(id)}.svg`);
const concise = (value = '', limit = 180) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);
};

const svgTextLines = (value, maxChars = 20, maxLines = 6) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  const lines = [];
  let line = '';
  for (const char of [...text]) {
    if (line.length >= maxChars) {
      lines.push(line);
      line = char;
      if (lines.length === maxLines) break;
    } else line += char;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && [...text].length > lines.join('').length) lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[，。；：、,.!?！？…\s]+$/u, '')}…`;
  return lines;
};

const renderShareSvg = (item, channel) => {
  const titleLines = svgTextLines(item.title, 18, 6);
  const body = item.key_quote || item.long_summary || item.short_summary || item.summary || '';
  const bodyLines = svgTextLines(body, 28, 7);
  const title = titleLines.map((line, index) => `<tspan x="72" dy="${index ? 88 : 0}">${escapeXml(line)}</tspan>`).join('');
  const summary = bodyLines.map((line, index) => `<tspan x="72" dy="${index ? 52 : 0}">${escapeXml(line)}</tspan>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">
  <rect width="1080" height="1440" fill="#f4f1ea"/>
  <rect x="72" y="72" width="936" height="4" fill="#171714"/>
  <text x="72" y="132" fill="#171714" font-family="Georgia, serif" font-size="30" font-weight="700">FRONTIER SYSTEMS REVIEW</text>
  <text x="72" y="174" fill="#6b675f" font-family="Arial, sans-serif" font-size="20" font-weight="600">${escapeXml(String(channel || '').toUpperCase())} · ${escapeXml(formatDate(item.published_at))}</text>
  <text x="72" y="292" fill="#171714" font-family="Georgia, serif" font-size="70" font-weight="600">${title}</text>
  <text x="72" y="860" fill="#8f2f21" font-family="Arial, sans-serif" font-size="19" font-weight="700">${item.key_quote ? 'KEY QUOTE' : 'WHY IT MATTERS'}</text>
  <text x="72" y="918" fill="#3f3c36" font-family="Georgia, serif" font-size="34" font-weight="500">${summary}</text>
  <line x1="72" y1="1210" x2="1008" y2="1210" stroke="#cbc5b8" stroke-width="2"/>
  <text x="72" y="1272" fill="#171714" font-family="Arial, sans-serif" font-size="25" font-weight="700">${escapeXml(item.source || '')}</text>
  <text x="72" y="1306" fill="#6b675f" font-family="Arial, sans-serif" font-size="18" font-weight="600">${escapeXml(item.source_tier || '')}</text>
  <text x="1008" y="1272" text-anchor="end" fill="#171714" font-family="Georgia, serif" font-size="27" font-weight="700">Newsflow</text>
  <text x="1008" y="1306" text-anchor="end" fill="#6b675f" font-family="Arial, sans-serif" font-size="17">Independent editorial review</text>
  <text x="1008" y="1344" text-anchor="end" fill="#6b675f" font-family="Arial, sans-serif" font-size="17">阅读全文 →</text>
</svg>`;
};

const pageStyles = `
:root{color-scheme:light dark;--paper:#f4f1ea;--ink:#171714;--soft:#5d5a52;--line:#cbc5b8;--signal:#8f2f21;--max:1120px;--read:760px}
*{box-sizing:border-box}html{font-family:"DM Sans",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--paper);color:var(--ink)}body{margin:0;background:var(--paper);color:var(--ink)}a{color:inherit}.pub-shell{width:min(var(--max),calc(100% - 40px));margin:0 auto}.pub-head{position:sticky;top:0;z-index:2;min-height:66px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:20px;border-bottom:1px solid var(--ink);background:color-mix(in srgb,var(--paper) 95%,transparent);backdrop-filter:blur(14px);font-size:12px}.pub-brand{font-family:"Newsreader",Georgia,serif;font-size:22px;font-weight:600;text-decoration:none}.pub-head span{color:var(--soft);text-align:center}.pub-share{border:0;padding:0;background:transparent;color:var(--signal);font-weight:700;cursor:pointer}.pub-progress{position:fixed;z-index:4;top:0;left:0;width:100%;height:2px;transform:scaleX(0);transform-origin:left center;background:var(--signal)}main{padding:clamp(58px,8vw,104px) 0 110px}.pub-article,.pub-issue{width:min(var(--read),100%);margin:0 auto}.pub-meta{display:flex;flex-wrap:wrap;gap:8px 16px;color:var(--soft);font-size:11px}.pub-kicker{margin:0 0 16px;color:var(--signal);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}h1{margin:18px 0 0;font-family:"Newsreader",Georgia,serif;font-size:clamp(44px,7vw,76px);font-weight:600;line-height:.98;letter-spacing:-.045em;text-wrap:balance}.standfirst{margin:28px 0 0;color:var(--soft);font-family:"Newsreader",Georgia,serif;font-size:clamp(21px,2.6vw,27px);line-height:1.48}.byline{margin-top:28px;padding-bottom:28px;border-bottom:1px solid var(--ink);color:var(--soft);font-size:12px}.pub-section{padding-top:40px}.pub-section+.pub-section{margin-top:40px;border-top:1px solid var(--line)}.pub-section h2{margin:0 0 16px;font-family:"Newsreader",Georgia,serif;font-size:32px;line-height:1.08}.pub-section p,.pub-section li{font-size:18px;line-height:1.78}.pub-section blockquote{margin:24px 0;padding-left:22px;border-left:2px solid var(--signal);color:var(--soft);font-family:"Newsreader",Georgia,serif;font-size:22px;line-height:1.5}.pub-action{display:inline-block;margin-top:18px;padding-bottom:3px;border-bottom:1px solid currentColor;color:var(--signal);font-weight:700;text-decoration:none}.issue-list{margin-top:22px;border-top:3px solid var(--ink)}.issue-item{display:grid;grid-template-columns:44px minmax(0,1fr);gap:16px;padding:22px 0;border-bottom:1px solid var(--line);text-decoration:none}.issue-item span{color:var(--soft);font-size:11px}.issue-item strong{font-family:"Newsreader",Georgia,serif;font-size:24px;line-height:1.12}.watch-list{padding-left:20px}.pub-foot{margin-top:70px;padding:24px 0 60px;border-top:1px solid var(--ink);color:var(--soft);font-size:12px}@media(max-width:640px){.pub-shell{width:min(100% - 30px,var(--max))}.pub-head{grid-template-columns:auto 1fr auto;gap:10px}.pub-head span{display:none}main{padding-top:50px}h1{font-size:clamp(42px,13vw,60px)}.pub-section p,.pub-section li{font-size:17px}}
`;

const shareScript = ({ title, url, image }) => `<script>
(() => {
  const button = document.querySelector('[data-static-share]');
  const progress = document.querySelector('.pub-progress');
  const sync = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    progress.style.transform = 'scaleX(' + Math.max(0, Math.min(1, scrollY / max)) + ')';
  };
  addEventListener('scroll', sync, { passive: true }); sync();
  button?.addEventListener('click', async () => {
    const payload = { title: ${JSON.stringify(title)}, url: ${JSON.stringify(url)} };
    try {
      if (navigator.share) await navigator.share(payload);
      else await navigator.clipboard.writeText(payload.url);
    } catch {}
  });
})();
</script>`;

const htmlDocument = ({ title, description, canonical, type = 'website', publishedAt = '', structuredData = null, image = '', body, share = false }) => `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#f4f1ea" />
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <link rel="alternate" type="application/atom+xml" title="${PUBLICATION_NAME}" href="${absoluteUrl('feed.xml')}" />
  <link rel="alternate" type="application/rss+xml" title="${PUBLICATION_NAME}" href="${absoluteUrl('rss.xml')}" />
  <link rel="icon" href="${absoluteUrl('icon.svg')}" type="image/svg+xml" />
  <meta property="og:type" content="${type}" />
  <meta property="og:locale" content="zh_CN" />
  <meta property="og:site_name" content="${PUBLICATION_NAME}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}" /><meta property="og:image:width" content="1080" /><meta property="og:image:height" content="1440" /><meta property="og:image:alt" content="${escapeHtml(title)}" />` : ''}
  ${publishedAt ? `<meta property="article:published_time" content="${escapeHtml(publishedAt)}" />` : ''}
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,600;6..72,700&display=swap" />
  <style>${pageStyles}</style>
  ${structuredData ? `<script type="application/ld+json">${JSON.stringify(structuredData).replaceAll('<', '\\u003c')}</script>` : ''}
  <title>${escapeHtml(title)} — ${PUBLICATION_NAME}</title>
</head>
<body>
  ${share ? '<div class="pub-progress" aria-hidden="true"></div>' : ''}
  <div class="pub-shell">
    <header class="pub-head"><a class="pub-brand" href="${PUBLIC_BASE_URL}">${PUBLICATION_NAME}</a><span>Published with Newsflow</span>${share ? '<button class="pub-share" type="button" data-static-share>分享</button>' : '<span></span>'}</header>
    ${body}
    <footer class="pub-foot"><a href="${PUBLIC_BASE_URL}">返回 ${PUBLICATION_NAME}</a></footer>
  </div>
  ${share ? shareScript({ title, url: canonical, image }) : ''}
</body>
</html>`;

const generatePublicationPages = async () => {
  const [edition, news, issues, storylines] = await Promise.all([
    readFile(resolve(root, 'public/data/edition.json'), 'utf8').then(JSON.parse),
    readFile(resolve(root, 'public/data/news.json'), 'utf8').then(JSON.parse),
    readFile(resolve(root, 'public/data/issues.json'), 'utf8').then(JSON.parse),
    readFile(resolve(root, 'public/data/storylines.json'), 'utf8').then(JSON.parse)
  ]);
  const publicNews = Array.isArray(news) ? news : [];
  const publicStorylines = Array.isArray(storylines) ? storylines : [];
  const publishedIssues = (Array.isArray(issues) ? issues : []).filter((issue) => issue?.status === 'published');
  const channelName = (id) => (edition.channels || []).find((channel) => channel.id === id)?.name || 'Editorial Signal';
  const byId = new Map(publicNews.map((item) => [String(item.id), item]));
  const shareDir = resolve(dist, 'share');
  await mkdir(shareDir, { recursive: true });

  for (const item of publicNews) {
    const id = safePublicSegment(item.id);
    const canonical = articleUrl(id);
    const shareImage = shareCardUrl(id);
    const shortSummary = String(item.short_summary || item.summary || '');
    const longSummary = String(item.long_summary || shortSummary);
    const description = concise(shortSummary || longSummary || item.title);
    const quotes = [item.key_quote, ...(Array.isArray(item.supporting_quotes) ? item.supporting_quotes : [])].filter(Boolean);
    const matchedStorylines = publicStorylines.filter((storyline) => (item.storyline_ids || []).includes(storyline.id));
    const related = publicNews
      .filter((candidate) => String(candidate.id) !== String(item.id))
      .map((candidate) => ({ candidate, score: Number(candidate.channel_id === item.channel_id) * 2 + (candidate.storyline_ids || []).filter((sid) => (item.storyline_ids || []).includes(sid)).length }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || new Date(b.candidate.published_at || 0).getTime() - new Date(a.candidate.published_at || 0).getTime())
      .slice(0, 3)
      .map((entry) => entry.candidate);
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: String(item.title || ''),
      description,
      image: shareImage,
      datePublished: item.published_at || undefined,
      dateModified: item.adopted_at || item.published_at || undefined,
      mainEntityOfPage: canonical,
      url: canonical,
      publisher: { '@type': 'Organization', name: 'Newsflow', url: PUBLIC_BASE_URL },
      isPartOf: { '@type': 'Periodical', name: edition.name || PUBLICATION_NAME, url: PUBLIC_BASE_URL }
    };
    const body = `<main><article class="pub-article">
      <div class="pub-meta"><span>${escapeHtml(channelName(item.channel_id))}</span><span>${escapeHtml(formatDate(item.published_at))}</span><span>${escapeHtml(item.source || '')}</span></div>
      <h1>${escapeHtml(item.title)}</h1>
      <p class="standfirst">${escapeHtml(shortSummary)}</p>
      <div class="byline">Newsflow Editorial Desk</div>
      ${longSummary && longSummary !== shortSummary ? `<section class="pub-section"><h2>为什么重要</h2><p>${escapeHtml(longSummary)}</p></section>` : ''}
      <section class="pub-section"><h2>证据与来源</h2>${quotes.length ? quotes.map((quote) => `<blockquote>${escapeHtml(quote)}</blockquote>`).join('') : '<p>当前公开记录未附加可摘录引文，请以原始来源为准。</p>'}<p>${escapeHtml(item.source || '')}${item.source_tier ? ` · ${escapeHtml(item.source_tier)}` : ''}</p><a class="pub-action" href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener noreferrer">查看原始来源 →</a></section>
      ${matchedStorylines.length ? `<section class="pub-section"><h2>长期议题</h2><ul>${matchedStorylines.map((storyline) => `<li><strong>${escapeHtml(storyline.title)}</strong>：${escapeHtml(storyline.current_view || storyline.baseline_view || '')}</li>`).join('')}</ul></section>` : ''}
      ${related.length ? `<section class="pub-section"><h2>相关阅读</h2><div class="issue-list">${related.map((candidate, index) => `<a class="issue-item" href="${articleUrl(candidate.id)}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(candidate.title)}</strong></a>`).join('')}</div></section>` : ''}
    </article></main>`;
    const articleDir = resolve(dist, 'articles', id);
    await mkdir(articleDir, { recursive: true });
    await writeFile(resolve(articleDir, 'index.html'), htmlDocument({
      title: String(item.title || PUBLICATION_NAME),
      description,
      canonical,
      type: 'article',
      publishedAt: item.published_at || '',
      structuredData,
      image: shareImage,
      share: true,
      body
    }), 'utf8');
    await writeFile(resolve(shareDir, `${id}.svg`), renderShareSvg(item, channelName(item.channel_id)), 'utf8');
  }

  for (const issue of publishedIssues) {
    const number = safePublicSegment(issue.issue_number);
    const canonical = issueUrl(number);
    const description = concise(issue.standfirst || issue.judgment || issue.title);
    const issueItems = (issue.signal_ids || []).map((id) => byId.get(String(id))).filter(Boolean);
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'PublicationIssue',
      name: String(issue.title || ''),
      issueNumber: String(issue.issue_number || ''),
      datePublished: issue.published_at || issue.coverage_start || undefined,
      url: canonical,
      isPartOf: { '@type': 'Periodical', name: edition.name || PUBLICATION_NAME, url: PUBLIC_BASE_URL },
      hasPart: issueItems.map((item) => ({ '@type': 'NewsArticle', headline: String(item.title || ''), url: articleUrl(item.id) }))
    };
    const body = `<main><article class="pub-issue">
      <p class="pub-kicker">Issue ${escapeHtml(issue.issue_number)}${issue.lifecycle === 'live' ? ' · Current' : ''}</p>
      <div class="pub-meta"><span>${escapeHtml(formatDate(issue.coverage_start || issue.published_at))}${issue.coverage_end ? `—${escapeHtml(formatDate(issue.coverage_end))}` : ''}</span><span>${issueItems.length} 篇</span></div>
      <h1>${escapeHtml(issue.title)}</h1>
      <p class="standfirst">${escapeHtml(issue.standfirst || '')}</p>
      <section class="pub-section"><h2>${issue.lifecycle === 'live' ? '当前判断' : '本期判断'}</h2><p>${escapeHtml(issue.judgment || '')}</p></section>
      <section class="pub-section"><h2>本期文章</h2><div class="issue-list">${issueItems.map((item, index) => `<a class="issue-item" href="${articleUrl(item.id)}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(item.title)}</strong></a>`).join('') || '<p>本期文章正在整理。</p>'}</div></section>
      ${Array.isArray(issue.what_to_watch) && issue.what_to_watch.length ? `<section class="pub-section"><h2>接下来关注</h2><ul class="watch-list">${issue.what_to_watch.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>` : ''}
    </article></main>`;
    const issueDir = resolve(dist, 'issues', number);
    await mkdir(issueDir, { recursive: true });
    await writeFile(resolve(issueDir, 'index.html'), htmlDocument({
      title: `Issue ${issue.issue_number} · ${issue.title}`,
      description,
      canonical,
      type: 'website',
      publishedAt: issue.published_at || issue.coverage_start || '',
      structuredData,
      body
    }), 'utf8');
  }

  const latestUpdated = [...publicNews]
    .map((item) => item.adopted_at || item.published_at)
    .filter(Boolean)
    .sort()
    .at(-1) || new Date(0).toISOString();
  const feedEntries = [...publicNews]
    .sort((a, b) => new Date(b.adopted_at || b.published_at || 0).getTime() - new Date(a.adopted_at || a.published_at || 0).getTime())
    .map((item) => `<entry><id>${escapeXml(articleUrl(item.id))}</id><title>${escapeXml(item.title)}</title><link href="${escapeXml(articleUrl(item.id))}"/><link rel="related" href="${escapeXml(item.url || articleUrl(item.id))}"/><updated>${escapeXml(item.adopted_at || item.published_at || latestUpdated)}</updated><published>${escapeXml(item.published_at || item.adopted_at || latestUpdated)}</published><summary>${escapeXml(concise(item.short_summary || item.long_summary || ''))}</summary></entry>`)
    .join('');
  await writeFile(resolve(dist, 'feed.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"><id>${PUBLIC_BASE_URL}</id><title>${PUBLICATION_NAME}</title><subtitle>AI 基建、CCUS 与能源转型的专业半月刊</subtitle><link href="${PUBLIC_BASE_URL}"/><link rel="self" href="${absoluteUrl('feed.xml')}"/><updated>${escapeXml(latestUpdated)}</updated>${feedEntries}</feed>\n`, 'utf8');

  const rssItems = [...publicNews]
    .sort((a, b) => new Date(b.adopted_at || b.published_at || 0).getTime() - new Date(a.adopted_at || a.published_at || 0).getTime())
    .map((item) => {
      const published = new Date(item.published_at || item.adopted_at || latestUpdated);
      const pubDate = Number.isNaN(published.getTime()) ? new Date(latestUpdated).toUTCString() : published.toUTCString();
      return `<item><guid isPermaLink="true">${escapeXml(articleUrl(item.id))}</guid><title>${escapeXml(item.title)}</title><link>${escapeXml(articleUrl(item.id))}</link><pubDate>${escapeXml(pubDate)}</pubDate><description>${escapeXml(concise(item.short_summary || item.long_summary || ''))}</description><category>${escapeXml(channelName(item.channel_id))}</category></item>`;
    })
    .join('');
  const latestDate = new Date(latestUpdated);
  const lastBuildDate = Number.isNaN(latestDate.getTime()) ? new Date(0).toUTCString() : latestDate.toUTCString();
  await writeFile(resolve(dist, 'rss.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${PUBLICATION_NAME}</title><link>${PUBLIC_BASE_URL}</link><description>AI 基建、CCUS 与能源转型的专业半月刊</description><language>zh-CN</language><lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate><atom:link href="${absoluteUrl('rss.xml')}" rel="self" type="application/rss+xml"/>${rssItems}</channel></rss>\n`, 'utf8');

  const sitemapEntries = [
    { loc: PUBLIC_BASE_URL, lastmod: latestUpdated },
    ...publishedIssues.map((issue) => ({ loc: issueUrl(issue.issue_number), lastmod: issue.updated_at || issue.published_at || issue.coverage_end || issue.coverage_start })),
    ...publicNews.map((item) => ({ loc: articleUrl(item.id), lastmod: item.adopted_at || item.published_at }))
  ];
  await writeFile(resolve(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries.map(({ loc, lastmod }) => `<url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${escapeXml(String(lastmod).slice(0, 10))}</lastmod>` : ''}</url>`).join('')}</urlset>\n`, 'utf8');
  await writeFile(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /NewsFlow/\nSitemap: ${absoluteUrl('sitemap.xml')}\n`, 'utf8');
};

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

let index = await readFile(resolve(root, 'index.html'), 'utf8');
index = index.replaceAll('__NEWSFLOW_VERSION__', appVersion);
const cloudflareAnalyticsToken = process.env.CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim() || '';
if (cloudflareAnalyticsToken) {
  const beacon = `    <script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token: cloudflareAnalyticsToken })}'></script>`;
  index = index.replace('  </head>', `${beacon}\n  </head>`);
}
await writeFile(resolve(dist, 'index.html'), index, 'utf8');
await cp(resolve(root, 'src/editorial-app.js'), resolve(dist, 'editorial-app.js'));
await cp(resolve(root, 'src/polish.js'), resolve(dist, 'polish.js'));
await cp(resolve(root, 'src/edition-layer.js'), resolve(dist, 'edition-layer.js'));
await cp(resolve(root, 'src/styles.css'), resolve(dist, 'styles.css'));
await cp(resolve(root, 'src/polish.css'), resolve(dist, 'polish.css'));
await cp(resolve(root, 'src/edition-layer.css'), resolve(dist, 'edition-layer.css'));
await cp(resolve(root, 'public'), dist, { recursive: true });

const swPath = resolve(dist, 'sw.js');
const sw = (await readFile(swPath, 'utf8')).replaceAll('__NEWSFLOW_VERSION__', appVersion);
await writeFile(swPath, sw, 'utf8');

// Source governance is public publication metadata. Unpublished manuscripts are not.
const sourceConfig = JSON.parse(await readFile(resolve(root, 'config/content-sources.json'), 'utf8'));
const sourceRegistry = (sourceConfig.sources || []).map((source) => ({
  id: source.id,
  name: source.name,
  domain: source.domain,
  path_prefixes: source.path_prefixes || [],
  class: source.class,
  tier: source.tier,
  channels: source.channels || [],
  storylines: source.storylines || [],
  allowed_uses: source.allowed_uses || [],
  limitations: source.limitations || [],
  report_source: Boolean(source.report_source),
  stakeholder_source: Boolean(source.stakeholder_source),
  report_families: source.report_families || [],
  leader_watch: source.leader_watch || null
}));
const distDataDir = resolve(dist, 'data');
await mkdir(distDataDir, { recursive: true });
await writeFile(resolve(distDataDir, 'source-registry.json'), `${JSON.stringify(sourceRegistry, null, 2)}\n`, 'utf8');

const publicSupabaseConfigPath = resolve(root, 'public/data/supabase-config.json');
const supabaseConfig = JSON.parse(await readFile(publicSupabaseConfigPath, 'utf8'));
const deploymentUrl = process.env.NEWSFLOW_SUPABASE_URL?.trim();
const deploymentKey = process.env.NEWSFLOW_SUPABASE_PUBLISHABLE_KEY?.trim();
if (Boolean(deploymentUrl) !== Boolean(deploymentKey)) {
  throw new Error('NEWSFLOW_SUPABASE_URL and NEWSFLOW_SUPABASE_PUBLISHABLE_KEY must be configured together.');
}
if (deploymentUrl && deploymentKey) {
  supabaseConfig.enabled = true;
  supabaseConfig.url = deploymentUrl;
  supabaseConfig.publishable_key = deploymentKey;
}
await writeFile(resolve(dist, 'data/supabase-config.json'), `${JSON.stringify(supabaseConfig, null, 2)}\n`, 'utf8');
await build({
  entryPoints: [resolve(root, 'src/supabase-feedback.js')],
  bundle: true,
  format: 'esm',
  minify: true,
  sourcemap: false,
  target: ['es2022'],
  outfile: resolve(dist, 'supabase-feedback.js')
});
await generatePublicationPages();

console.log(`NewsFlow build complete: v${appVersion}; static article/issue pages + Atom/RSS feeds + sitemap generated; public Reader contains adopted publication data only; Supabase sync ${supabaseConfig.enabled ? 'enabled' : 'disabled'}; Cloudflare RUM ${cloudflareAnalyticsToken ? 'enabled' : 'disabled'}.`);