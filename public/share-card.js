(() => {
  const SHARE_WIDTH = 1080;
  const SHARE_HEIGHT = 1440;
  const PUBLICATION = 'FRONTIER SYSTEMS REVIEW';
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

    ctx.fillStyle = '#f4f1ea';
    ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);
    ctx.fillStyle = '#171714';
    ctx.fillRect(72, 72, 936, 4);

    ctx.fillStyle = '#171714';
    ctx.font = '700 30px Georgia, serif';
    ctx.fillText(PUBLICATION, 72, 132);
    ctx.fillStyle = '#6b675f';
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillText(`${safeText(channel).toUpperCase()} · ${safeText(date)}`, 72, 174);

    ctx.fillStyle = '#171714';
    ctx.font = '600 70px Georgia, serif';
    const titleLines = wrapText(ctx, title, 888);
    let cursorY = drawLines(ctx, titleLines, 72, 292, 88, 6) + 42;

    ctx.fillStyle = '#8f2f21';
    ctx.font = '700 19px system-ui, sans-serif';
    ctx.fillText(quote ? 'KEY QUOTE' : 'WHY IT MATTERS', 72, cursorY);
    cursorY += 46;

    ctx.fillStyle = '#3f3c36';
    ctx.font = quote ? '500 36px Georgia, serif' : '500 34px Georgia, serif';
    const body = quote || summary;
    const bodyLines = wrapText(ctx, body, 888);
    cursorY = drawLines(ctx, bodyLines, 72, cursorY, 52, 8) + 44;

    ctx.strokeStyle = '#cbc5b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(72, Math.min(cursorY, 1180));
    ctx.lineTo(1008, Math.min(cursorY, 1180));
    ctx.stroke();

    const footerY = 1272;
    ctx.fillStyle = '#171714';
    ctx.font = '700 25px system-ui, sans-serif';
    ctx.fillText(safeText(source), 72, footerY);
    ctx.fillStyle = '#6b675f';
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillText(safeText(sourceTier || 'Editorial source'), 72, footerY + 34);

    ctx.fillStyle = '#171714';
    ctx.textAlign = 'right';
    ctx.font = '700 27px Georgia, serif';
    ctx.fillText('Newsflow', 1008, footerY);
    ctx.fillStyle = '#6b675f';
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
