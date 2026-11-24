/**
 * Armazenamento local de imagens em IndexedDB com suporte nativo e otimização automática para .webp.
 */

const DB_NAME = 'mapamental_studio_media_v1';
const STORE_NAME = 'images';
const MAX_DIMENSION = 1200;
const WEBP_PASSTHROUGH_BYTES = 400 * 1024;

const ALLOWED_MIMES = new Set([
  'image/webp',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/svg+xml',
]);

function generateMediaId() {
  return 'img_' + Math.random().toString(36).slice(2, 10);
}

export function extensionFromMime(mime) {
  switch ((mime || '').toLowerCase()) {
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    default:
      return 'webp';
  }
}

export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

function slugifyFileName(name) {
  return (
    String(name || 'imagem-mapa')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'imagem-mapa'
  );
}

export function computeDisplayBox(naturalW, naturalH, size = 'md') {
  const limits = {
    sm: { w: 160, h: 110 },
    md: { w: 260, h: 170 },
    lg: { w: 340, h: 230 },
  };
  const lim = limits[size] || limits.md;
  const nw = Math.max(1, Number(naturalW) || lim.w);
  const nh = Math.max(1, Number(naturalH) || lim.h);

  const scale = Math.min(lim.w / nw, lim.h / nh, 1.2);
  return {
    width: Math.max(40, Math.round(nw * scale)),
    height: Math.max(32, Math.round(nh * scale)),
  };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

function loadImageDimensions(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        img,
        width: img.naturalWidth || 320,
        height: img.naturalHeight || 200,
      });
    };
    img.onerror = () => reject(new Error('Não foi possível decodificar a imagem.'));
    img.src = url;
  });
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

export class MediaStore {
  constructor() {
    this.cache = new Map();
    this.memoryFallback = new Map();
    this.dbPromise = null;
  }

  _openDb() {
    if (this.dbPromise) return this.dbPromise;
    if (typeof indexedDB === 'undefined') {
      this.dbPromise = Promise.resolve(null);
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  async _putRecord(record) {
    const db = await this._openDb();
    if (!db) {
      this.memoryFallback.set(record.id, record);
      return;
    }
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Erro ao salvar imagem no IndexedDB.'));
    });
  }

  async _getRecord(id) {
    const db = await this._openDb();
    if (!db) {
      return this.memoryFallback.get(id) || null;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  _cacheRecord(record) {
    const existing = this.cache.get(record.id);
    if (existing?.url && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      URL.revokeObjectURL(existing.url);
    }
    const url =
      record.dataUrl ||
      (typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(record.blob) : '');
    const entry = {
      id: record.id,
      url,
      blob: record.blob,
      mime: record.mime,
      width: record.width,
      height: record.height,
      sizeBytes: record.sizeBytes || record.blob?.size || 0,
    };
    this.cache.set(record.id, entry);
    return entry;
  }

  getImageEntry(id) {
    return this.cache.get(id) || null;
  }

  async loadImages(ids) {
    let anyLoaded = false;
    const unique = [...new Set((ids || []).filter(Boolean))];
    for (const id of unique) {
      if (this.cache.has(id)) continue;
      const rec = await this._getRecord(id);
      if (rec) {
        this._cacheRecord(rec);
        anyLoaded = true;
      }
    }
    return anyLoaded;
  }

  async saveImageFromFile(file) {
    if (!file) throw new Error('Nenhum arquivo informado.');
    const mime = (file.type || '').toLowerCase();
    const isWebpExt = /\.webp$/i.test(file.name || '');
    const effectiveMime = mime || (isWebpExt ? 'image/webp' : '');

    if (!ALLOWED_MIMES.has(effectiveMime)) {
      throw new Error('Formato não suportado. Use WebP, PNG, JPG, GIF ou SVG.');
    }

    const tempUrl = URL.createObjectURL(file);
    try {
      const { img, width: natW, height: natH } = await loadImageDimensions(tempUrl);

      let outBlob = file;
      let outMime = effectiveMime;
      let outW = natW;
      let outH = natH;

      const isSvg = effectiveMime === 'image/svg+xml';
      const isSmallWebp =
        effectiveMime === 'image/webp' &&
        file.size <= WEBP_PASSTHROUGH_BYTES &&
        Math.max(natW, natH) <= MAX_DIMENSION;

      if (!isSvg && !isSmallWebp) {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(natW, natH));
        outW = Math.max(1, Math.round(natW * scale));
        outH = Math.max(1, Math.round(natH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, outW, outH);

        let encoded = await canvasToBlob(canvas, 'image/webp', 0.88);
        if (!encoded || encoded.type !== 'image/webp') {
          encoded = await canvasToBlob(canvas, 'image/png', 0.92);
        }
        if (encoded) {
          outBlob = encoded;
          outMime = encoded.type || 'image/webp';
        }
      }

      const id = generateMediaId();
      const sizeBytes = outBlob?.size || 0;
      const record = {
        id,
        blob: outBlob,
        mime: outMime,
        width: outW,
        height: outH,
        sizeBytes,
        createdAt: Date.now(),
      };
      await this._putRecord(record);
      this._cacheRecord(record);

      return {
        id,
        width: outW,
        height: outH,
        mime: outMime,
        sizeBytes,
        originalBytes: file.size || sizeBytes,
      };
    } finally {
      URL.revokeObjectURL(tempUrl);
    }
  }

  async saveImageFromDataUrl(dataUrl, meta = {}) {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    const id = meta.id || generateMediaId();
    const mimeMatch = dataUrl.match(/^data:([^;]+);/);
    const mime = meta.mime || (mimeMatch ? mimeMatch[1] : 'image/webp');

    let blob = null;
    if (typeof fetch === 'function') {
      try {
        blob = await dataUrlToBlob(dataUrl);
      } catch {
        blob = null;
      }
    }

    const record = {
      id,
      blob,
      dataUrl: blob ? undefined : dataUrl,
      mime,
      width: Number(meta.width) || 320,
      height: Number(meta.height) || 200,
      createdAt: Date.now(),
    };
    await this._putRecord(record);
    this._cacheRecord({ ...record, dataUrl });
    return { id, width: record.width, height: record.height, mime };
  }

  async getImageAsDataUrl(id) {
    if (!id) return null;
    let entry = this.cache.get(id);
    if (!entry) {
      await this.loadImages([id]);
      entry = this.cache.get(id);
    }
    if (!entry) return null;
    if (entry.url && entry.url.startsWith('data:')) return entry.url;
    if (entry.blob) {
      return blobToDataUrl(entry.blob);
    }
    return null;
  }

  async deleteImage(id) {
    if (!id) return false;
    const cached = this.cache.get(id);
    if (cached?.url && cached.url.startsWith('blob:') && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      URL.revokeObjectURL(cached.url);
    }
    this.cache.delete(id);
    this.memoryFallback.delete(id);

    const db = await this._openDb();
    if (!db) return true;
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    return true;
  }

  async pruneUnused(activeIdsSet) {
    const keep = activeIdsSet instanceof Set ? activeIdsSet : new Set(activeIdsSet || []);
    const db = await this._openDb();
    let deleted = 0;

    if (!db) {
      for (const id of [...this.memoryFallback.keys()]) {
        if (!keep.has(id)) {
          await this.deleteImage(id);
          deleted += 1;
        }
      }
      return deleted;
    }

    const keys = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    for (const id of keys) {
      if (!keep.has(id)) {
        await this.deleteImage(id);
        deleted += 1;
      }
    }
    return deleted;
  }

  async downloadImage(id, suggestedName = 'imagem-mapa') {
    if (!id) throw new Error('Nenhuma imagem selecionada.');
    let entry = this.cache.get(id);
    if (!entry) {
      await this.loadImages([id]);
      entry = this.cache.get(id);
    }
    if (!entry) throw new Error('Imagem não encontrada no armazenamento local.');

    const ext = extensionFromMime(entry.mime);
    const filename = `${slugifyFileName(suggestedName)}.${ext}`;

    let href = entry.url;
    let shouldRevoke = false;
    if (entry.blob && typeof URL !== 'undefined' && URL.createObjectURL) {
      href = URL.createObjectURL(entry.blob);
      shouldRevoke = true;
    }

    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    if (shouldRevoke) {
      setTimeout(() => URL.revokeObjectURL(href), 1500);
    }
    return filename;
  }
}
