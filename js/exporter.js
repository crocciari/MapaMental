import { buildBezierEdge } from './renderer.js';

const THEME_EXPORT_COLORS = {
  'dark-studio': {
    bg: '#080C16',
    nodeBg: '#111827',
    rootBg: '#1E293B',
    border: '#334155',
    text: '#F8FAFC',
    subtext: '#94A3B8',
  },
  neon: {
    bg: '#04040A',
    nodeBg: '#0C0E1C',
    rootBg: '#131632',
    border: '#4F46E5',
    text: '#FFFFFF',
    subtext: '#C7D2FE',
  },
  'clean-light': {
    bg: '#F4F6FA',
    nodeBg: '#FFFFFF',
    rootBg: '#FFFFFF',
    border: '#CBD5E1',
    text: '#0F172A',
    subtext: '#475569',
  },
  chalkboard: {
    bg: '#13201B',
    nodeBg: '#16251F',
    rootBg: '#1E332B',
    border: '#466157',
    text: '#FAF9F2',
    subtext: '#BDD1C7',
  },
  'chroma-key': {
    bg: '#00FF00',
    nodeBg: '#111827',
    rootBg: '#0F172A',
    border: '#334155',
    text: '#FFFFFF',
    subtext: '#CBD5E1',
  },
};

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(name) {
  return (
    String(name || 'mapa-mental')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'mapa-mental'
  );
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function wrapTextLines(text, maxChars) {
  const words = String(text || '').trim().split(/\s+/);
  if (!words[0]) return [''];
  const lines = [];
  let line = '';
  for (const word of words) {
    if (!line) {
      line = word;
    } else if (line.length + 1 + word.length <= maxChars) {
      line += ' ' + word;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function buildStandaloneSVG(store, layoutResult, { transparentBg = false } = {}) {
  const data = store.data;
  const palette = THEME_EXPORT_COLORS[data.theme] || THEME_EXPORT_COLORS['dark-studio'];
  const pad = 84;
  const { minX, minY, maxX, maxY } = layoutResult.bounds;
  const width = Math.max(400, Math.round(maxX - minX + pad * 2));
  const height = Math.max(260, Math.round(maxY - minY + pad * 2));
  const offsetX = -minX + pad;
  const offsetY = -minY + pad;

  const edgesSvg = [];
  const nodesSvg = [];

  for (const [id, pos] of layoutResult.positions.entries()) {
    const node = data.nodes[id];
    if (!node || !node.parentId) continue;
    const parentPos = layoutResult.positions.get(node.parentId);
    if (!parentPos) continue;

    const color = store.getEffectiveColor(id);
    const depth = store.getDepth(id);
    const strokeW = depth === 1 ? 3.2 : 2.3;
    const shiftedParent = { ...parentPos, x: parentPos.x + offsetX, y: parentPos.y + offsetY };
    const shiftedChild = { ...pos, x: pos.x + offsetX, y: pos.y + offsetY };
    const { d, endX, endY } = buildBezierEdge(shiftedParent, shiftedChild, data.layout);

    edgesSvg.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" opacity="0.92" />`,
      `<circle cx="${endX.toFixed(1)}" cy="${endY.toFixed(1)}" r="3.5" fill="${color}" />`
    );
  }

  for (const [id, pos] of layoutResult.positions.entries()) {
    const node = data.nodes[id];
    if (!node) continue;

    const color = store.getEffectiveColor(id);
    const depth = store.getDepth(id);
    const x = Math.round(pos.x - pos.width / 2 + offsetX);
    const y = Math.round(pos.y - pos.height / 2 + offsetY);
    const w = Math.round(pos.width);
    const h = Math.round(pos.height);
    const rx = node.style === 'pill' ? Math.round(h / 2) : depth === 0 ? 20 : 14;

    const isFilled = node.style === 'filled';
    const fill = isFilled ? color : depth === 0 ? palette.rootBg : palette.nodeBg;
    const stroke = isFilled ? color : depth === 0 ? color : palette.border;
    const strokeW = depth === 0 ? 2.2 : 1.5;
    const textColor = isFilled ? '#090D16' : palette.text;
    const subColor = isFilled ? '#1E293B' : palette.subtext;

    const titleFontSize = depth === 0 ? (node.size === 'lg' ? 21 : 19) : depth === 1 ? 15 : 14;
    const maxChars = Math.max(14, Math.floor((w - (node.icon ? 52 : 30)) / (titleFontSize * 0.56)));
    const titleLines = wrapTextLines(node.text || 'Sem título', maxChars);
    const subLines = node.subtitle ? wrapTextLines(node.subtitle, maxChars + 4) : [];

    const totalLinesHeight = titleLines.length * (titleFontSize + 4) + subLines.length * 16;
    const startY = y + Math.max(18, (h - totalLinesHeight) / 2 + titleFontSize * 0.78);
    const textX = depth === 0 ? x + w / 2 : x + (node.icon ? 42 : 18);
    const textAnchor = depth === 0 ? 'middle' : 'start';

    let accentBar = '';
    if (depth > 0 && node.style !== 'pill') {
      accentBar = `<rect x="${x}" y="${y + 10}" width="3.5" height="${Math.max(10, h - 20)}" rx="2" fill="${color}" />`;
    }

    let iconSvg = '';
    if (node.icon) {
      const iconX = depth === 0 ? x + 22 : x + 16;
      const iconY = y + h / 2 + 6;
      iconSvg = `<text x="${iconX}" y="${iconY}" font-size="${depth === 0 ? 22 : 17}" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${escapeXml(node.icon)}</text>`;
    }

    const tspans = titleLines
      .map(
        (ln, i) =>
          `<tspan x="${textX}" dy="${i === 0 ? 0 : titleFontSize + 4}">${escapeXml(ln)}</tspan>`
      )
      .join('');

    let subSvg = '';
    if (subLines.length) {
      const subY = startY + titleLines.length * (titleFontSize + 4) + 2;
      const subTspans = subLines
        .map((ln, i) => `<tspan x="${textX}" dy="${i === 0 ? 0 : 16}">${escapeXml(ln)}</tspan>`)
        .join('');
      subSvg = `<text x="${textX}" y="${subY}" text-anchor="${textAnchor}" font-size="12" font-weight="500" fill="${subColor}" font-family="Plus Jakarta Sans, Inter, Segoe UI, sans-serif">${subTspans}</text>`;
    }

    nodesSvg.push(`
      <g filter="url(#card-shadow)">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />
        ${accentBar}
        ${iconSvg}
        <text x="${textX}" y="${startY}" text-anchor="${textAnchor}" font-size="${titleFontSize}" font-weight="${depth === 0 ? 800 : depth === 1 ? 700 : 600}" fill="${textColor}" font-family="Plus Jakarta Sans, Inter, Segoe UI, sans-serif">${tspans}</text>
        ${subSvg}
      </g>
    `);
  }

  const bgRect = transparentBg ? '' : `<rect width="${width}" height="${height}" fill="${palette.bg}" />`;

  return {
    width,
    height,
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="card-shadow" x="-15%" y="-15%" width="130%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.28" />
    </filter>
  </defs>
  ${bgRect}
  <g>${edgesSvg.join('\n')}</g>
  <g>${nodesSvg.join('\n')}</g>
</svg>`,
  };
}

export function exportSVG(store, layoutResult) {
  const { svg } = buildStandaloneSVG(store, layoutResult, { transparentBg: false });
  const filename = `${slugify(store.data.title)}.svg`;
  triggerDownload(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

export async function exportPNG(store, layoutResult, { transparentBg = false } = {}) {
  const { svg, width, height } = buildStandaloneSVG(store, layoutResult, { transparentBg });
  const targetMax = 3840;
  const scale = Math.min(3.5, Math.max(2, targetMax / Math.max(width, height)));
  const outW = Math.round(width * scale);
  const outH = Math.round(height * scale);

  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Falha ao converter SVG em imagem PNG.'));
      image.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, outW, outH);

    const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const suffix = transparentBg ? '-transparente' : '-4k';
    triggerDownload(pngBlob, `${slugify(store.data.title)}${suffix}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function exportJSON(store) {
  const json = JSON.stringify(store.exportData(), null, 2);
  const filename = `${slugify(store.data.title)}.json`;
  triggerDownload(new Blob([json], { type: 'application/json;charset=utf-8' }), filename);
}

export function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch {
        reject(new Error('Arquivo JSON inválido.'));
      }
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsText(file, 'utf-8');
  });
}
