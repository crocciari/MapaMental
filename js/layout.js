/**
 * Motor de layout automático (Bilateral, Árvore Direita e Vertical)
 * usando as dimensões reais medidas no DOM para evitar sobreposição.
 */

const H_LEVEL_GAP = 86;
const H_SIBLING_GAP = 22;
const V_LEVEL_GAP = 78;
const V_SIBLING_GAP = 28;

export function computeLayout(data, sizeMap) {
  const nodes = data.nodes;
  const root = nodes[data.rootId];
  const positions = new Map();

  if (!root) {
    return {
      positions,
      bounds: { minX: -200, minY: -120, maxX: 200, maxY: 120 },
    };
  }

  const getSize = (id) => sizeMap.get(id) || { width: 170, height: 48 };

  // Altura da subárvore para layouts horizontais (bilateral / right)
  const hSpanCache = new Map();
  const measureHorizontalSpan = (id) => {
    if (hSpanCache.has(id)) return hSpanCache.get(id);
    const n = nodes[id];
    const sz = getSize(id);
    if (!n || n.collapsed || n.children.length === 0) {
      hSpanCache.set(id, sz.height);
      return sz.height;
    }
    let childrenSpan = 0;
    n.children.forEach((cid, idx) => {
      childrenSpan += measureHorizontalSpan(cid);
      if (idx > 0) childrenSpan += H_SIBLING_GAP;
    });
    const total = Math.max(sz.height, childrenSpan);
    hSpanCache.set(id, total);
    return total;
  };

  // Largura da subárvore para layout vertical
  const vSpanCache = new Map();
  const measureVerticalSpan = (id) => {
    if (vSpanCache.has(id)) return vSpanCache.get(id);
    const n = nodes[id];
    const sz = getSize(id);
    if (!n || n.collapsed || n.children.length === 0) {
      vSpanCache.set(id, sz.width);
      return sz.width;
    }
    let childrenSpan = 0;
    n.children.forEach((cid, idx) => {
      childrenSpan += measureVerticalSpan(cid);
      if (idx > 0) childrenSpan += V_SIBLING_GAP;
    });
    const total = Math.max(sz.width, childrenSpan);
    vSpanCache.set(id, total);
    return total;
  };

  const rootSize = getSize(root.id);
  const rootPos = {
    id: root.id,
    x: root.offsetX || 0,
    y: root.offsetY || 0,
    width: rootSize.width,
    height: rootSize.height,
    depth: 0,
    side: 'center',
  };
  positions.set(root.id, rootPos);

  const layoutHorizontalGroup = (childIds, side, anchorX, centerY, depth, parentOffX, parentOffY) => {
    if (!childIds.length) return;
    let totalHeight = 0;
    childIds.forEach((cid, idx) => {
      totalHeight += measureHorizontalSpan(cid);
      if (idx > 0) totalHeight += H_SIBLING_GAP;
    });

    let cursorY = centerY - totalHeight / 2;
    for (const cid of childIds) {
      const child = nodes[cid];
      if (!child) continue;
      const sz = getSize(cid);
      const span = measureHorizontalSpan(cid);
      const nodeCenterY = cursorY + span / 2;

      const offX = parentOffX + (child.offsetX || 0);
      const offY = parentOffY + (child.offsetY || 0);

      const x =
        side === 'right'
          ? anchorX + H_LEVEL_GAP + sz.width / 2
          : anchorX - H_LEVEL_GAP - sz.width / 2;

      positions.set(cid, {
        id: cid,
        x: x + offX,
        y: nodeCenterY + offY,
        width: sz.width,
        height: sz.height,
        depth,
        side,
      });

      if (!child.collapsed && child.children.length > 0) {
        const nextAnchorX = side === 'right' ? x + sz.width / 2 : x - sz.width / 2;
        layoutHorizontalGroup(child.children, side, nextAnchorX, nodeCenterY, depth + 1, offX, offY);
      }

      cursorY += span + H_SIBLING_GAP;
    }
  };

  const layoutVerticalGroup = (childIds, anchorBottomY, centerX, depth, parentOffX, parentOffY) => {
    if (!childIds.length) return;
    let totalWidth = 0;
    childIds.forEach((cid, idx) => {
      totalWidth += measureVerticalSpan(cid);
      if (idx > 0) totalWidth += V_SIBLING_GAP;
    });

    let cursorX = centerX - totalWidth / 2;
    for (const cid of childIds) {
      const child = nodes[cid];
      if (!child) continue;
      const sz = getSize(cid);
      const span = measureVerticalSpan(cid);
      const nodeCenterX = cursorX + span / 2;

      const offX = parentOffX + (child.offsetX || 0);
      const offY = parentOffY + (child.offsetY || 0);
      const y = anchorBottomY + V_LEVEL_GAP + sz.height / 2;

      positions.set(cid, {
        id: cid,
        x: nodeCenterX + offX,
        y: y + offY,
        width: sz.width,
        height: sz.height,
        depth,
        side: 'down',
      });

      if (!child.collapsed && child.children.length > 0) {
        layoutVerticalGroup(child.children, y + sz.height / 2, nodeCenterX, depth + 1, offX, offY);
      }

      cursorX += span + V_SIBLING_GAP;
    }
  };

  if (!root.collapsed && root.children.length > 0) {
    const rOffX = root.offsetX || 0;
    const rOffY = root.offsetY || 0;

    if (data.layout === 'vertical') {
      layoutVerticalGroup(root.children, rootSize.height / 2, 0, 1, rOffX, rOffY);
    } else if (data.layout === 'right') {
      layoutHorizontalGroup(root.children, 'right', rootSize.width / 2, 0, 1, rOffX, rOffY);
    } else {
      // Bilateral
      const rightIds = [];
      const leftIds = [];
      root.children.forEach((cid) => {
        const c = nodes[cid];
        if (!c) return;
        if (c.side === 'left') leftIds.push(cid);
        else rightIds.push(cid);
      });
      layoutHorizontalGroup(rightIds, 'right', rootSize.width / 2, 0, 1, rOffX, rOffY);
      layoutHorizontalGroup(leftIds, 'left', -rootSize.width / 2, 0, 1, rOffX, rOffY);
    }
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pos of positions.values()) {
    minX = Math.min(minX, pos.x - pos.width / 2);
    minY = Math.min(minY, pos.y - pos.height / 2);
    maxX = Math.max(maxX, pos.x + pos.width / 2);
    maxY = Math.max(maxY, pos.y + pos.height / 2);
  }

  if (!Number.isFinite(minX)) {
    minX = -200;
    minY = -120;
    maxX = 200;
    maxY = 120;
  }

  return {
    positions,
    bounds: { minX, minY, maxX, maxY },
  };
}
