import { BRANCH_PALETTE, EMOJI_PRESETS } from './templates.js';
import { MindMapStore } from './state.js';
import { Camera } from './camera.js';
import { MindMapRenderer } from './renderer.js';
import { PresentationController } from './presentation.js';
import { exportJSON, exportPNG, exportSVG, readJSONFile } from './exporter.js';

const $ = (sel) => document.querySelector(sel);

const store = new MindMapStore();

const viewportEl = $('#viewport');
const worldEl = $('#world');
const edgesGroup = $('#edges-group');
const nodesLayer = $('#nodes-layer');
const frameGuideEl = $('#frame-guide');
const frameBoxEl = $('#frame-guide-box');
const frameLabelEl = $('#frame-guide-label');
const zoomLabelEl = $('#zoom-label');

const mapTitleInput = $('#map-title');
const selectLayout = $('#select-layout');
const selectTheme = $('#select-theme');
const selectFrame = $('#select-frame');
const btnUndo = $('#btn-undo');
const btnRedo = $('#btn-redo');
const btnSpotlight = $('#btn-spotlight');

const inpNodeText = $('#inp-node-text');
const inpNodeSubtitle = $('#inp-node-subtitle');
const inpNodeIcon = $('#inp-node-icon');
const inpNodeColor = $('#inp-node-color');
const inspectorLevelEl = $('#inspector-level');
const inspectorForm = $('#inspector-form');
const inspectorEmpty = $('#inspector-empty');
const btnToggleCollapse = $('#btn-toggle-collapse');
const btnDeleteNode = $('#btn-delete-node');

const toastContainer = $('#toast-container');
const modalHelp = $('#modal-help');
const fileImportInput = $('#file-import-json');

function showToast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

const camera = new Camera(worldEl, viewportEl, frameGuideEl, frameBoxEl, (scale) => {
  zoomLabelEl.textContent = `${Math.round(scale * 100)}%`;
});

const renderer = new MindMapRenderer(store, nodesLayer, edgesGroup);

const presentation = new PresentationController({
  store,
  renderer,
  camera,
  hudEl: $('#presentation-hud'),
  stepLabelEl: $('#pres-step-counter'),
  btnProgressive: $('#btn-pres-progressive'),
  btnSpotlight: $('#btn-pres-spotlight'),
  btnCamera: $('#btn-pres-camera'),
  onExit: () => {
    btnSpotlight.classList.toggle('active', renderer.spotlightEnabled);
  },
});

function updateFrameGuideBox() {
  const mode = store.data.frameGuide || 'none';
  if (mode === 'none') {
    frameGuideEl.hidden = true;
    return;
  }

  frameGuideEl.hidden = false;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isPresentation = document.body.classList.contains('presentation-mode');
  const padX = isPresentation ? 48 : 96;
  const padY = isPresentation ? 48 : 110;
  const maxW = Math.max(260, vw - padX);
  const maxH = Math.max(220, vh - padY);

  const ratio = mode === '9-16' ? 9 / 16 : 16 / 9;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }

  frameBoxEl.style.width = `${Math.round(w)}px`;
  frameBoxEl.style.height = `${Math.round(h)}px`;
  frameLabelEl.textContent = mode === '9-16' ? '9:16 SHORTS / REELS' : '16:9 YOUTUBE';
}

function syncToolbarAndInspector() {
  const data = store.data;
  document.body.dataset.theme = data.theme || 'dark-studio';

  if (document.activeElement !== mapTitleInput) {
    mapTitleInput.value = data.title || 'Meu Mapa Mental';
  }
  selectLayout.value = data.layout || 'bilateral';
  selectTheme.value = data.theme || 'dark-studio';
  selectFrame.value = data.frameGuide || 'none';

  btnUndo.disabled = !store.canUndo();
  btnRedo.disabled = !store.canRedo();
  btnSpotlight.classList.toggle('active', renderer.spotlightEnabled);

  updateFrameGuideBox();

  const node = store.getSelectedNode();
  if (!node) {
    inspectorForm.hidden = true;
    inspectorEmpty.hidden = false;
    return;
  }

  inspectorForm.hidden = false;
  inspectorEmpty.hidden = true;

  const depth = store.getDepth(node.id);
  inspectorLevelEl.textContent =
    depth === 0 ? 'Nó Central' : depth === 1 ? 'Ramo Principal' : `Subtópico (Nível ${depth})`;

  if (document.activeElement !== inpNodeText) {
    inpNodeText.value = node.text || '';
  }
  if (document.activeElement !== inpNodeSubtitle) {
    inpNodeSubtitle.value = node.subtitle || '';
  }
  if (document.activeElement !== inpNodeIcon) {
    inpNodeIcon.value = node.icon || '';
  }

  const effectiveColor = store.getEffectiveColor(node.id);
  inpNodeColor.value = effectiveColor;

  document.querySelectorAll('.swatch').forEach((sw) => {
    sw.classList.toggle('active', sw.dataset.color.toLowerCase() === effectiveColor.toLowerCase());
  });

  document.querySelectorAll('.seg-style button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.style === (node.style || 'default'));
  });

  document.querySelectorAll('.seg-size button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.size === (node.size || 'md'));
  });

  btnToggleCollapse.disabled = node.id === data.rootId || node.children.length === 0;
  btnToggleCollapse.textContent = node.collapsed ? 'Expandir ramo' : 'Recolher ramo';
  btnDeleteNode.disabled = node.id === data.rootId;
}

// Popula swatches de cor e grade de emojis no inspetor
function buildInspectorControls() {
  const emojiGrid = $('#emoji-grid');
  EMOJI_PRESETS.forEach((emoji) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-btn';
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      const node = store.getSelectedNode();
      if (node) store.updateNode(node.id, { icon: emoji });
    });
    emojiGrid.appendChild(btn);
  });

  const swatchesEl = $('#color-swatches');
  BRANCH_PALETTE.forEach((hex) => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'swatch';
    sw.dataset.color = hex;
    sw.style.background = hex;
    sw.title = hex;
    sw.addEventListener('click', () => {
      const node = store.getSelectedNode();
      if (node) store.updateNode(node.id, { color: hex });
    });
    swatchesEl.appendChild(sw);
  });
}

// Edição inline no próprio cartão do mapa
let activeInlineEditor = null;

function startInlineEdit(nodeId, selectAll = true) {
  if (presentation.active) return;
  const node = store.getNode(nodeId);
  const el = renderer.getNodeElement(nodeId);
  if (!node || !el) return;

  if (activeInlineEditor) {
    activeInlineEditor.commit();
  }

  const titleEl = el.querySelector('.node-title');
  const originalText = node.text;
  renderer.editingNodeId = nodeId;
  el.classList.add('is-editing');
  titleEl.contentEditable = 'true';
  titleEl.focus();

  if (selectAll) {
    const range = document.createRange();
    range.selectNodeContents(titleEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  let finished = false;

  const cleanup = () => {
    titleEl.contentEditable = 'false';
    el.classList.remove('is-editing');
    renderer.editingNodeId = null;
    activeInlineEditor = null;
    titleEl.removeEventListener('keydown', onKeyDown);
    titleEl.removeEventListener('blur', commit);
  };

  const commit = () => {
    if (finished) return;
    finished = true;
    const nextText = titleEl.textContent.trim() || originalText || 'Sem título';
    cleanup();
    if (nextText !== originalText) {
      store.updateNode(nodeId, { text: nextText });
    } else {
      renderer.render();
    }
  };

  const cancel = () => {
    if (finished) return;
    finished = true;
    titleEl.textContent = originalText;
    cleanup();
    renderer.render();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commit();
      const childId = store.addChild(nodeId, 'Novo Tópico');
      if (childId) startInlineEdit(childId, true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  titleEl.addEventListener('keydown', onKeyDown);
  titleEl.addEventListener('blur', commit);

  activeInlineEditor = { commit, cancel };
}

// Panning, Zoom e Drag & Drop dos nós
function bindCanvasInteractions() {
  let panState = null;
  let dragState = null;

  viewportEl.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.91;
      camera.zoomAt(factor, e.clientX, e.clientY);
    },
    { passive: false }
  );

  viewportEl.addEventListener('mousedown', (e) => {
    closeDropdowns();

    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      const nodeEl = actionEl.closest('.node');
      const nodeId = nodeEl?.dataset.id;
      if (!nodeId) return;
      e.stopPropagation();

      if (actionEl.dataset.action === 'quick-add') {
        const childId = store.addChild(nodeId, 'Novo Tópico');
        if (childId) startInlineEdit(childId, true);
      } else if (actionEl.dataset.action === 'toggle-collapse') {
        store.toggleCollapse(nodeId);
      }
      return;
    }

    const nodeEl = e.target.closest('.node');
    if (nodeEl) {
      const nodeId = nodeEl.dataset.id;
      if (renderer.editingNodeId === nodeId) return;

      if (presentation.active) {
        presentation.jumpToNode(nodeId);
        return;
      }

      store.select(nodeId);
      const node = store.getNode(nodeId);
      if (!node || e.button !== 0) return;

      dragState = {
        nodeId,
        startX: e.clientX,
        startY: e.clientY,
        origOffX: node.offsetX || 0,
        origOffY: node.offsetY || 0,
        moved: false,
        snapshotTaken: false,
        dropTargetId: null,
      };
      return;
    }

    // Pan no fundo vazio
    if (e.button === 0 || e.button === 1) {
      panState = { lastX: e.clientX, lastY: e.clientY };
      viewportEl.classList.add('is-panning');
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (panState) {
      const dx = e.clientX - panState.lastX;
      const dy = e.clientY - panState.lastY;
      panState.lastX = e.clientX;
      panState.lastY = e.clientY;
      camera.panBy(dx, dy);
      return;
    }

    if (dragState) {
      const dxScreen = e.clientX - dragState.startX;
      const dyScreen = e.clientY - dragState.startY;

      if (!dragState.moved && Math.hypot(dxScreen, dyScreen) < 5) return;

      if (!dragState.moved) {
        dragState.moved = true;
        document.body.classList.add('is-dragging');
        if (!dragState.snapshotTaken) {
          store.recordSnapshot();
          dragState.snapshotTaken = true;
        }
      }

      const dxWorld = dxScreen / camera.scale;
      const dyWorld = dyScreen / camera.scale;

      store.updateNode(
        dragState.nodeId,
        {
          offsetX: Math.round(dragState.origOffX + dxWorld),
          offsetY: Math.round(dragState.origOffY + dyWorld),
        },
        { recordHistory: false }
      );

      // Detecta nó-alvo para reanexar (reparent)
      const draggedEl = renderer.getNodeElement(dragState.nodeId);
      if (draggedEl) draggedEl.style.pointerEvents = 'none';
      const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('.node');
      if (draggedEl) draggedEl.style.pointerEvents = '';

      const nextTargetId =
        under && under.dataset.id !== dragState.nodeId ? under.dataset.id : null;

      if (dragState.dropTargetId !== nextTargetId) {
        if (dragState.dropTargetId) {
          renderer.getNodeElement(dragState.dropTargetId)?.classList.remove('drop-target');
        }
        if (nextTargetId) {
          renderer.getNodeElement(nextTargetId)?.classList.add('drop-target');
        }
        dragState.dropTargetId = nextTargetId;
      }
    }
  });

  window.addEventListener('mouseup', () => {
    if (panState) {
      panState = null;
      viewportEl.classList.remove('is-panning');
    }

    if (dragState) {
      document.body.classList.remove('is-dragging');
      if (dragState.dropTargetId) {
        renderer.getNodeElement(dragState.dropTargetId)?.classList.remove('drop-target');
        const reparented = store.reparentNode(dragState.nodeId, dragState.dropTargetId);
        if (reparented) {
          showToast('Tópico movido para o novo ramo');
        }
      }
      dragState = null;
    }
  });

  viewportEl.addEventListener('dblclick', (e) => {
    const nodeEl = e.target.closest('.node');
    if (nodeEl && !presentation.active) {
      startInlineEdit(nodeEl.dataset.id, true);
    }
  });
}

// Menus dropdown
function closeDropdowns() {
  $('#menu-templates').hidden = true;
  $('#menu-export').hidden = true;
}

function bindUIEvents() {
  // Título do mapa
  mapTitleInput.addEventListener('input', () => {
    store.setMeta({ title: mapTitleInput.value });
  });

  // Menus dropdown
  $('#btn-templates').addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = $('#menu-templates');
    const willOpen = menu.hidden;
    closeDropdowns();
    menu.hidden = !willOpen;
  });

  $('#menu-templates').addEventListener('click', (e) => {
    const item = e.target.closest('[data-template]');
    if (!item) return;
    store.loadTemplate(item.dataset.template);
    closeDropdowns();
    requestAnimationFrame(() => {
      camera.fitToBounds(renderer.lastLayout.bounds, { animate: true });
    });
    showToast(`Modelo "${item.textContent.trim()}" carregado`);
  });

  $('#btn-export').addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = $('#menu-export');
    const willOpen = menu.hidden;
    closeDropdowns();
    menu.hidden = !willOpen;
  });

  $('#menu-export').addEventListener('click', async (e) => {
    const item = e.target.closest('[data-export]');
    if (!item) return;
    closeDropdowns();
    const kind = item.dataset.export;
    try {
      if (kind === 'png-4k') {
        showToast('Gerando PNG em alta resolução...');
        await exportPNG(store, renderer.lastLayout, { transparentBg: false });
      } else if (kind === 'png-transparent') {
        showToast('Gerando PNG transparente...');
        await exportPNG(store, renderer.lastLayout, { transparentBg: true });
      } else if (kind === 'svg') {
        exportSVG(store, renderer.lastLayout);
        showToast('SVG vetorial exportado');
      } else if (kind === 'json-save') {
        exportJSON(store);
        showToast('Projeto salvo em JSON');
      } else if (kind === 'json-open') {
        fileImportInput.click();
      }
    } catch (err) {
      showToast(err.message || 'Erro ao exportar');
    }
  });

  fileImportInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const obj = await readJSONFile(file);
      store.importData(obj);
      requestAnimationFrame(() => {
        camera.fitToBounds(renderer.lastLayout.bounds, { animate: true });
      });
      showToast('Projeto carregado com sucesso');
    } catch (err) {
      showToast(err.message || 'Falha ao abrir arquivo');
    } finally {
      fileImportInput.value = '';
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) closeDropdowns();
  });

  // Topbar ações
  btnUndo.addEventListener('click', () => store.undo());
  btnRedo.addEventListener('click', () => store.redo());

  selectLayout.addEventListener('change', () => {
    store.setMeta({ layout: selectLayout.value }, { recordHistory: true });
    requestAnimationFrame(() => {
      camera.fitToBounds(renderer.lastLayout.bounds, { animate: true });
    });
  });

  $('#btn-relayout').addEventListener('click', () => {
    store.resetOffsets();
    requestAnimationFrame(() => {
      camera.fitToBounds(renderer.lastLayout.bounds, { animate: true });
    });
    showToast('Nós reorganizados automaticamente');
  });

  selectTheme.addEventListener('change', () => {
    store.setMeta({ theme: selectTheme.value });
  });

  selectFrame.addEventListener('change', () => {
    store.setMeta({ frameGuide: selectFrame.value });
    requestAnimationFrame(() => {
      camera.fitToBounds(renderer.lastLayout.bounds, { animate: true });
    });
  });

  btnSpotlight.addEventListener('click', () => {
    renderer.setSpotlight(!renderer.spotlightEnabled);
    renderer.render();
    syncToolbarAndInspector();
  });

  $('#btn-present').addEventListener('click', () => {
    presentation.enter({ progressive: false });
  });

  // Inspetor
  inpNodeText.addEventListener('input', () => {
    const node = store.getSelectedNode();
    if (node) store.updateNode(node.id, { text: inpNodeText.value }, { recordHistory: false });
  });
  inpNodeText.addEventListener('focus', () => store.recordSnapshot());

  inpNodeSubtitle.addEventListener('input', () => {
    const node = store.getSelectedNode();
    if (node) store.updateNode(node.id, { subtitle: inpNodeSubtitle.value }, { recordHistory: false });
  });
  inpNodeSubtitle.addEventListener('focus', () => store.recordSnapshot());

  inpNodeIcon.addEventListener('input', () => {
    const node = store.getSelectedNode();
    if (node) store.updateNode(node.id, { icon: inpNodeIcon.value });
  });

  $('#btn-clear-icon').addEventListener('click', () => {
    const node = store.getSelectedNode();
    if (node) store.updateNode(node.id, { icon: '' });
  });

  inpNodeColor.addEventListener('input', () => {
    const node = store.getSelectedNode();
    if (node) store.updateNode(node.id, { color: inpNodeColor.value }, { recordHistory: false });
  });

  $('#btn-inherit-color').addEventListener('click', () => {
    const node = store.getSelectedNode();
    if (node && node.id !== store.data.rootId) {
      store.updateNode(node.id, { color: null });
    }
  });

  document.querySelector('.seg-style').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-style]');
    const node = store.getSelectedNode();
    if (btn && node) store.updateNode(node.id, { style: btn.dataset.style });
  });

  document.querySelector('.seg-size').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-size]');
    const node = store.getSelectedNode();
    if (btn && node) store.updateNode(node.id, { size: btn.dataset.size });
  });

  $('#btn-add-child').addEventListener('click', () => {
    const node = store.getSelectedNode();
    if (!node) return;
    const childId = store.addChild(node.id, 'Novo Tópico');
    if (childId) startInlineEdit(childId, true);
  });

  $('#btn-add-sibling').addEventListener('click', () => {
    const node = store.getSelectedNode();
    if (!node) return;
    const sibId = store.addSibling(node.id, 'Novo Tópico');
    if (sibId) startInlineEdit(sibId, true);
  });

  btnToggleCollapse.addEventListener('click', () => {
    const node = store.getSelectedNode();
    if (node) store.toggleCollapse(node.id);
  });

  btnDeleteNode.addEventListener('click', () => {
    const node = store.getSelectedNode();
    if (node) store.deleteNode(node.id);
  });

  // Toggle inspetor e zoom
  $('#btn-close-inspector').addEventListener('click', () => {
    document.body.classList.add('inspector-collapsed');
  });

  $('#btn-toggle-inspector').addEventListener('click', () => {
    document.body.classList.toggle('inspector-collapsed');
  });

  $('#btn-zoom-in').addEventListener('click', () => camera.zoomByStep(1.2));
  $('#btn-zoom-out').addEventListener('click', () => camera.zoomByStep(0.84));
  $('#btn-fit').addEventListener('click', () => {
    camera.fitToBounds(renderer.lastLayout.bounds, { animate: true });
  });

  // HUD Apresentação
  $('#btn-pres-prev').addEventListener('click', () => presentation.prevStep());
  $('#btn-pres-next').addEventListener('click', () => presentation.nextStep());
  $('#btn-pres-progressive').addEventListener('click', () => presentation.toggleProgressive());
  $('#btn-pres-spotlight').addEventListener('click', () => presentation.toggleSpotlight());
  $('#btn-pres-camera').addEventListener('click', () => presentation.toggleAutoCamera());
  $('#btn-pres-show-all').addEventListener('click', () => presentation.showAllOverview());
  $('#btn-pres-hide-hud').addEventListener('click', () => presentation.toggleHudVisibility());
  $('#btn-pres-exit').addEventListener('click', () => presentation.exit());

  // Modal Ajuda
  $('#btn-help').addEventListener('click', () => {
    modalHelp.hidden = false;
  });
  $('#btn-close-help').addEventListener('click', () => {
    modalHelp.hidden = true;
  });
  modalHelp.querySelector('.modal-backdrop').addEventListener('click', () => {
    modalHelp.hidden = true;
  });

  window.addEventListener('resize', () => {
    updateFrameGuideBox();
  });
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function bindKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (!modalHelp.hidden) {
      if (e.key === 'Escape') modalHelp.hidden = true;
      return;
    }

    if (isTypingTarget(document.activeElement)) {
      return;
    }

    // Atalhos globais de apresentação
    if (presentation.active) {
      if (e.key === 'Escape') {
        e.preventDefault();
        presentation.exit();
      } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        presentation.nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        presentation.prevStep();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        presentation.toggleProgressive();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        presentation.toggleSpotlight();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        presentation.toggleAutoCamera();
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        presentation.showAllOverview();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        presentation.toggleHudVisibility();
      }
      return;
    }

    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) store.redo();
      else store.undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      store.redo();
      return;
    }

    const selected = store.getSelectedNode();
    if (!selected) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      const childId = store.addChild(selected.id, 'Novo Tópico');
      if (childId) startInlineEdit(childId, true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sibId = store.addSibling(selected.id, 'Novo Tópico');
      if (sibId) startInlineEdit(sibId, true);
    } else if (e.key === 'F2') {
      e.preventDefault();
      startInlineEdit(selected.id, true);
    } else if (e.key === ' ') {
      e.preventDefault();
      store.toggleCollapse(selected.id);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      store.deleteNode(selected.id);
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      camera.fitToBounds(renderer.lastLayout.bounds, { animate: true });
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      renderer.setSpotlight(!renderer.spotlightEnabled);
      renderer.render();
      syncToolbarAndInspector();
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      presentation.enter({ progressive: false });
    } else if (e.key === '?') {
      e.preventDefault();
      modalHelp.hidden = false;
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      camera.zoomByStep(1.18);
    } else if (e.key === '-') {
      e.preventDefault();
      camera.zoomByStep(0.85);
    }
  });
}

// Inicialização principal
function init() {
  buildInspectorControls();
  bindCanvasInteractions();
  bindUIEvents();
  bindKeyboardShortcuts();

  store.subscribe(() => {
    syncToolbarAndInspector();
    renderer.render();
  });

  syncToolbarAndInspector();
  const layout = renderer.render();
  camera.fitToBounds(layout.bounds, { animate: false, padding: 72 });
}

init();
