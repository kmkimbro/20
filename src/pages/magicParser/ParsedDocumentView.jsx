import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import Header from '../../components/Header.jsx';
import CadView from '../../components/CadView.jsx';
import { loadParsedPages, saveParsedPages } from './docStore.js';
import CutoutImage from './CutoutImage.jsx';
import './magic-parser.css';

const SHEET_W = 760;

function clamp(n, min, max) {
  return Math.max(min, Math.min(n, max));
}

function ParsedItem({ item, scale, selected, editing, onSelect, onEdit, onChange }) {
  if (item.locked || item.type === 'page') {
    return (
      <img
        className="mp-page-bg"
        src={item.src}
        alt=""
        draggable={false}
        style={{ left: item.x, top: item.y, width: item.w, height: item.h }}
      />
    );
  }

  const onPointerDown = (event) => {
    if (event.button != null && event.button !== 0) return;
    if (event.target.closest('.mp-resize')) return;
    if (editing) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect(item.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { x: item.x, y: item.y };
    const node = event.currentTarget;
    const pointerId = event.pointerId;
    try { node.setPointerCapture(pointerId); } catch { /* already captured */ }

    const move = (ev) => {
      if (ev.pointerId !== pointerId) return;
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      onChange(item.id, { x: origin.x + dx, y: origin.y + dy });
    };
    const up = (ev) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      try { node.releasePointerCapture(pointerId); } catch { /* already released */ }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const onResizeDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(item.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { w: item.w, h: item.h };
    const move = (ev) => {
      const dw = (ev.clientX - startX) / scale;
      const dh = (ev.clientY - startY) / scale;
      onChange(item.id, {
        w: Math.max(24, origin.w + dw),
        h: Math.max(24, origin.h + dh),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      className={`mp-item is-${item.piece || item.type}${selected ? ' is-selected' : ''}`}
      style={{ left: item.x, top: item.y, width: item.w, height: item.h }}
      onPointerDown={onPointerDown}
      onDoubleClick={(event) => {
        if (item.type !== 'text') return;
        event.stopPropagation();
        onEdit(item.id);
      }}
    >
      {item.type === 'image' ? (
        <img src={item.src} alt="" draggable={false} />
      ) : (
        <div
          className="mp-text"
          contentEditable={editing}
          suppressContentEditableWarning
          style={{ fontSize: item.fontSize }}
          onBlur={(event) => {
            onChange(item.id, { text: event.currentTarget.textContent || '' });
            onEdit(null);
          }}
        >
          {item.text}
        </div>
      )}
      {selected && item.type === 'image' ? (
        <button type="button" className="mp-resize" aria-label="Resize image" onPointerDown={onResizeDown} />
      ) : null}
    </div>
  );
}

export default function ParsedDocumentView({ document: doc, onBack }) {
  const [pages, setPages] = useState(null);
  const [missing, setMissing] = useState(false);
  const [activePageId, setActivePageId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [nav, setNav] = useState('doc');
  const [cadReady, setCadReady] = useState(Boolean(doc.cadLinked));
  const [retakeId, setRetakeId] = useState(null);
  const pageRefs = useRef({});
  const pagesRef = useRef(null);
  const readyRef = useRef(false);
  const replaceRef = useRef(null);
  const replaceTarget = useRef(null);
  const pendingLink = useRef(null);

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;
    loadParsedPages(doc.id).then((loaded) => {
      if (cancelled) return;
      if (!loaded?.length) {
        setMissing(true);
        setPages([]);
        return;
      }
      setPages(loaded);
      setActivePageId(loaded[0].id);
      pagesRef.current = loaded;
      readyRef.current = true;
    }).catch(() => {
      if (!cancelled) setMissing(true);
    });
    return () => { cancelled = true; };
  }, [doc.id]);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => () => {
    if (readyRef.current && pagesRef.current?.length) {
      saveParsedPages(doc.id, pagesRef.current);
    }
  }, [doc.id]);

  useEffect(() => {
    if (!readyRef.current || !pages?.length) return undefined;
    const timer = setTimeout(() => {
      if (pagesRef.current?.length) saveParsedPages(doc.id, pagesRef.current);
    }, 400);
    return () => clearTimeout(timer);
  }, [pages, doc.id]);

  const patchItem = (pageId, itemId, patch) => {
    setPages((prev) => {
      if (!prev) return prev;
      const next = prev.map((page) => {
        if (page.id !== pageId) return page;
        return {
          ...page,
          items: page.items.map((item) => (
            item.id === itemId ? { ...item, ...patch } : item
          )),
        };
      });
      pagesRef.current = next;
      return next;
    });
  };

  const removeItem = (pageId, itemId) => {
    setPages((prev) => {
      if (!prev) return prev;
      const next = prev.map((page) => (
        page.id === pageId
          ? { ...page, items: page.items.filter((item) => item.id !== itemId) }
          : page
      ));
      pagesRef.current = next;
      return next;
    });
    setSelected(null);
    setEditingId(null);
  };

  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (event) => {
      if (editingId) return;
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const step = event.shiftKey ? 10 : 1;
      const delta = {
        ArrowLeft: { x: -step },
        ArrowRight: { x: step },
        ArrowUp: { y: -step },
        ArrowDown: { y: step },
      }[event.key];
      if (delta) {
        event.preventDefault();
        setPages((prev) => {
          if (!prev) return prev;
          const next = prev.map((page) => {
            if (page.id !== selected.pageId) return page;
            return {
              ...page,
              items: page.items.map((item) => (
                item.id === selected.itemId
                  ? {
                    ...item,
                    x: item.x + (delta.x || 0),
                    y: item.y + (delta.y || 0),
                  }
                  : item
              )),
            };
          });
          pagesRef.current = next;
          return next;
        });
        return;
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        removeItem(selected.pageId, selected.itemId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, editingId]);

  const imageCount = pages
    ? pages.reduce((sum, page) => sum + page.items.filter((item) => item.piece === 'image').length, 0)
    : (doc.imageCount ?? 0);
  const textCount = pages
    ? pages.reduce((sum, page) => sum + page.items.filter((item) => item.piece === 'text').length, 0)
    : (doc.textCount ?? 0);
  const movable = [
    imageCount ? `${imageCount} ${imageCount === 1 ? 'image' : 'images'}` : '',
    textCount ? `${textCount} text ${textCount === 1 ? 'block' : 'blocks'}` : '',
  ].filter(Boolean).join(' and ');
  const summary = doc.cadLinked
    ? `Imported from ${doc.fileName || 'PDF'}. ${movable ? `${movable} were cut out. ` : ''}CAD ${doc.cadFileLabel} is attached, so link and retake follow the model.${doc.truncated ? ' First 20 pages only.' : ''}`
    : `Imported from ${doc.fileName || 'PDF'}. ${movable ? `${movable} were cut out. ` : ''}Pictures stay unlinked until you upload CAD — then retake and link follow the model.${doc.truncated ? ' First 20 pages only.' : ''}`;

  const findItemPage = (itemId) => pages?.find((page) => page.items.some((item) => item.id === itemId));

  const replaceImage = (itemId) => {
    const page = findItemPage(itemId);
    if (!page) return;
    replaceTarget.current = { pageId: page.id, itemId };
    replaceRef.current?.click();
  };

  const onReplaceFile = (event) => {
    const file = event.target.files?.[0];
    const target = replaceTarget.current;
    event.target.value = '';
    if (!file || !target) return;
    const reader = new FileReader();
    reader.onload = () => {
      patchItem(target.pageId, target.itemId, { src: reader.result, linked: false });
    };
    reader.readAsDataURL(file);
  };

  const linkImage = (itemId) => {
    const page = findItemPage(itemId);
    if (!page) return;
    if (!cadReady) {
      pendingLink.current = { pageId: page.id, itemId };
      setNav('cad');
      return;
    }
    patchItem(page.id, itemId, { linked: true });
  };

  const retakeImage = (itemId) => {
    const page = findItemPage(itemId);
    if (!page) return;
    setRetakeId({ pageId: page.id, itemId });
    setNav('cad');
  };

  return (
    <div className="lb-app">
      <Header navActive={nav} onNavChange={setNav} onBack={onBack} />
      <input ref={replaceRef} type="file" accept="image/*" hidden onChange={onReplaceFile} />
      {nav === 'doc' ? (
      <div className="mp-banner">
        <span>{summary}</span>
      </div>
      ) : null}
      <div className="mp-cad" style={{ display: nav === 'cad' ? 'flex' : 'none' }}>
        <CadView
          empty={!doc.cadLinked}
          operations={[]}
          docTitle={doc.name}
          emptyNote={retakeId && !cadReady
            ? 'Upload CAD to retake this picture from the model.'
            : 'Upload CAD to link pictures. After it loads, retake and link follow the model.'}
          screenshotCaptureMode={Boolean(retakeId) && cadReady}
          isRetakeMode={Boolean(retakeId) && cadReady}
          onLoaded={() => {
            setCadReady(true);
            const pending = pendingLink.current;
            if (pending) {
              patchItem(pending.pageId, pending.itemId, { linked: true });
              pendingLink.current = null;
            }
          }}
          onCaptureComplete={(src) => {
            if (retakeId) patchItem(retakeId.pageId, retakeId.itemId, { src, linked: true });
            setRetakeId(null);
            setNav('doc');
          }}
          onExitCaptureMode={() => setRetakeId(null)}
          onCancelCapture={() => { setRetakeId(null); setNav('doc'); }}
        />
      </div>
      {nav === 'doc' ? (
      <div className="lb-doc">
        <aside className="lb-doc-tree">
          <div className="lb-tree-title">{doc.name}</div>
          {(pages || []).map((page) => (
            <button
              key={page.id}
              type="button"
              className={`lb-tree-item${activePageId === page.id ? ' is-active' : ''}`}
              onClick={() => {
                setActivePageId(page.id);
                pageRefs.current[page.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <FileText size={14} />
              Page {page.number}
            </button>
          ))}
        </aside>
        <div className="lb-doc-stage">
          <div className="lb-doc-canvas" onPointerDown={() => { setSelected(null); setEditingId(null); }}>
            {missing ? (
              <div className="mp-empty-doc">
                <p>This import is no longer stored in the browser. Go back and import the PDF again.</p>
              </div>
            ) : null}
            {!pages && !missing ? (
              <div className="mp-empty-doc"><p>Opening document…</p></div>
            ) : null}
            {(pages || []).map((page) => {
              const scale = SHEET_W / page.width;
              return (
                <div key={page.id} className="mp-sheet-wrap" ref={(node) => { pageRefs.current[page.id] = node; }}>
                  <div className="mp-sheet-label">Page {page.number}</div>
                  <div className="mp-sheet" style={{ width: SHEET_W, height: page.height * scale }}>
                    <div
                      className="mp-sheet-scale"
                      style={{ width: page.width, height: page.height, transform: `scale(${scale})` }}
                      onPointerDown={(event) => {
                        if (event.target === event.currentTarget) {
                          setSelected(null);
                          setEditingId(null);
                        }
                        event.stopPropagation();
                      }}
                    >
                      {page.items.map((item) => {
                        const onSelect = (itemId) => {
                          setSelected({ pageId: page.id, itemId });
                          setActivePageId(page.id);
                        };
                        const onChange = (itemId, patch) => {
                          const pageBox = pages.find((entry) => entry.id === page.id);
                          const current = pageBox?.items.find((entry) => entry.id === itemId);
                          if (!current) return;
                          const next = { ...current, ...patch };
                          if (patch.x != null || patch.y != null) {
                            const maxX = Math.max(0, page.width - next.w);
                            const maxY = Math.max(0, page.height - next.h);
                            next.x = clamp(next.x, 0, maxX);
                            next.y = clamp(next.y, 0, maxY);
                          }
                          patchItem(page.id, itemId, {
                            ...patch,
                            x: next.x,
                            y: next.y,
                            w: next.w,
                            h: next.h,
                          });
                        };
                        if (item.piece === 'image') {
                          return (
                            <CutoutImage
                              key={item.id}
                              item={item}
                              scale={scale}
                              selected={selected?.itemId === item.id}
                              onSelect={onSelect}
                              onChange={onChange}
                              onRemove={(itemId) => removeItem(page.id, itemId)}
                              onReplace={replaceImage}
                              onRetake={retakeImage}
                              onOpenCad={() => setNav('cad')}
                              onLink={linkImage}
                            />
                          );
                        }
                        return (
                          <ParsedItem
                            key={item.id}
                            item={item}
                            scale={scale}
                            selected={selected?.itemId === item.id}
                            editing={editingId === item.id}
                            onSelect={onSelect}
                            onEdit={setEditingId}
                            onChange={onChange}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      ) : null}
    </div>
  );
}
