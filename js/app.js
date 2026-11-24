import { BRANCH_PALETTE, EMOJI_CATEGORIES } from './templates.js';
import { MindMapStore } from './state.js';
import { Camera } from './camera.js';
import { MindMapRenderer } from './renderer.js';
import { PresentationController } from './presentation.js';
import { exportJSON, exportPNG, exportSVG, readJSONFile } from './exporter.js';
import { MediaStore, extensionFromMime, formatBytes } from './media.js';

const $ = (sel) => document.querySelector(sel);

const store = new MindMapStore();
const mediaStore = new MediaStore();

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
const inspectorStepBadge = $('#inspector-step-badge');
const btnMoveUp = $('#btn-move-up');
const btnMoveDown = $('#btn-move-down');
const btnToggleSide = $('#btn-toggle-side');

const toastContainer = $('#toast-container');
const modalHelp = $('#modal-help');
const modalMaps = $('#modal-maps');
const modalLightbox = $('#modal-lightbox');
const lightboxImg = $('#lightbox-img');
const mapsListEl = $('#maps-list');
const inpSearchMaps = $('#inp-search-maps');
const mapsCountBadge = $('#maps-count-badge');
const inspectorImagePreview = $('#inspector-image-preview');
const inpImageThumb = $('#inp-image-thumb');
const inpImageMeta = $('#inp-image-meta');
const btnDownloadImage = $('#btn-download-image');
const btnRemoveImage = $('#btn-remove-image');
const btnLightboxDownload = $('#btn-lightbox-download');
const fileUploadImage = $('#file-upload-image');
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

const renderer = new MindMapRenderer(store, nodesLayer, edgesGroup, mediaStore, () => {
  renderer.render();
  syncToolbarAndInspector();
});

const presentation = new PresentationController({
  store,
  renderer,
  camera,
  hudEl: $('#presentation-hud'),
  stepLabelEl: $('#pres-step-counter'),
  btnProgressive: $('#btn-pres-progressive'),
  btnSpotlight: $('#btn-pres-spotlight'),
  btnCamera: $('#btn-pres-camera'),
  btnGuide: $('#btn-pres-guide'),
  onEnter: () => {
    updateFrameGuideBox();
  },
  onExit: () => {
    btnSpotlight.classList.toggle('active', renderer.spotlightEnabled);
    updateFrameGuideBox();
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
  const style = getComputedStyle(frameGuideEl);
  const padL = parseFloat(style.paddingLeft) || 0;
  const padR = parseFloat(style.paddingRight) || 0;
  const padT = parseFloat(style.paddingTop) || 0;
  const padB = parseFloat(style.paddingBottom) || 0;
  const maxW = Math.max(220, vw - padL - padR);
  const maxH = Math.max(180, vh - padT - padB);

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
  mapsCountBadge.textContent = String(store.listMaps().length);

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

  const activeAlign = node.align || 'center';
  document.querySelectorAll('.seg-align button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.align === activeAlign);
  });

  if (node.image && node.image.id) {
    inspectorImagePreview.hidden = false;
    const imgSize = node.image.size || 'md';
    document.querySelectorAll('.seg-img-size button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.imgSize === imgSize);
    });
    const entry = mediaStore.getImageEntry(node.image.id);
    if (entry) {
      inpImageThumb.src = entry.url;
      const fmt = extensionFromMime(entry.mime || node.image.mime).toUpperCase();
      const dims = `${entry.width || node.image.width}×${entry.height || node.image.height}`;
      const sizeStr = entry.sizeBytes ? ` • ${formatBytes(entry.sizeBytes)}` : '';
      inpImageMeta.textContent = `${fmt} • ${dims}${sizeStr}`;
    } else {
      inpImageThumb.removeAttribute('src');
      inpImageMeta.textContent = '';
      mediaStore.loadImages([node.image.id]).then((loaded) => {
        if (loaded) syncToolbarAndInspector();
      });
    }
  } else {
    inspectorImagePreview.hidden = true;
    inpImageThumb.removeAttribute('src');
    inpImageMeta.textContent = '';
  }

  const visibleOrder = store.getVisibleDfsOrder();
  const stepIdx = visibleOrder.indexOf(node.id);
  inspectorStepBadge.textContent =
    stepIdx >= 0 ? `Passo ${stepIdx + 1} de ${visibleOrder.length}` : 'Oculto';

  const parentNode = node.parentId ? store.getNode(node.parentId) : null;
  const siblingIdx = parentNode ? parentNode.children.indexOf(node.id) : -1;
  btnMoveUp.disabled = !parentNode || siblingIdx <= 0;
  btnMoveDown.disabled = !parentNode || siblingIdx < 0 || siblingIdx >= parentNode.children.length - 1;
  btnToggleSide.hidden = !(
    node.parentId === data.rootId && (data.layout || 'bilateral') === 'bilateral'
  );

  btnToggleCollapse.disabled = node.id === data.rootId || node.children.length === 0;
  btnToggleCollapse.textContent = node.collapsed ? 'Expandir ramo' : 'Recolher ramo';
  btnDeleteNode.disabled = node.id === data.rootId;
}

async function attachImageFileToNode(nodeId, file) {
  const node = store.getNode(nodeId);
  if (!node || !file) return;
  try {
    const saved = await mediaStore.saveImageFromFile(file);
    store.updateNode(nodeId, {
      image: {
        id: saved.id,
        width: saved.width,
        height: saved.height,
        mime: saved.mime,
        size: node.image?.size || 'md',
      },
    });
    if (saved.originalBytes > saved.sizeBytes && saved.mime === 'image/webp') {
      const pct = Math.round((1 - saved.sizeBytes / saved.originalBytes) * 100);
      showToast(`Convertida em WebP: ${formatBytes(saved.originalBytes)} → ${formatBytes(saved.sizeBytes)} (-${pct}%)`);
    } else {
      showToast(`Imagem ${extensionFromMime(saved.mime).toUpperCase()} anexada (${formatBytes(saved.sizeBytes)})`);
    }
  } catch (err) {
    showToast(err.message || 'Erro ao anexar imagem');
  }
}

async function preloadActiveMapMedia() {
  const ids = store.getAllImageIds();
  if (!ids.length) return;
  const loaded = await mediaStore.loadImages(ids);
  if (loaded) {
    syncToolbarAndInspector();
    renderer.render();
  }
}

let activeLightboxImage = null;

function openLightbox(imageId, nodeText = 'imagem-mapa') {
  const entry = mediaStore.getImageEntry(imageId);
  if (!entry) return;
  activeLightboxImage = { id: imageId, name: nodeText };
  lightboxImg.src = entry.url;
  modalLightbox.hidden = false;
}

function closeLightbox() {
  modalLightbox.hidden = true;
  activeLightboxImage = null;
  lightboxImg.removeAttribute('src');
}

// Popula swatches de cor e grade de emojis com categorias e busca no inspetor
function buildInspectorControls() {
  const emojiGrid = $('#emoji-grid');
  const emojiTabs = $('#emoji-tabs');
  const emojiSearch = $('#inp-emoji-search');
  let activeCategory = EMOJI_CATEGORIES[0]?.id || 'youtube';

  const normalize = (str) =>
    String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const renderEmojiGrid = () => {
    const query = normalize(emojiSearch.value.trim());
    const sourceItems = query
      ? EMOJI_CATEGORIES.flatMap((c) => c.items).filter((item) =>
          normalize(item.k + ' ' + item.e).includes(query)
        )
      : (EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.items || []);

    emojiGrid.innerHTML = '';
    if (!sourceItems.length) {
      const empty = document.createElement('div');
      empty.className = 'emoji-empty';
      empty.textContent = 'Nenhum ícone encontrado.';
      emojiGrid.appendChild(empty);
      return;
    }

    for (const item of sourceItems) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-btn';
      btn.textContent = item.e;
      btn.title = item.k.split(' ').slice(0, 3).join(', ');
      btn.addEventListener('click', () => {
        const node = store.getSelectedNode();
        if (node) store.updateNode(node.id, { icon: item.e });
      });
      emojiGrid.appendChild(btn);
    }
  };

  const tabs = EMOJI_CATEGORIES.map((c) => ({ id: c.id, label: c.label }));
  for (const tab of tabs) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `emoji-tab${tab.id === activeCategory ? ' active' : ''}`;
    btn.textContent = tab.label;
    btn.dataset.cat = tab.id;
    btn.setAttribute('role', 'tab');
    btn.addEventListener('click', () => {
      activeCategory = tab.id;
      emojiSearch.value = '';
      emojiTabs.querySelectorAll('.emoji-tab').forEach((t) => {
        t.classList.toggle('active', t.dataset.cat === activeCategory);
      });
      renderEmojiGrid();
    });
    emojiTabs.appendChild(btn);
  }

  emojiSearch.addEventListener('input', renderEmojiGrid);
  renderEmojiGrid();

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
  titleEl.textContent = originalText || '';
  titleEl.contentEditable = 'true';
  camera.focusForEdit(renderer.lastLayout.positions.get(nodeId));
  titleEl.focus({ preventScroll: true });

  if (selectAll) {
    const range = document.createRange();
    range.selectNodeContents(titleEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  viewportEl.scrollLeft = 0;
  viewportEl.scrollTop = 0;

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
    const raw = (titleEl.innerText || '').replace(/\r\n/g, '\n').trim();
    const nextText = raw || originalText || 'Sem título';
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
      } else if (actionEl.dataset.action === 'zoom-image') {
        const targetNode = store.getNode(nodeId);
        if (targetNode?.image?.id) openLightbox(targetNode.image.id, targetNode.text);
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

  // Arrastar e soltar arquivo de imagem direto sobre um cartão
  let fileDropTargetId = null;

  viewportEl.addEventListener('dragover', (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    const nodeEl = e.target.closest('.node');
    const nextId = nodeEl?.dataset.id || null;
    if (fileDropTargetId !== nextId) {
      if (fileDropTargetId) {
        renderer.getNodeElement(fileDropTargetId)?.classList.remove('drop-target');
      }
      if (nextId) {
        renderer.getNodeElement(nextId)?.classList.add('drop-target');
      }
      fileDropTargetId = nextId;
    }
  });

  viewportEl.addEventListener('dragleave', (e) => {
    if (!viewportEl.contains(e.relatedTarget) && fileDropTargetId) {
      renderer.getNodeElement(fileDropTargetId)?.classList.remove('drop-target');
      fileDropTargetId = null;
    }
  });

  viewportEl.addEventListener('drop', async (e) => {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    if (fileDropTargetId) {
      renderer.getNodeElement(fileDropTargetId)?.classList.remove('drop-target');
      fileDropTargetId = null;
    }
    const file = [...e.dataTransfer.files].find(
      (f) => f.type.startsWith('image/') || /\.webp$/i.test(f.name)
    );
    if (!file) {
      showToast('Solte um arquivo de imagem (WebP, PNG, JPG ou SVG)');
      return;
    }
    const nodeEl = e.target.closest('.node');
    const targetId = nodeEl?.dataset.id || store.getSelectedNode()?.id;
    if (targetId) {
      store.select(targetId);
      await attachImageFileToNode(targetId, file);
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
    store.createMap(item.dataset.template);
    closeDropdowns();
    requestAnimationFrame(() => {
      camera.fitToBounds(renderer.lastLayout.bounds, { animate: true });
    });
    showToast(`Novo mapa "${item.textContent.trim()}" criado`);
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
        await exportPNG(store, renderer.lastLayout, { transparentBg: false, mediaStore });
      } else if (kind === 'png-transparent') {
        showToast('Gerando PNG transparente...');
        await exportPNG(store, renderer.lastLayout, { transparentBg: true, mediaStore });
      } else if (kind === 'svg') {
        await exportSVG(store, renderer.lastLayout, mediaStore);
        showToast('SVG vetorial exportado');
      } else if (kind === 'json-save') {
        await exportJSON(store, mediaStore);
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
      if (obj && obj._media && typeof obj._media === 'object') {
        for (const [imgId, info] of Object.entries(obj._media)) {
          if (info?.dataUrl) {
            await mediaStore.saveImageFromDataUrl(info.dataUrl, {
              id: imgId,
              width: info.width,
              height: info.height,
              mime: info.mime,
            });
          }
        }
        delete obj._media;
      }
      store.importAsNewMap(obj);
      requestAnimationFrame(() => {
        camera.fitToBounds(renderer.lastLayout.bounds, { animate: true });
      });
      showToast('Projeto importado para Meus Mapas');
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
    presentation.enter();
  });

  // Inspetor
  inpNodeText.addEventListener('input', () => {
    const node = store.getSelectedNode();
    if (node) {
      store.updateNode(node.id, { text: inpNodeText.value }, { recordHistory: false });
      requestAnimationFrame(() => {
        camera.ensureNodeVisible(renderer.lastLayout.positions.get(node.id), {
          margin: 56,
          duration: 220,
        });
      });
    }
  });
  inpNodeText.addEventListener('focus', () => store.recordSnapshot());

  inpNodeSubtitle.addEventListener('input', () => {
    const node = store.getSelectedNode();
    if (node) {
      store.updateNode(node.id, { subtitle: inpNodeSubtitle.value }, { recordHistory: false });
      requestAnimationFrame(() => {
        camera.ensureNodeVisible(renderer.lastLayout.positions.get(node.id), {
          margin: 56,
          duration: 220,
        });
      });
    }
  });
  inpNodeSubtitle.addEventListener('focus', () => store.recordSnapshot());

  document.querySelectorAll('.fmt-btn[data-fmt-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.fmtTarget;
      const wrap = btn.dataset.fmtWrap || '**';
      const fieldEl = document.getElementById(targetId);
      const node = store.getSelectedNode();
      if (!fieldEl || !node) return;

      const start = fieldEl.selectionStart ?? fieldEl.value.length;
      const end = fieldEl.selectionEnd ?? fieldEl.value.length;
      const val = fieldEl.value;
      const selected = val.slice(start, end);
      const placeholder =
        wrap === '=='
          ? 'destaque'
          : wrap === '--'
            ? 'pequeno'
            : wrap === '__'
              ? 'itálico'
              : 'negrito';

      store.recordSnapshot();

      let nextVal;
      let nextSelStart;
      let nextSelEnd;

      if (selected && selected.startsWith(wrap) && selected.endsWith(wrap) && selected.length > wrap.length * 2) {
        const inner = selected.slice(wrap.length, -wrap.length);
        nextVal = val.slice(0, start) + inner + val.slice(end);
        nextSelStart = start;
        nextSelEnd = start + inner.length;
      } else {
        const inner = selected || placeholder;
        nextVal = val.slice(0, start) + wrap + inner + wrap + val.slice(end);
        nextSelStart = start + wrap.length;
        nextSelEnd = nextSelStart + inner.length;
      }

      fieldEl.value = nextVal;
      const prop = targetId === 'inp-node-text' ? 'text' : 'subtitle';
      store.updateNode(node.id, { [prop]: nextVal }, { recordHistory: false });
      fieldEl.focus();
      fieldEl.setSelectionRange(nextSelStart, nextSelEnd);
    });
  });

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

  document.querySelector('.seg-align').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-align]');
    const node = store.getSelectedNode();
    if (btn && node) store.updateNode(node.id, { align: btn.dataset.align });
  });

  $('#btn-upload-image').addEventListener('click', () => {
    fileUploadImage.click();
  });

  fileUploadImage.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    const node = store.getSelectedNode();
    if (file && node) {
      await attachImageFileToNode(node.id, file);
    }
    fileUploadImage.value = '';
  });

  btnDownloadImage.addEventListener('click', async () => {
    const node = store.getSelectedNode();
    if (!node?.image?.id) return;
    try {
      const filename = await mediaStore.downloadImage(node.image.id, node.text || 'imagem-mapa');
      showToast(`Imagem salva: ${filename}`);
    } catch (err) {
      showToast(err.message || 'Erro ao salvar imagem');
    }
  });

  btnRemoveImage.addEventListener('click', async () => {
    const node = store.getSelectedNode();
    if (!node?.image?.id) return;
    const oldImageId = node.image.id;
    store.updateNode(node.id, { image: null });
    if (!store.getAllLibraryImageIds().has(oldImageId)) {
      await mediaStore.deleteImage(oldImageId);
    }
    showToast('Imagem excluída');
  });

  btnLightboxDownload.addEventListener('click', async () => {
    if (!activeLightboxImage?.id) return;
    try {
      const filename = await mediaStore.downloadImage(
        activeLightboxImage.id,
        activeLightboxImage.name || 'imagem-mapa'
      );
      showToast(`Imagem salva: ${filename}`);
    } catch (err) {
      showToast(err.message || 'Erro ao salvar imagem');
    }
  });

  document.querySelector('.seg-img-size').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-img-size]');
    const node = store.getSelectedNode();
    if (btn && node?.image) {
      store.updateNode(node.id, {
        image: { ...node.image, size: btn.dataset.imgSize },
      });
    }
  });

  $('#btn-close-lightbox').addEventListener('click', closeLightbox);
  modalLightbox.querySelector('.modal-backdrop').addEventListener('click', closeLightbox);

  window.addEventListener('paste', async (e) => {
    if (presentation.active) return;
    const items = [...(e.clipboardData?.items || [])];
    const imageItem = items.find((it) => it.type.startsWith('image/'));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    const node = store.getSelectedNode();
    if (file && node) {
      e.preventDefault();
      await attachImageFileToNode(node.id, file);
    }
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

  btnMoveUp.addEventListener('click', () => {
    const node = store.getSelectedNode();
    if (node) store.moveNodeOrder(node.id, -1);
  });

  btnMoveDown.addEventListener('click', () => {
    const node = store.getSelectedNode();
    if (node) store.moveNodeOrder(node.id, 1);
  });

  btnToggleSide.addEventListener('click', () => {
    const node = store.getSelectedNode();
    if (node) store.toggleNodeSide(node.id);
  });

  // Toggle inspetor e zoom
  $('#btn-close-inspector').addEventListener('click', () => {
    document.body.classList.add('inspector-collapsed');
    updateFrameGuideBox();
  });

  $('#btn-toggle-inspector').addEventListener('click', () => {
    document.body.classList.toggle('inspector-collapsed');
    updateFrameGuideBox();
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
  $('#btn-pres-guide').addEventListener('click', () => presentation.toggleGuideVisual());
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

  // Modal Meus Mapas
  $('#btn-my-maps').addEventListener('click', () => {
    closeDropdowns();
    openMapsModal();
  });
  $('#btn-close-maps').addEventListener('click', closeMapsModal);
  modalMaps.querySelector('.modal-backdrop').addEventListener('click', closeMapsModal);
  $('#btn-new-map').addEventListener('click', () => {
    store.createMap('blank');
    closeMapsModal();
    requestAnimationFrame(() => {
      camera.fitToBounds(renderer.lastLayout.bounds, { animate: true });
    });
    showToast('Novo mapa criado');
  });
  inpSearchMaps.addEventListener('input', () => {
    renderMapsList(inpSearchMaps.value);
  });

  window.addEventListener('resize', () => {
    updateFrameGuideBox();
  });
}

const THEME_LABELS = {
  'dark-studio': 'Dark Studio',
  neon: 'Neon Tech',
  'clean-light': 'Clean Editorial',
  chalkboard: 'Quadro Negro',
  'chroma-key': 'Chroma Key',
};

function formatMapDate(ts) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return '';
  }
}

let confirmingDeleteId = null;
let confirmDeleteTimer = null;

function openMapsModal() {
  confirmingDeleteId = null;
  inpSearchMaps.value = '';
  renderMapsList('');
  modalMaps.hidden = false;
}

function closeMapsModal() {
  confirmingDeleteId = null;
  if (confirmDeleteTimer) {
    clearTimeout(confirmDeleteTimer);
    confirmDeleteTimer = null;
  }
  modalMaps.hidden = true;
}

function renderMapsList(filterText = '') {
  const query = filterText.trim().toLowerCase();
  const maps = store.listMaps().filter((m) => !query || m.title.toLowerCase().includes(query));

  mapsListEl.innerHTML = '';

  if (maps.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'maps-empty';
    empty.textContent = query
      ? 'Nenhum mapa encontrado com esse título.'
      : 'Você ainda não tem mapas salvos.';
    mapsListEl.appendChild(empty);
    return;
  }

  for (const map of maps) {
    const card = document.createElement('div');
    card.className = `map-card${map.isActive ? ' is-active' : ''}`;

    const top = document.createElement('div');
    top.className = 'map-card-top';

    const titleRow = document.createElement('div');
    titleRow.className = 'map-card-title-row';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'map-card-icon';
    iconSpan.textContent = map.icon;

    const titleSpan = document.createElement('span');
    titleSpan.className = 'map-card-title';
    titleSpan.textContent = map.title;
    titleSpan.title = map.title;

    titleRow.append(iconSpan, titleSpan);
    top.appendChild(titleRow);

    if (map.isActive) {
      const activePill = document.createElement('span');
      activePill.className = 'map-active-pill';
      activePill.textContent = 'Atual';
      top.appendChild(activePill);
    }

    const meta = document.createElement('div');
    meta.className = 'map-card-meta';
    const topicsLabel = map.nodeCount === 1 ? '1 tópico' : `${map.nodeCount} tópicos`;
    meta.textContent = `${topicsLabel} • ${THEME_LABELS[map.theme] || map.theme} • ${formatMapDate(map.updatedAt)}`;

    const actions = document.createElement('div');
    actions.className = 'map-card-actions';

    const btnRename = document.createElement('button');
    btnRename.type = 'button';
    btnRename.className = 'btn btn-soft';
    btnRename.textContent = 'Renomear';
    btnRename.addEventListener('click', (e) => {
      e.stopPropagation();
      startCardRename(titleRow, titleSpan, map);
    });

    const btnDuplicate = document.createElement('button');
    btnDuplicate.type = 'button';
    btnDuplicate.className = 'btn btn-soft';
    btnDuplicate.textContent = 'Duplicar';
    btnDuplicate.addEventListener('click', (e) => {
      e.stopPropagation();
      store.duplicateMap(map.id);
      closeMapsModal();
      requestAnimationFrame(() => {
        camera.fitToBounds(renderer.lastLayout.bounds, { animate: true });
      });
      showToast('Mapa duplicado');
    });

    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    const isConfirming = confirmingDeleteId === map.id;
    btnDelete.className = `btn btn-danger-soft${isConfirming ? ' btn-confirm-delete' : ''}`;
    btnDelete.textContent = isConfirming ? 'Confirmar?' : 'Excluir';
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirmingDeleteId !== map.id) {
        confirmingDeleteId = map.id;
        if (confirmDeleteTimer) clearTimeout(confirmDeleteTimer);
        confirmDeleteTimer = setTimeout(() => {
          confirmingDeleteId = null;
          if (!modalMaps.hidden) renderMapsList(inpSearchMaps.value);
        }, 3000);
        renderMapsList(inpSearchMaps.value);
        return;
      }
      confirmingDeleteId = null;
      const wasActive = map.isActive;
      store.deleteMap(map.id);
      mediaStore.pruneUnused(store.getAllLibraryImageIds());
      renderMapsList(inpSearchMaps.value);
      if (wasActive) {
        requestAnimationFrame(() => {
          camera.fitToBounds(renderer.lastLayout.bounds, { animate: true });
        });
      }
      showToast('Mapa excluído');
    });

    actions.append(btnRename, btnDuplicate, btnDelete);
    card.append(top, meta, actions);

    card.addEventListener('click', () => {
      if (!map.isActive) {
        store.switchMap(map.id);
        requestAnimationFrame(() => {
          camera.fitToBounds(renderer.lastLayout.bounds, { animate: true });
        });
        showToast(`Mapa "${map.title}" aberto`);
      }
      closeMapsModal();
    });

    mapsListEl.appendChild(card);
  }
}

function startCardRename(titleRow, titleSpan, map) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'map-rename-input';
  input.value = map.title;

  titleSpan.replaceWith(input);
  input.focus();
  input.select();

  input.addEventListener('click', (e) => e.stopPropagation());

  let done = false;
  const commit = () => {
    if (done) return;
    done = true;
    store.renameMap(map.id, input.value);
    renderMapsList(inpSearchMaps.value);
  };
  const cancel = () => {
    if (done) return;
    done = true;
    renderMapsList(inpSearchMaps.value);
  };

  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  });
  input.addEventListener('blur', commit);
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function bindKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (!modalLightbox.hidden) {
      if (e.key === 'Escape') closeLightbox();
      return;
    }

    if (!modalMaps.hidden) {
      if (e.key === 'Escape') closeMapsModal();
      return;
    }

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
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        presentation.toggleGuideVisual();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        presentation.toggleHudVisibility();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        camera.zoomByStep(1.15);
      } else if (e.key === '-') {
        e.preventDefault();
        camera.zoomByStep(0.87);
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

    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      store.moveNodeOrder(selected.id, -1);
    } else if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      store.moveNodeOrder(selected.id, 1);
    } else if (e.key === 'Tab') {
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
      presentation.enter();
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      closeDropdowns();
      openMapsModal();
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

  store.subscribe((_, reason) => {
    syncToolbarAndInspector();
    renderer.render();
    if (reason === 'map-switch' || reason === 'template' || reason === 'import') {
      preloadActiveMapMedia();
    }
  });

  syncToolbarAndInspector();
  const layout = renderer.render();
  camera.fitToBounds(layout.bounds, { animate: false, padding: 72 });
  preloadActiveMapMedia();
}

init();
