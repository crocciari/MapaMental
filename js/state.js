import { BRANCH_PALETTE, TEMPLATES } from './templates.js';

const STORAGE_KEY = 'mapamental_studio_v1';
const LIBRARY_KEY = 'mapamental_studio_library_v1';
const MAX_HISTORY = 60;

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function generateId() {
  return 'n_' + Math.random().toString(36).slice(2, 9);
}

function generateMapId() {
  return 'map_' + Math.random().toString(36).slice(2, 10);
}

export class MindMapStore {
  constructor() {
    this.listeners = new Set();
    this.history = [];
    this.future = [];
    this.selectedId = 'root';
    this.activeMapId = null;
    this.library = { activeMapId: null, maps: {} };
    this.data = this._loadInitial();
  }

  _loadInitial() {
    // 1. Tenta carregar a biblioteca multi-mapas
    try {
      const rawLib = localStorage.getItem(LIBRARY_KEY);
      if (rawLib) {
        const parsedLib = JSON.parse(rawLib);
        if (parsedLib && parsedLib.maps && typeof parsedLib.maps === 'object') {
          const validEntries = Object.values(parsedLib.maps).filter(
            (entry) => entry && entry.id && this._isValidData(entry.data)
          );
          if (validEntries.length > 0) {
            this.library = {
              activeMapId: parsedLib.activeMapId,
              maps: Object.fromEntries(validEntries.map((e) => [e.id, e])),
            };
            const targetId = this.library.maps[parsedLib.activeMapId]
              ? parsedLib.activeMapId
              : validEntries[0].id;
            this.activeMapId = targetId;
            this.library.activeMapId = targetId;
            const activeData = deepClone(this.library.maps[targetId].data);
            this.selectedId = activeData.rootId;
            return activeData;
          }
        }
      }
    } catch {
      // Ignora erro ao ler biblioteca
    }

    // 2. Migra mapa legado único (STORAGE_KEY) se existir
    let initialData = null;
    try {
      const rawLegacy = localStorage.getItem(STORAGE_KEY);
      if (rawLegacy) {
        const parsedLegacy = JSON.parse(rawLegacy);
        if (this._isValidData(parsedLegacy)) {
          initialData = parsedLegacy;
        }
      }
    } catch {
      // Ignora erro ao ler legado
    }

    // 3. Caso contrário, cria a partir do modelo padrão
    if (!initialData) {
      initialData = TEMPLATES['youtube-video'].create();
    }

    const now = Date.now();
    const mapId = generateMapId();
    this.activeMapId = mapId;
    this.library = {
      activeMapId: mapId,
      maps: {
        [mapId]: {
          id: mapId,
          createdAt: now,
          updatedAt: now,
          data: deepClone(initialData),
        },
      },
    };
    this.selectedId = initialData.rootId;
    this._saveLibraryToStorage();
    return initialData;
  }

  _isValidData(obj) {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.rootId === 'string' &&
      obj.nodes &&
      typeof obj.nodes === 'object' &&
      obj.nodes[obj.rootId]
    );
  }

  _saveLibraryToStorage() {
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(this.library));
    } catch {
      // Ignora erro de quota
    }
  }

  _persist() {
    const now = Date.now();
    if (!this.activeMapId || !this.library.maps[this.activeMapId]) {
      const mapId = this.activeMapId || generateMapId();
      this.activeMapId = mapId;
      this.library.maps[mapId] = {
        id: mapId,
        createdAt: now,
        updatedAt: now,
        data: deepClone(this.data),
      };
    } else {
      this.library.maps[this.activeMapId].data = deepClone(this.data);
      this.library.maps[this.activeMapId].updatedAt = now;
    }
    this.library.activeMapId = this.activeMapId;
    this._saveLibraryToStorage();
  }

  _pushHistory() {
    this.history.push(deepClone(this.data));
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
    this.future = [];
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(reason = 'update') {
    this._persist();
    for (const fn of this.listeners) {
      fn(this.data, reason);
    }
  }

  canUndo() {
    return this.history.length > 0;
  }

  canRedo() {
    return this.future.length > 0;
  }

  undo() {
    if (!this.canUndo()) return false;
    this.future.push(deepClone(this.data));
    this.data = this.history.pop();
    if (!this.data.nodes[this.selectedId]) {
      this.selectedId = this.data.rootId;
    }
    this.notify('undo');
    return true;
  }

  redo() {
    if (!this.canRedo()) return false;
    this.history.push(deepClone(this.data));
    this.data = this.future.pop();
    if (!this.data.nodes[this.selectedId]) {
      this.selectedId = this.data.rootId;
    }
    this.notify('redo');
    return true;
  }

  select(nodeId) {
    if (!this.data.nodes[nodeId]) return;
    if (this.selectedId === nodeId) return;
    this.selectedId = nodeId;
    this.notify('selection');
  }

  getNode(nodeId) {
    return this.data.nodes[nodeId] || null;
  }

  getSelectedNode() {
    return this.data.nodes[this.selectedId] || this.data.nodes[this.data.rootId];
  }

  getDepth(nodeId) {
    let depth = 0;
    let cur = this.data.nodes[nodeId];
    while (cur && cur.parentId) {
      depth += 1;
      cur = this.data.nodes[cur.parentId];
    }
    return depth;
  }

  getEffectiveColor(nodeId) {
    let cur = this.data.nodes[nodeId];
    while (cur) {
      if (cur.color) return cur.color;
      cur = cur.parentId ? this.data.nodes[cur.parentId] : null;
    }
    return BRANCH_PALETTE[0];
  }

  getAncestorIds(nodeId) {
    const ids = [];
    let cur = this.data.nodes[nodeId];
    while (cur) {
      ids.push(cur.id);
      cur = cur.parentId ? this.data.nodes[cur.parentId] : null;
    }
    return ids;
  }

  getVisibleDescendantCount(nodeId) {
    const node = this.data.nodes[nodeId];
    if (!node) return 0;
    let count = 0;
    for (const childId of node.children) {
      count += 1 + this.getVisibleDescendantCount(childId);
    }
    return count;
  }

  getVisibleDfsOrder() {
    const order = [];
    const visit = (id) => {
      const n = this.data.nodes[id];
      if (!n) return;
      order.push(id);
      if (!n.collapsed) {
        for (const childId of n.children) {
          visit(childId);
        }
      }
    };
    visit(this.data.rootId);
    return order;
  }

  setMeta(patch, { recordHistory = false } = {}) {
    if (recordHistory) this._pushHistory();
    Object.assign(this.data, patch);
    this.notify('meta');
  }

  updateNode(nodeId, patch, { recordHistory = true } = {}) {
    const node = this.data.nodes[nodeId];
    if (!node) return;
    if (recordHistory) this._pushHistory();
    Object.assign(node, patch);
    this.notify('node-update');
  }

  recordSnapshot() {
    this._pushHistory();
  }

  addChild(parentId, text = 'Novo Tópico') {
    const parent = this.data.nodes[parentId];
    if (!parent) return null;

    this._pushHistory();
    parent.collapsed = false;

    const id = generateId();
    const isLevel1 = parentId === this.data.rootId;

    let side = parent.side || 'right';
    let color = null;

    if (isLevel1) {
      const rightCount = parent.children.filter(
        (cid) => (this.data.nodes[cid]?.side || 'right') === 'right'
      ).length;
      const leftCount = parent.children.length - rightCount;
      side = rightCount <= leftCount ? 'right' : 'left';
      color = BRANCH_PALETTE[parent.children.length % BRANCH_PALETTE.length];
    }

    this.data.nodes[id] = {
      id,
      parentId,
      text,
      subtitle: '',
      icon: '',
      color,
      style: 'default',
      size: 'md',
      side,
      collapsed: false,
      offsetX: 0,
      offsetY: 0,
      children: [],
    };

    parent.children.push(id);
    this.selectedId = id;
    this.notify('node-add');
    return id;
  }

  addSibling(nodeId, text = 'Novo Tópico') {
    const node = this.data.nodes[nodeId];
    if (!node) return null;
    if (!node.parentId) {
      return this.addChild(node.id, text);
    }

    const parent = this.data.nodes[node.parentId];
    if (!parent) return null;

    this._pushHistory();
    const id = generateId();
    const isLevel1 = parent.id === this.data.rootId;
    const idx = parent.children.indexOf(nodeId);

    this.data.nodes[id] = {
      id,
      parentId: parent.id,
      text,
      subtitle: '',
      icon: '',
      color: isLevel1 ? BRANCH_PALETTE[parent.children.length % BRANCH_PALETTE.length] : null,
      style: 'default',
      size: 'md',
      side: node.side || 'right',
      collapsed: false,
      offsetX: 0,
      offsetY: 0,
      children: [],
    };

    parent.children.splice(idx + 1, 0, id);
    this.selectedId = id;
    this.notify('node-add');
    return id;
  }

  deleteNode(nodeId) {
    const node = this.data.nodes[nodeId];
    if (!node || nodeId === this.data.rootId) return false;

    this._pushHistory();
    const parent = this.data.nodes[node.parentId];
    const siblingIdx = parent ? parent.children.indexOf(nodeId) : -1;

    const removeSubtree = (id) => {
      const target = this.data.nodes[id];
      if (!target) return;
      for (const cid of [...target.children]) {
        removeSubtree(cid);
      }
      delete this.data.nodes[id];
    };

    removeSubtree(nodeId);

    if (parent) {
      parent.children = parent.children.filter((cid) => cid !== nodeId);
      const nextSibling = parent.children[Math.max(0, siblingIdx - 1)];
      this.selectedId = nextSibling || parent.id;
    } else {
      this.selectedId = this.data.rootId;
    }

    this.notify('node-delete');
    return true;
  }

  reparentNode(nodeId, newParentId) {
    if (nodeId === this.data.rootId || nodeId === newParentId) return false;
    const node = this.data.nodes[nodeId];
    const newParent = this.data.nodes[newParentId];
    if (!node || !newParent) return false;
    if (node.parentId === newParentId) return false;

    // Impede ciclos (não pode soltar pai dentro de filho/neto)
    let check = newParent;
    while (check) {
      if (check.id === nodeId) return false;
      check = check.parentId ? this.data.nodes[check.parentId] : null;
    }

    this._pushHistory();
    const oldParent = this.data.nodes[node.parentId];
    if (oldParent) {
      oldParent.children = oldParent.children.filter((cid) => cid !== nodeId);
    }

    node.parentId = newParentId;
    node.offsetX = 0;
    node.offsetY = 0;
    newParent.collapsed = false;
    newParent.children.push(nodeId);

    if (newParentId === this.data.rootId) {
      if (!node.color) {
        node.color = BRANCH_PALETTE[newParent.children.length % BRANCH_PALETTE.length];
      }
    } else {
      node.side = newParent.side || 'right';
    }

    this.selectedId = nodeId;
    this.notify('reparent');
    return true;
  }

  toggleCollapse(nodeId) {
    const node = this.data.nodes[nodeId];
    if (!node || node.children.length === 0 || nodeId === this.data.rootId) return false;
    this._pushHistory();
    node.collapsed = !node.collapsed;
    this.notify('collapse');
    return true;
  }

  moveNodeOrder(nodeId, delta) {
    if (!delta) return false;
    const node = this.data.nodes[nodeId];
    if (!node || !node.parentId) return false;
    const parent = this.data.nodes[node.parentId];
    if (!parent) return false;

    const idx = parent.children.indexOf(nodeId);
    const targetIdx = idx + delta;
    if (idx < 0 || targetIdx < 0 || targetIdx >= parent.children.length) return false;

    this._pushHistory();
    parent.children.splice(idx, 1);
    parent.children.splice(targetIdx, 0, nodeId);
    this.notify('reorder');
    return true;
  }

  toggleNodeSide(nodeId) {
    const node = this.data.nodes[nodeId];
    if (!node || node.parentId !== this.data.rootId) return false;

    this._pushHistory();
    const nextSide = node.side === 'left' ? 'right' : 'left';
    const applySide = (id) => {
      const target = this.data.nodes[id];
      if (!target) return;
      target.side = nextSide;
      for (const cid of target.children) {
        applySide(cid);
      }
    };
    applySide(nodeId);
    node.offsetX = 0;
    node.offsetY = 0;
    this.notify('side-toggle');
    return true;
  }

  resetOffsets() {
    this._pushHistory();
    for (const node of Object.values(this.data.nodes)) {
      node.offsetX = 0;
      node.offsetY = 0;
    }
    this.notify('relayout');
  }

  loadTemplate(templateId) {
    const tpl = TEMPLATES[templateId];
    if (!tpl) return false;
    this._pushHistory();
    this.data = tpl.create();
    this.selectedId = this.data.rootId;
    this.notify('template');
    return true;
  }

  importData(jsonObj) {
    if (!this._isValidData(jsonObj)) {
      throw new Error('Arquivo JSON inválido para o MapaMental Studio.');
    }
    this._pushHistory();
    this.data = deepClone(jsonObj);
    this.selectedId = this.data.rootId;
    this.notify('import');
  }

  exportData() {
    return deepClone(this.data);
  }

  getAllImageIds() {
    const ids = new Set();
    for (const node of Object.values(this.data.nodes || {})) {
      if (node?.image?.id) {
        ids.add(node.image.id);
      }
    }
    return [...ids];
  }

  getAllLibraryImageIds() {
    const ids = new Set(this.getAllImageIds());
    for (const entry of Object.values(this.library.maps || {})) {
      if (!entry?.data?.nodes) continue;
      for (const node of Object.values(entry.data.nodes)) {
        if (node?.image?.id) {
          ids.add(node.image.id);
        }
      }
    }
    return ids;
  }

  listMaps() {
    return Object.values(this.library.maps)
      .map((entry) => {
        const root = entry.data.nodes?.[entry.data.rootId];
        return {
          id: entry.id,
          title: entry.data.title || root?.text || 'Sem título',
          icon: root?.icon || '🧠',
          theme: entry.data.theme || 'dark-studio',
          layout: entry.data.layout || 'bilateral',
          nodeCount: Object.keys(entry.data.nodes || {}).length,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          isActive: entry.id === this.activeMapId,
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  createMap(templateId = 'blank', customTitle) {
    const tpl = TEMPLATES[templateId] || TEMPLATES.blank;
    const newData = tpl.create();
    if (customTitle && customTitle.trim()) {
      newData.title = customTitle.trim();
    }
    const now = Date.now();
    const mapId = generateMapId();

    this.library.maps[mapId] = {
      id: mapId,
      createdAt: now,
      updatedAt: now,
      data: deepClone(newData),
    };
    this.activeMapId = mapId;
    this.library.activeMapId = mapId;
    this.data = newData;
    this.history = [];
    this.future = [];
    this.selectedId = newData.rootId;
    this.notify('map-switch');
    return mapId;
  }

  switchMap(mapId) {
    const entry = this.library.maps[mapId];
    if (!entry) return false;
    if (mapId === this.activeMapId) return true;

    this._persist();
    this.activeMapId = mapId;
    this.library.activeMapId = mapId;
    this.data = deepClone(entry.data);
    this.history = [];
    this.future = [];
    this.selectedId = this.data.rootId;
    this.notify('map-switch');
    return true;
  }

  duplicateMap(mapId) {
    const entry = this.library.maps[mapId];
    if (!entry) return null;
    if (mapId === this.activeMapId) {
      this._persist();
    }
    const clonedData = deepClone(this.library.maps[mapId].data);
    clonedData.title = `${clonedData.title || 'Sem título'} (Cópia)`;

    const now = Date.now();
    const newId = generateMapId();
    this.library.maps[newId] = {
      id: newId,
      createdAt: now,
      updatedAt: now,
      data: deepClone(clonedData),
    };
    this.activeMapId = newId;
    this.library.activeMapId = newId;
    this.data = clonedData;
    this.history = [];
    this.future = [];
    this.selectedId = clonedData.rootId;
    this.notify('map-switch');
    return newId;
  }

  renameMap(mapId, newTitle) {
    const entry = this.library.maps[mapId];
    if (!entry) return false;
    const clean = (newTitle || '').trim() || 'Sem título';
    entry.data.title = clean;
    entry.updatedAt = Date.now();
    if (mapId === this.activeMapId) {
      this.data.title = clean;
    }
    this.notify('meta');
    return true;
  }

  deleteMap(mapId) {
    if (!this.library.maps[mapId]) return false;
    delete this.library.maps[mapId];

    const remaining = this.listMaps();
    if (remaining.length === 0) {
      this.createMap('blank');
      return true;
    }

    if (mapId === this.activeMapId) {
      const next = remaining[0];
      this.activeMapId = next.id;
      this.library.activeMapId = next.id;
      this.data = deepClone(this.library.maps[next.id].data);
      this.history = [];
      this.future = [];
      this.selectedId = this.data.rootId;
      this.notify('map-switch');
    } else {
      this._saveLibraryToStorage();
      for (const fn of this.listeners) {
        fn(this.data, 'library');
      }
    }
    return true;
  }

  importAsNewMap(jsonObj) {
    if (!this._isValidData(jsonObj)) {
      throw new Error('Arquivo JSON inválido para o MapaMental Studio.');
    }
    const importedData = deepClone(jsonObj);
    const now = Date.now();
    const mapId = generateMapId();
    this.library.maps[mapId] = {
      id: mapId,
      createdAt: now,
      updatedAt: now,
      data: deepClone(importedData),
    };
    this.activeMapId = mapId;
    this.library.activeMapId = mapId;
    this.data = importedData;
    this.history = [];
    this.future = [];
    this.selectedId = importedData.rootId;
    this.notify('map-switch');
    return mapId;
  }
}
