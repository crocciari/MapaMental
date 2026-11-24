import { computeLayout } from './layout.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

export function buildBezierEdge(parentPos, childPos, layoutMode) {
  let x1, y1, x2, y2, cx1, cy1, cx2, cy2;

  if (layoutMode === 'vertical') {
    x1 = parentPos.x;
    y1 = parentPos.y + parentPos.height / 2;
    x2 = childPos.x;
    y2 = childPos.y - childPos.height / 2;
    const dy = Math.max(36, Math.abs(y2 - y1) * 0.52);
    cx1 = x1;
    cy1 = y1 + dy;
    cx2 = x2;
    cy2 = y2 - dy;
  } else {
    const goLeft = childPos.x < parentPos.x;
    x1 = parentPos.x + (goLeft ? -parentPos.width / 2 : parentPos.width / 2);
    y1 = parentPos.y;
    x2 = childPos.x + (goLeft ? childPos.width / 2 : -childPos.width / 2);
    y2 = childPos.y;
    const dx = Math.max(38, Math.abs(x2 - x1) * 0.52);
    cx1 = x1 + (goLeft ? -dx : dx);
    cy1 = y1;
    cx2 = x2 + (goLeft ? dx : -dx);
    cy2 = y2;
  }

  return {
    d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    endX: x2,
    endY: y2,
  };
}

export class MindMapRenderer {
  constructor(store, nodesLayer, edgesGroup) {
    this.store = store;
    this.nodesLayer = nodesLayer;
    this.edgesGroup = edgesGroup;

    this.nodeEls = new Map();
    this.edgeEls = new Map();
    this.lastLayout = {
      positions: new Map(),
      bounds: { minX: -200, minY: -120, maxX: 200, maxY: 120 },
    };

    this.revealedSet = null; // null = todos os nós visíveis revelados
    this.previouslyHidden = new Set();
    this.spotlightEnabled = false;
    this.editingNodeId = null;
  }

  setRevealedSet(setOrNull) {
    this.revealedSet = setOrNull;
  }

  setSpotlight(enabled) {
    this.spotlightEnabled = enabled;
    document.body.classList.toggle('spotlight-active', enabled);
  }

  render() {
    const data = this.store.data;
    const visibleOrder = this.store.getVisibleDfsOrder();
    const visibleSet = new Set(visibleOrder);

    // Remove nós que saíram de cena
    for (const [id, el] of this.nodeEls.entries()) {
      if (!visibleSet.has(id)) {
        el.remove();
        this.nodeEls.delete(id);
        this.previouslyHidden.delete(id);
      }
    }

    // Cria ou atualiza o conteúdo DOM dos nós visíveis
    for (const id of visibleOrder) {
      const node = data.nodes[id];
      if (!node) continue;

      let el = this.nodeEls.get(id);
      if (!el) {
        el = this._createNodeElement(id);
        this.nodeEls.set(id, el);
        this.nodesLayer.appendChild(el);
      }
      this._syncNodeContent(el, node, id);
    }

    // Mede dimensões reais dos cartões
    const sizeMap = new Map();
    for (const id of visibleOrder) {
      const el = this.nodeEls.get(id);
      if (el) {
        sizeMap.set(id, {
          width: el.offsetWidth || 160,
          height: el.offsetHeight || 48,
        });
      }
    }

    // Calcula posições sem sobreposição
    const layoutResult = computeLayout(data, sizeMap);
    this.lastLayout = layoutResult;

    const selectedId = this.store.selectedId;
    const activeChain = new Set(this.store.getAncestorIds(selectedId));
    const selectedNode = data.nodes[selectedId];
    if (selectedNode && !selectedNode.collapsed) {
      for (const cid of selectedNode.children) {
        activeChain.add(cid);
      }
    }

    // Posiciona cartões e aplica estados (seleção, spotlight, revelação)
    for (const id of visibleOrder) {
      const el = this.nodeEls.get(id);
      const pos = layoutResult.positions.get(id);
      if (!el || !pos) continue;

      const tx = Math.round(pos.x - pos.width / 2);
      const ty = Math.round(pos.y - pos.height / 2);

      const isHiddenByReveal = this.revealedSet !== null && !this.revealedSet.has(id);
      const scalePart = isHiddenByReveal ? ' scale(0.84)' : '';
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0)${scalePart}`;

      el.classList.toggle('is-selected', id === selectedId);
      el.classList.toggle('side-left', pos.side === 'left');
      el.classList.toggle('node-hidden', isHiddenByReveal);

      if (this.spotlightEnabled) {
        el.classList.toggle('spotlight-focus', id === selectedId);
        el.classList.toggle('spotlight-dim', !activeChain.has(id));
      } else {
        el.classList.remove('spotlight-focus', 'spotlight-dim');
      }
    }

    // Sincroniza curvas Bézier SVG
    this._renderEdges(visibleOrder, layoutResult.positions, activeChain);

    return layoutResult;
  }

  _createNodeElement(id) {
    const el = document.createElement('div');
    el.className = 'node';
    el.dataset.id = id;

    el.innerHTML = `
      <div class="node-inner">
        <span class="node-icon" hidden></span>
        <div class="node-content">
          <div class="node-title"></div>
          <div class="node-subtitle" hidden></div>
        </div>
      </div>
      <button type="button" class="node-quick-add" data-action="quick-add" title="Adicionar subtópico (Tab)">+</button>
      <span class="node-collapse-badge" data-action="toggle-collapse" hidden></span>
    `;
    return el;
  }

  _syncNodeContent(el, node, id) {
    const depth = this.store.getDepth(id);
    const color = this.store.getEffectiveColor(id);

    el.style.setProperty('--branch-color', color);
    el.classList.toggle('depth-0', depth === 0);
    el.classList.toggle('depth-1', depth === 1);
    el.classList.toggle('style-filled', node.style === 'filled');
    el.classList.toggle('style-pill', node.style === 'pill');
    el.classList.toggle('size-lg', node.size === 'lg');

    const iconEl = el.querySelector('.node-icon');
    if (node.icon) {
      iconEl.textContent = node.icon;
      iconEl.hidden = false;
    } else {
      iconEl.textContent = '';
      iconEl.hidden = true;
    }

    const titleEl = el.querySelector('.node-title');
    if (this.editingNodeId !== id) {
      titleEl.textContent = node.text || 'Sem título';
    }

    const subEl = el.querySelector('.node-subtitle');
    if (node.subtitle && node.subtitle.trim()) {
      subEl.textContent = node.subtitle;
      subEl.hidden = false;
    } else {
      subEl.textContent = '';
      subEl.hidden = true;
    }

    const badgeEl = el.querySelector('.node-collapse-badge');
    if (node.collapsed && node.children.length > 0) {
      const hiddenCount = this.store.getVisibleDescendantCount(id);
      badgeEl.textContent = `+${hiddenCount}`;
      badgeEl.hidden = false;
      badgeEl.title = `Expandir ${hiddenCount} subtópico(s)`;
    } else {
      badgeEl.hidden = true;
    }
  }

  _renderEdges(visibleOrder, positions, activeChain) {
    const data = this.store.data;
    const expectedIds = new Set();

    for (const id of visibleOrder) {
      const node = data.nodes[id];
      if (!node || !node.parentId) continue;

      const parentPos = positions.get(node.parentId);
      const childPos = positions.get(id);
      if (!parentPos || !childPos) continue;

      expectedIds.add(id);

      let entry = this.edgeEls.get(id);
      if (!entry) {
        const path = createSvgEl('path', { class: 'edge-path' });
        const dot = createSvgEl('circle', { class: 'edge-dot', r: '3.5' });
        this.edgesGroup.appendChild(path);
        this.edgesGroup.appendChild(dot);
        entry = { path, dot };
        this.edgeEls.set(id, entry);
      }

      const color = this.store.getEffectiveColor(id);
      const depth = this.store.getDepth(id);
      const strokeWidth = depth === 1 ? 3.2 : 2.3;
      const { d, endX, endY } = buildBezierEdge(parentPos, childPos, data.layout);

      entry.path.setAttribute('d', d);
      entry.path.setAttribute('stroke', color);
      entry.path.setAttribute('stroke-width', String(strokeWidth));

      entry.dot.setAttribute('cx', endX.toFixed(1));
      entry.dot.setAttribute('cy', endY.toFixed(1));
      entry.dot.setAttribute('fill', color);

      const isHiddenByReveal = this.revealedSet !== null && !this.revealedSet.has(id);
      const wasHidden = this.previouslyHidden.has(id);

      entry.path.classList.toggle('edge-hidden', isHiddenByReveal);
      entry.dot.classList.toggle('edge-hidden', isHiddenByReveal);

      if (isHiddenByReveal) {
        this.previouslyHidden.add(id);
      } else if (wasHidden) {
        this.previouslyHidden.delete(id);
        this._animateEdgeDraw(entry.path);
      }

      if (this.spotlightEnabled) {
        const isHighlighted = activeChain.has(id) && activeChain.has(node.parentId);
        entry.path.classList.toggle('spotlight-path', isHighlighted);
        entry.path.classList.toggle('spotlight-dim', !isHighlighted);
        entry.dot.classList.toggle('spotlight-dim', !isHighlighted);
      } else {
        entry.path.classList.remove('spotlight-path', 'spotlight-dim');
        entry.dot.classList.remove('spotlight-dim');
      }
    }

    for (const [id, entry] of this.edgeEls.entries()) {
      if (!expectedIds.has(id)) {
        entry.path.remove();
        entry.dot.remove();
        this.edgeEls.delete(id);
      }
    }
  }

  _animateEdgeDraw(pathEl) {
    try {
      const length = pathEl.getTotalLength();
      if (!Number.isFinite(length) || length <= 0) return;
      pathEl.style.transition = 'none';
      pathEl.style.strokeDasharray = `${length}`;
      pathEl.style.strokeDashoffset = `${length}`;
      pathEl.getBoundingClientRect();
      pathEl.style.transition =
        'stroke-dashoffset 0.48s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease';
      pathEl.style.strokeDashoffset = '0';
      setTimeout(() => {
        pathEl.style.strokeDasharray = '';
        pathEl.style.strokeDashoffset = '';
        pathEl.style.transition = '';
      }, 520);
    } catch {
      // Ignora se SVG ainda não estiver medido
    }
  }

  getNodeElement(id) {
    return this.nodeEls.get(id) || null;
  }
}
