/**
 * Câmera 2D suave com animações cubic ease-out, enquadramento automático
 * e respeito às guias 16:9 / 9:16 e ao painel inspetor.
 */

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export class Camera {
  constructor(worldEl, viewportEl, frameGuideEl, frameBoxEl, onChange) {
    this.worldEl = worldEl;
    this.viewportEl = viewportEl;
    this.frameGuideEl = frameGuideEl;
    this.frameBoxEl = frameBoxEl;
    this.onChange = onChange;

    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    this.scale = 1;
    this.animId = null;
    this.minScale = 0.2;
    this.maxScale = 2.8;

    this._apply();
  }

  _apply() {
    this.worldEl.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) scale(${this.scale})`;
    if (this.onChange) this.onChange(this.scale);
  }

  cancelAnimation() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  getActiveViewportRect() {
    if (this.frameGuideEl && !this.frameGuideEl.hidden && this.frameBoxEl) {
      const rect = this.frameBoxEl.getBoundingClientRect();
      if (rect.width > 40 && rect.height > 40) {
        return {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
        };
      }
    }

    const vw = this.viewportEl.clientWidth || window.innerWidth;
    const vh = this.viewportEl.clientHeight || window.innerHeight;
    const isPresentation = document.body.classList.contains('presentation-mode');
    const inspectorCollapsed = document.body.classList.contains('inspector-collapsed');
    const rightReserve = !isPresentation && !inspectorCollapsed && vw > 900 ? 310 : 0;
    const topReserve = isPresentation ? 16 : 74;

    const usableW = Math.max(240, vw - rightReserve);
    const usableH = Math.max(240, vh - topReserve);

    return {
      left: 0,
      top: topReserve,
      width: usableW,
      height: usableH,
      centerX: usableW / 2,
      centerY: topReserve + usableH / 2,
    };
  }

  panBy(dx, dy) {
    this.cancelAnimation();
    this.x += dx;
    this.y += dy;
    this._apply();
  }

  zoomAt(factor, clientX, clientY) {
    this.cancelAnimation();
    const nextScale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));
    const ratio = nextScale / this.scale;
    this.x = clientX - (clientX - this.x) * ratio;
    this.y = clientY - (clientY - this.y) * ratio;
    this.scale = nextScale;
    this._apply();
  }

  zoomByStep(factor) {
    const rect = this.getActiveViewportRect();
    this.animateTo(
      rect.centerX - (rect.centerX - this.x) * (Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor)) / this.scale),
      rect.centerY - (rect.centerY - this.y) * (Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor)) / this.scale),
      Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor)),
      220
    );
  }

  animateTo(targetX, targetY, targetScale, duration = 560) {
    this.cancelAnimation();
    const clampedScale = Math.min(this.maxScale, Math.max(this.minScale, targetScale));

    if (duration <= 0) {
      this.x = targetX;
      this.y = targetY;
      this.scale = clampedScale;
      this._apply();
      return;
    }

    const startX = this.x;
    const startY = this.y;
    const startScale = this.scale;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);

      this.x = startX + (targetX - startX) * eased;
      this.y = startY + (targetY - startY) * eased;
      this.scale = startScale + (clampedScale - startScale) * eased;
      this._apply();

      if (t < 1) {
        this.animId = requestAnimationFrame(step);
      } else {
        this.animId = null;
      }
    };

    this.animId = requestAnimationFrame(step);
  }

  fitToBounds(bounds, { padding = 68, animate = true, duration = 560, maxZoom = 1.15 } = {}) {
    const rect = this.getActiveViewportRect();
    const bw = Math.max(100, bounds.maxX - bounds.minX);
    const bh = Math.max(80, bounds.maxY - bounds.minY);
    const availW = Math.max(160, rect.width - padding * 2);
    const availH = Math.max(140, rect.height - padding * 2);

    const targetScale = Math.min(maxZoom, Math.max(this.minScale, Math.min(availW / bw, availH / bh)));
    const worldCenterX = (bounds.minX + bounds.maxX) / 2;
    const worldCenterY = (bounds.minY + bounds.maxY) / 2;

    const targetX = rect.centerX - worldCenterX * targetScale;
    const targetY = rect.centerY - worldCenterY * targetScale;

    this.animateTo(targetX, targetY, targetScale, animate ? duration : 0);
  }

  focusNode(pos, { targetScale = 1.25, animate = true, duration = 620 } = {}) {
    if (!pos) return;
    const rect = this.getActiveViewportRect();
    const maxSafeScale = Math.min(
      targetScale,
      (rect.width * 0.72) / Math.max(140, pos.width),
      (rect.height * 0.65) / Math.max(60, pos.height)
    );
    const finalScale = Math.max(0.55, Math.min(this.maxScale, maxSafeScale));
    const targetX = rect.centerX - pos.x * finalScale;
    const targetY = rect.centerY - pos.y * finalScale;

    this.animateTo(targetX, targetY, finalScale, animate ? duration : 0);
  }

  screenToWorld(clientX, clientY) {
    return {
      x: (clientX - this.x) / this.scale,
      y: (clientY - this.y) / this.scale,
    };
  }
}
