// Document Editor - Interactive Script

document.addEventListener('DOMContentLoaded', () => {

  // --- Track mouse position on canvas ---
  let lastCanvasMouseX = 0;
  let lastCanvasMouseY = 0;

  const canvasEl = document.querySelector('.canvas');
  if (canvasEl) {
    canvasEl.addEventListener('mousemove', (e) => {
      const rect = canvasEl.getBoundingClientRect();
      lastCanvasMouseX = e.clientX - rect.left;
      lastCanvasMouseY = e.clientY - rect.top;
    });
  }

  // --- Sidebar tree item selection ---
  const treeItems = document.querySelectorAll('.tree-item');
  treeItems.forEach(item => {
    item.addEventListener('click', () => {
      treeItems.forEach(i => i.classList.remove('tree-active'));
      item.classList.add('tree-active');
    });
  });

  // --- Toolbar button active state ---
  const toolbarBtns = document.querySelectorAll('.toolbar-btn');
  toolbarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toolbarBtns.forEach(b => b.classList.remove('toolbar-active'));
      btn.classList.toggle('toolbar-active');
    });
  });

  // --- Split button dropdown menus ---
  const splitBtns = document.querySelectorAll('.split-btn');

  function closeAllMenus() {
    document.querySelectorAll('.split-menu').forEach(menu => {
      menu.classList.remove('open');
    });
  }

  splitBtns.forEach(splitBtn => {
    const caret = splitBtn.querySelector('.split-btn-caret');
    const menu = splitBtn.querySelector('.split-menu');

    // Caret toggles the dropdown
    caret.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains('open');
      closeAllMenus();
      if (!isOpen) {
        menu.classList.add('open');
      }
    });

    // Action button fires the default tool
    const action = splitBtn.querySelector('.split-btn-action');
    action.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllMenus();

      // If this is the media split button, default action opens Screenshot modal
      const menuId = splitBtn.getAttribute('data-menu');
      if (menuId === 'media-menu') {
        openModal('existing');
        return;
      }

      // Visual feedback
      action.style.background = '#E0E0E0';
      setTimeout(() => { action.style.background = ''; }, 150);
    });

    // Menu items close the menu on selection
    const menuItems = menu.querySelectorAll('.split-menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllMenus();

        const text = item.textContent.trim();

        // Screenshot → open modal on existing tab
        if (text === 'Screenshot') {
          openModal('existing');
          return;
        }

        // Screenshot capture → open modal on existing tab
        if (text === 'Screenshot capture') {
          openModal('existing');
          return;
        }

        // Upload from computer → open modal on upload tab
        if (text === 'Upload from computer') {
          openModal('upload');
          return;
        }

        // Placeholder image → place empty image block in document
        if (text === 'Placeholder image') {
          placePlaceholderImage();
          return;
        }

        // Video → open modal on upload tab
        if (text === 'Video') {
          openModal('upload');
          return;
        }

        // Default visual feedback
        const act = splitBtn.querySelector('.split-btn-action');
        act.style.background = '#E0E0E0';
        setTimeout(() => { act.style.background = ''; }, 150);
      });
    });
  });

  // Close menus when clicking anywhere else
  document.addEventListener('click', () => {
    closeAllMenus();
  });

  // Close menus on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllMenus();
      closeModal();
    }
  });

  // =============================================
  // MODAL LOGIC
  // =============================================
  const modal = document.getElementById('screenshotModal');
  const modalClose = document.getElementById('modalClose');
  const modalTabs = document.querySelectorAll('.modal-tab');
  const tabContents = document.querySelectorAll('.modal-tab-content');

  function openModal(tab) {
    modal.classList.add('open');
    switchTab(tab || 'existing');
    // Re-create lucide icons for dynamically-shown content
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function closeModal() {
    modal.classList.remove('open');
  }

  function switchTab(tabId) {
    modalTabs.forEach(t => {
      t.classList.toggle('modal-tab-active', t.getAttribute('data-tab') === tabId);
    });
    tabContents.forEach(c => {
      c.classList.toggle('active', c.id === 'tab-' + tabId);
    });
  }

  // Close modal
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Tab switching
  modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.getAttribute('data-tab'));
    });
  });

  // Screenshot card click → place image in document
  const screenshotCards = document.querySelectorAll('.screenshot-card');
  screenshotCards.forEach(card => {
    card.addEventListener('click', () => {
      const previewSvg = card.querySelector('.screenshot-thumb');
      if (previewSvg) {
        placeImageInDocument(previewSvg.outerHTML);
      } else {
        // Empty preview card - place a placeholder
        placePlaceholderImage();
      }
      closeModal();
    });
  });

  // Upload dropzone interactions
  const dropzone = document.getElementById('uploadDropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      // Simulate placing an uploaded image
      placePlaceholderImage();
      closeModal();
    });

    // Browse button
    const browseBtn = dropzone.querySelector('.upload-browse-btn');
    if (browseBtn) {
      browseBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              placeUploadedImage(ev.target.result);
              closeModal();
            };
            reader.readAsDataURL(file);
          }
        });
        input.click();
      });
    }
  }

  // =============================================
  // DOCUMENT PLACEMENT — always absolute at mouse position
  // =============================================
  function placeAtMouse(div) {
    const canvas = document.querySelector('.canvas');
    const imgW = 320;
    const imgH = 240;
    // Clamp so the image stays fully within the page
    const maxLeft = canvas.clientWidth - imgW;
    const maxTop = canvas.clientHeight - imgH;
    const left = Math.max(0, Math.min(lastCanvasMouseX - imgW / 2, maxLeft));
    const top = Math.max(0, Math.min(lastCanvasMouseY - imgH / 2, maxTop));
    div.style.position = 'absolute';
    div.style.left = left + 'px';
    div.style.top = top + 'px';
    div.style.zIndex = '10';
    canvas.appendChild(div);
    addResizeHandles(div);
    addDragToMove(div);
  }

  // =============================================
  // DRAG TO MOVE — for placed images (absolute within canvas)
  // =============================================
  function addDragToMove(container) {
    container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.resize-handle') || e.target.closest('.placed-image-remove')) return;
      if (container.style.position !== 'absolute') return;

      e.preventDefault();
      const canvas = document.querySelector('.canvas');
      if (!canvas) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = parseFloat(container.style.left) || 0;
      const startTop = parseFloat(container.style.top) || 0;

      container.classList.add('dragging');
      document.body.classList.add('dragging-active');

      function onMouseMove(ev) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let newLeft = startLeft + dx;
        let newTop = startTop + dy;
        const maxLeft = canvas.clientWidth - container.offsetWidth;
        const maxTop = canvas.clientHeight - container.offsetHeight;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        container.style.left = newLeft + 'px';
        container.style.top = newTop + 'px';
      }

      function onMouseUp() {
        container.classList.remove('dragging');
        document.body.classList.remove('dragging-active');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  function placeImageInDocument(svgHtml) {
    const div = document.createElement('div');
    div.className = 'placed-image';
    div.innerHTML = `
      <button class="placed-image-remove" onclick="this.parentElement.remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="placed-image-content">${svgHtml}</div>
    `;
    placeAtMouse(div);
  }

  function placeUploadedImage(dataUrl) {
    const div = document.createElement('div');
    div.className = 'placed-image';
    div.innerHTML = `
      <button class="placed-image-remove" onclick="this.parentElement.remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="placed-image-content">
        <img src="${dataUrl}" alt="Uploaded image"/>
      </div>
    `;
    placeAtMouse(div);
  }

  function placePlaceholderImage() {
    const div = document.createElement('div');
    div.className = 'placed-image-placeholder';
    div.innerHTML = `
      <button class="placed-image-remove" onclick="this.parentElement.remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <svg viewBox="0 0 260 220" class="placeholder-illustration">
        <g transform="translate(10, 30)">
          <path d="M60,50 L120,80 L120,150 L60,120 Z" fill="none" stroke="#4F6EF7" stroke-width="1.5" stroke-dasharray="6,3"/>
          <path d="M60,50 L120,20 L180,50 L120,80 Z" fill="none" stroke="#4F6EF7" stroke-width="1.5" stroke-dasharray="6,3"/>
          <path d="M120,80 L180,50 L180,120 L120,150 Z" fill="none" stroke="#4F6EF7" stroke-width="1.5" stroke-dasharray="6,3"/>
          <path d="M60,120 L120,150 L180,120" fill="none" stroke="#4F6EF7" stroke-width="1.5" stroke-dasharray="6,3"/>
          <path d="M60,50 L60,120" fill="none" stroke="#4F6EF7" stroke-width="1.5" stroke-dasharray="6,3"/>
          <line x1="170" y1="20" x2="170" y2="45" stroke="#4F6EF7" stroke-width="1.5"/>
          <line x1="157" y1="32" x2="183" y2="32" stroke="#4F6EF7" stroke-width="1.5"/>
          <path d="M60,120 L120,90 L180,120" fill="none" stroke="#4F6EF7" stroke-width="0.8" stroke-dasharray="4,3"/>
          <path d="M120,90 L120,150" fill="none" stroke="#4F6EF7" stroke-width="0.8" stroke-dasharray="4,3"/>
          <rect x="56" y="46" width="8" height="8" fill="#4F6EF7" rx="1"/>
          <rect x="116" y="76" width="8" height="8" fill="#4F6EF7" rx="1"/>
          <rect x="176" y="46" width="8" height="8" fill="#4F6EF7" rx="1"/>
          <rect x="116" y="16" width="8" height="8" fill="#4F6EF7" rx="1"/>
          <rect x="56" y="116" width="8" height="8" fill="#4F6EF7" rx="1"/>
          <rect x="116" y="146" width="8" height="8" fill="#4F6EF7" rx="1"/>
          <rect x="176" y="116" width="8" height="8" fill="#4F6EF7" rx="1"/>
        </g>
      </svg>
      <span class="placeholder-label">Screenshot</span>
    `;
    placeAtMouse(div);
  }

  // =============================================
  // IMAGE RESIZE LOGIC
  // =============================================
  function addResizeHandles(container) {
    const handles = ['nw', 'ne', 'sw', 'se'];
    handles.forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `resize-handle resize-handle-${pos}`;
      handle.dataset.handle = pos;
      container.appendChild(handle);
    });

    container.querySelectorAll('.resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startResize(e, container, handle.dataset.handle);
      });
    });
  }

  const MIN_SIZE = 80;

  function startResize(e, container, handlePos) {
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = container.offsetWidth;
    const startHeight = container.offsetHeight;
    const aspectRatio = startWidth / startHeight;
    const startLeft = parseFloat(container.style.left) || container.offsetLeft;
    const startTop = parseFloat(container.style.top) || container.offsetTop;

    container.classList.add('resizing');
    document.body.classList.add('resizing-active');

    const cursorMap = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize' };
    document.body.style.cursor = cursorMap[handlePos];

    function onMouseMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const canvas = document.querySelector('.canvas');
      let newWidth, newHeight;

      if (ev.shiftKey) {
        // Aspect ratio lock: drive from the handle's primary axis, then derive the other
        const wFromX = handlePos === 'se' || handlePos === 'ne' ? startWidth + dx : startWidth - dx;
        const hFromY = handlePos === 'se' || handlePos === 'sw' ? startHeight + dy : startHeight - dy;
        const wFromAspect = hFromY * aspectRatio;
        const hFromAspect = wFromX / aspectRatio;
        newWidth = wFromX;
        newHeight = hFromAspect;
        if (Math.abs(dy) > Math.abs(dx)) {
          newHeight = hFromY;
          newWidth = wFromAspect;
        }
      } else {
        // Free resize: use both dx and dy
        if (handlePos === 'se' || handlePos === 'ne') {
          newWidth = startWidth + dx;
        } else {
          newWidth = startWidth - dx;
        }
        if (handlePos === 'se' || handlePos === 'sw') {
          newHeight = startHeight + dy;
        } else {
          newHeight = startHeight - dy;
        }
      }

      newWidth = Math.max(MIN_SIZE, newWidth);
      newHeight = Math.max(MIN_SIZE, newHeight);
      if (canvas) {
        newWidth = Math.min(canvas.clientWidth, newWidth);
        newHeight = Math.min(canvas.clientHeight, newHeight);
      }

      container.style.width = newWidth + 'px';
      container.style.height = newHeight + 'px';

      if (container.style.position === 'absolute') {
        const widthDiff = startWidth - newWidth;
        const heightDiff = startHeight - newHeight;
        if (handlePos === 'nw') {
          container.style.left = (startLeft + widthDiff) + 'px';
          container.style.top = (startTop + heightDiff) + 'px';
        } else if (handlePos === 'ne') {
          container.style.top = (startTop + heightDiff) + 'px';
        } else if (handlePos === 'sw') {
          container.style.left = (startLeft + widthDiff) + 'px';
        }
      }
    }

    function onMouseUp() {
      container.classList.remove('resizing');
      document.body.classList.remove('resizing-active');
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // --- Tree expand/collapse ---
  const treeParents = document.querySelectorAll('.tree-parent');
  treeParents.forEach(parent => {
    const expandIcon = parent.querySelector('.tree-expand');
    if (expandIcon) {
      expandIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const section = parent.closest('.tree-section');
        const children = section.querySelectorAll('.tree-item:not(.tree-parent)');
        const isExpanded = expandIcon.style.transform === 'rotate(90deg)';
        expandIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';
        expandIcon.style.transition = 'transform 0.15s ease';
        children.forEach(child => {
          child.style.display = isExpanded ? 'none' : 'flex';
        });
      });
    }
  });

  // --- Nav button switching ---
  const navBtns = document.querySelectorAll('.nav-btn:not(.nav-back)');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('nav-active'));
      btn.classList.add('nav-active');
    });
  });

  // --- Publish dropdown toggle ---
  const publishBtn = document.querySelector('.publish-btn');
  if (publishBtn) {
    publishBtn.addEventListener('click', () => {
      publishBtn.classList.toggle('publish-open');
    });
  }

  // --- Image panel hover effects & resize handles ---
  const imagePanels = document.querySelectorAll('.image-panel');
  imagePanels.forEach(panel => {
    // Add resize handles to existing image panels
    addResizeHandles(panel);
  });

  // --- Table row hover ---
  const tableRows = document.querySelectorAll('.parts-table tbody tr, .tools-table tbody tr');
  tableRows.forEach(row => {
    row.addEventListener('mouseenter', () => {
      row.style.background = '#F8F9FF';
    });
    row.addEventListener('mouseleave', () => {
      row.style.background = '';
    });
  });
});
