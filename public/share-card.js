(() => {
  const SHARE_WIDTH = 1080;
  const SHARE_HEIGHT = 1440;
  const PUBLICATION = 'FRONTIER SYSTEMS REVIEW';
  const LIGHT_PALETTE = {
    paper: '#f4f1ea', ink: '#171714', muted: '#6b675f', body: '#3f3c36',
    accent: '#8f2f21', rule: '#cbc5b8'
  };
  const DARK_PALETTE = {
    paper: '#161715', ink: '#f2efe7', muted: '#a5a29a', body: '#d8d4c9',
    accent: '#ff8a76', rule: '#3a3e39'
  };
  const resolvePalette = () => {
    try {
      if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return DARK_PALETTE;
    } catch {
      // Ignore media-query failures and fall back to the light editorial card.
    }
    return LIGHT_PALETTE;
  };
  const safeText = (value = '') => String(value || '').replace(/\s+/g, ' ').trim();

  const wrapText = (ctx, text, maxWidth) => {
    const chars = [...safeText(text)];
    const lines = [];
    let line = '';
    for (const char of chars) {
      const next = `${line}${char}`;
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = char;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };

  const drawLines = (ctx, lines, x, y, lineHeight, maxLines) => {
    const visible = lines.slice(0, maxLines);
    visible.forEach((line, index) => {
      const last = index === maxLines - 1 && lines.length > maxLines;
      ctx.fillText(last ? `${line.replace(/[，。；：、,.!?！？…\s]+$/u, '')}…` : line, x, y + index * lineHeight);
    });
    return y + visible.length * lineHeight;
  };

  const render = async ({ title, summary, source, sourceTier, channel, date, url, quote = '' }) => {
    const canvas = document.createElement('canvas');
    canvas.width = SHARE_WIDTH;
    canvas.height = SHARE_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');

    const palette = resolvePalette();
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);
    ctx.fillStyle = palette.ink;
    ctx.fillRect(72, 72, 936, 4);

    ctx.fillStyle = palette.ink;
    ctx.font = '700 30px Georgia, serif';
    ctx.fillText(PUBLICATION, 72, 132);
    ctx.fillStyle = palette.muted;
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillText(`${safeText(channel).toUpperCase()} · ${safeText(date)}`, 72, 174);

    ctx.fillStyle = palette.ink;
    ctx.font = '600 70px Georgia, serif';
    const titleLines = wrapText(ctx, title, 888);
    let cursorY = drawLines(ctx, titleLines, 72, 292, 88, 6) + 42;

    ctx.fillStyle = palette.accent;
    ctx.font = '700 19px system-ui, sans-serif';
    ctx.fillText(quote ? 'KEY QUOTE' : 'WHY IT MATTERS', 72, cursorY);
    cursorY += 46;

    ctx.fillStyle = palette.body;
    ctx.font = quote ? '500 36px Georgia, serif' : '500 34px Georgia, serif';
    const body = quote || summary;
    const bodyLines = wrapText(ctx, body, 888);
    cursorY = drawLines(ctx, bodyLines, 72, cursorY, 52, 8) + 44;

    ctx.strokeStyle = palette.rule;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(72, Math.min(cursorY, 1180));
    ctx.lineTo(1008, Math.min(cursorY, 1180));
    ctx.stroke();

    const footerY = 1272;
    ctx.fillStyle = palette.ink;
    ctx.font = '700 25px system-ui, sans-serif';
    ctx.fillText(safeText(source), 72, footerY);
    ctx.fillStyle = palette.muted;
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillText(safeText(sourceTier || 'Editorial source'), 72, footerY + 34);

    ctx.fillStyle = palette.ink;
    ctx.textAlign = 'right';
    ctx.font = '700 27px Georgia, serif';
    ctx.fillText('Newsflow', 1008, footerY);
    ctx.fillStyle = palette.muted;
    ctx.font = '500 17px system-ui, sans-serif';
    ctx.fillText('Independent editorial review', 1008, footerY + 34);
    ctx.fillText('阅读全文 →', 1008, footerY + 72);
    ctx.textAlign = 'left';

    canvas.dataset.shareUrl = safeText(url);
    return canvas;
  };

  const toBlob = (canvas) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Unable to create PNG')), 'image/png', 0.95);
  });

  const download = async (canvas, filename) => {
    const blob = await toBlob(canvas);
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  window.NewsFlowShareCard = { render, toBlob, download };
})();
