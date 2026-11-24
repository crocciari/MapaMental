import { BRANCH_PALETTE, TEMPLATES } from './templates.js';

const STORAGE_KEY = 'mapamental_studio_v1';
const MAX_HISTORY = 60;

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function generateId() {
  return 'n_' + Math.random().toString(36).slice(2, 9);
}

export class MindMapStore {
  constructor() {
    this.listeners = new Set();
    this.history = [];
    this.future = [];
    this.selectedId = 'root';
    this.data = this._loadInitial();
  }

  _loadInitial() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (this._isValidData(parsed)) {
          this.selectedId = parsed.rootId;
          return parsed;
        }
      }
    } catch {
      // Fallback para modelo padrão se localStorage falhar
    }
    const initial = TEMPLATES['youtube-video'].create();
    this.selectedId = initial.rootId;
    return initial;
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

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignora erro de quota
    }
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
}
