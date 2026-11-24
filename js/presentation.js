/**
 * Controlador do Modo Apresentação / Estúdio para gravação de vídeos no YouTube.
 * Gerencia Revelação Progressiva, Spotlight, Câmera Automática e auto-fade do HUD.
 */

export class PresentationController {
  constructor({ store, renderer, camera, hudEl, stepLabelEl, btnProgressive, btnSpotlight, btnCamera, onExit }) {
    this.store = store;
    this.renderer = renderer;
    this.camera = camera;
    this.hudEl = hudEl;
    this.stepLabelEl = stepLabelEl;
    this.btnProgressive = btnProgressive;
    this.btnSpotlight = btnSpotlight;
    this.btnCamera = btnCamera;
    this.onExit = onExit;

    this.active = false;
    this.progressive = false;
    this.autoCamera = true;
    this.steps = [];
    this.stepIndex = 0;
    this.idleTimer = null;

    this._onUserPointerMove = () => this._wakeHud();
  }

  enter({ progressive = false } = {}) {
    this.active = true;
    this.progressive = progressive;

    document.body.classList.add('presentation-mode');
    document.body.classList.remove('hud-hidden');
    this.hudEl.hidden = false;

    this.steps = this.store.getVisibleDfsOrder();
    if (this.progressive) {
      this.stepIndex = 0;
      this.store.select(this.steps[0]);
      this.renderer.setSpotlight(true);
    } else {
      const idx = this.steps.indexOf(this.store.selectedId);
      this.stepIndex = idx >= 0 ? idx : 0;
    }

    this._syncRevealed();
    this.renderer.render();
    this._focusCurrent();
    this._updateHudUI();

    window.addEventListener('mousemove', this._onUserPointerMove, { passive: true });
    this._wakeHud();
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.progressive = false;

    document.body.classList.remove('presentation-mode', 'hud-hidden');
    this.hudEl.hidden = true;
    this.hudEl.classList.remove('hud-idle');

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    window.removeEventListener('mousemove', this._onUserPointerMove);

    this.renderer.setRevealedSet(null);
    const layout = this.renderer.render();
    this.camera.fitToBounds(layout.bounds, { animate: true });
    if (this.onExit) this.onExit();
  }

  nextStep() {
    if (!this.active || !this.steps.length) return;
    if (this.stepIndex < this.steps.length - 1) {
      this.stepIndex += 1;
      const targetId = this.steps[this.stepIndex];
      this.store.select(targetId);
      this._syncRevealed();
      this.renderer.render();
      this._focusCurrent();
      this._updateHudUI();
    } else {
      this.showAllOverview();
    }
  }

  prevStep() {
    if (!this.active || !this.steps.length) return;
    if (this.stepIndex > 0) {
      this.stepIndex -= 1;
      const targetId = this.steps[this.stepIndex];
      this.store.select(targetId);
      this._syncRevealed();
      this.renderer.render();
      this._focusCurrent();
      this._updateHudUI();
    }
  }

  jumpToNode(nodeId) {
    if (!this.active) return;
    const idx = this.steps.indexOf(nodeId);
    if (idx < 0) return;
    this.stepIndex = idx;
    this.store.select(nodeId);
    this._syncRevealed();
    this.renderer.render();
    this._focusCurrent();
    this._updateHudUI();
  }

  toggleProgressive() {
    if (!this.active) return;
    this.progressive = !this.progressive;
    if (this.progressive && this.stepIndex === this.steps.length - 1) {
      this.stepIndex = 0;
      this.store.select(this.steps[0]);
    }
    this._syncRevealed();
    this.renderer.render();
    this._focusCurrent();
    this._updateHudUI();
  }

  toggleSpotlight() {
    this.renderer.setSpotlight(!this.renderer.spotlightEnabled);
    this.renderer.render();
    this._updateHudUI();
  }

  toggleAutoCamera() {
    this.autoCamera = !this.autoCamera;
    if (this.autoCamera) {
      this._focusCurrent();
    }
    this._updateHudUI();
  }

  showAllOverview() {
    if (!this.active) return;
    this.progressive = false;
    this.renderer.setRevealedSet(null);
    this.renderer.setSpotlight(false);
    const layout = this.renderer.render();
    this.camera.fitToBounds(layout.bounds, { animate: true, duration: 680 });
    this._updateHudUI();
  }

  toggleHudVisibility() {
    if (!this.active) return;
    document.body.classList.toggle('hud-hidden');
  }

  _syncRevealed() {
    if (!this.progressive) {
      this.renderer.setRevealedSet(null);
      return;
    }
    const revealed = new Set(this.steps.slice(0, this.stepIndex + 1));
    this.renderer.setRevealedSet(revealed);
  }

  _focusCurrent() {
    if (!this.autoCamera) return;
    const nodeId = this.steps[this.stepIndex];
    const pos = this.renderer.lastLayout.positions.get(nodeId);
    if (pos) {
      const depth = this.store.getDepth(nodeId);
      const zoom = depth === 0 ? 1.18 : 1.32;
      this.camera.focusNode(pos, { targetScale: zoom, animate: true, duration: 620 });
    }
  }

  _updateHudUI() {
    this.stepLabelEl.textContent = `${this.stepIndex + 1} / ${Math.max(1, this.steps.length)}`;
    this.btnProgressive.classList.toggle('active', this.progressive);
    this.btnSpotlight.classList.toggle('active', this.renderer.spotlightEnabled);
    this.btnCamera.classList.toggle('active', this.autoCamera);
  }

  _wakeHud() {
    if (!this.active) return;
    this.hudEl.classList.remove('hud-idle');
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.active) {
        this.hudEl.classList.add('hud-idle');
      }
    }, 2600);
  }
}
