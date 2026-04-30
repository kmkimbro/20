/**
 * TableEnhancer — adds interaction layers ON TOP of existing tables without modifying them.
 *
 * Layers added:
 *   1. Row gutter controls (left of row, on hover): + button, drag handle
 *   2. Right-click context menu: "Remove row" with collapse+fade animation
 *   3. Add Column pill button (portalled): narrow vertical pill at table right edge on hover
 *      Clicking injects real <th>/<td> elements into the table DOM — the table handles
 *      its own shadow, border, and layout naturally.
 *
 * Usage: render <TableEnhancer> INSIDE the table's wrapper div (sibling to <table>).
 *   Pass wrapperRef (the wrapper div) and tbodyRef (<tbody> of the table).
 *   rows: [{ id, onRemove }] — must match tbody <tr> order, excluding add-row rows.
 */
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical, Plus, Trash2 } from 'lucide-react';

const COL_W = 120;

export default function TableEnhancer({ wrapperRef, tbodyRef, rows = [], onAddRow, onReorderRow, menuOpen = false }) {
  const [gutterPos, setGutterPos]         = useState(null);
  const [ctxMenu, setCtxMenu]             = useState(null);
  const [tableGeom, setTableGeom]         = useState(null);
  const [showAddColBtn, setShowAddColBtn] = useState(false);
  const [addColTooltip, setAddColTooltip] = useState(false);
  const [showAddRowBtn, setShowAddRowBtn] = useState(false);
  const [addRowTooltip, setAddRowTooltip] = useState(false);
  const [extraColumns, setExtraColumns]   = useState([]);   // [{ id }]

  const removeTimerRef     = useRef(null);
  const gutterHideTimer    = useRef(null);
  const gutterLockedRef    = useRef(false);
  const addColHideTimer    = useRef(null);
  const addColLockedRef    = useRef(false);
  const addRowHideTimer    = useRef(null);
  const addRowLockedRef    = useRef(false);
  const origTableWidthRef  = useRef(null); // natural width before any extra columns

  // Drag-to-reorder state (all in refs to avoid re-renders during drag)
  const dragStateRef  = useRef(null); // { fromIdx, ghostEl, lineEl }
  const [dropLine, setDropLine] = useState(null); // { y, left, width } — for the indicator

  /* ── Timers ──────────────────────────────────────────────────────────── */
  const scheduleGutterHide = () => {
    clearTimeout(gutterHideTimer.current);
    gutterHideTimer.current = setTimeout(() => {
      if (!gutterLockedRef.current) setGutterPos(null);
    }, 200);
  };
  const cancelGutterHide = () => clearTimeout(gutterHideTimer.current);

  const scheduleAddColHide = () => {
    clearTimeout(addColHideTimer.current);
    addColHideTimer.current = setTimeout(() => {
      if (!addColLockedRef.current) { setShowAddColBtn(false); setAddColTooltip(false); }
    }, 180);
  };
  const cancelAddColHide = () => clearTimeout(addColHideTimer.current);

  const scheduleAddRowHide = () => {
    clearTimeout(addRowHideTimer.current);
    addRowHideTimer.current = setTimeout(() => {
      if (!addRowLockedRef.current) { setShowAddRowBtn(false); setAddRowTooltip(false); }
    }, 180);
  };
  const cancelAddRowHide = () => clearTimeout(addRowHideTimer.current);

  /* ── Compute table screen position for the floating pill buttons ────── */
  const computeTableGeom = (wrapper) => {
    const tableEl = wrapper.querySelector('table');
    if (!tableEl) return;
    const rect = tableEl.getBoundingClientRect();
    setTableGeom({
      top: rect.top, left: rect.right, height: rect.height,
      tableLeft: rect.left, tableWidth: rect.width,
    });
  };

  /* ── Inject / sync extra <th> and <td> elements into the real table ──── */
  useLayoutEffect(() => {
    const wrapper = wrapperRef?.current;
    const tbody   = tbodyRef?.current;
    if (!wrapper || !tbody) return;

    const tableEl  = wrapper.querySelector('table');
    const frame    = wrapper.querySelector('.page-table-frame');
    const theadTr  = wrapper.querySelector('thead tr');
    if (!tableEl || !theadTr) return;

    // ── Record original width before first column is added ──────────────
    if (extraColumns.length > 0 && origTableWidthRef.current === null) {
      // Temporarily reset table width to measure natural width
      origTableWidthRef.current = tableEl.offsetWidth;
    }

    // ── Remove th/td for deleted columns ────────────────────────────────
    const currentIds = new Set(extraColumns.map(c => c.id));
    theadTr.querySelectorAll('th[data-xcol]').forEach(el => {
      if (!currentIds.has(el.dataset.xcol)) el.remove();
    });
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.querySelectorAll('td[data-xcol]').forEach(el => {
        if (!currentIds.has(el.dataset.xcol)) el.remove();
      });
    });

    // ── Add th/td for new columns ────────────────────────────────────────
    extraColumns.forEach((col, idx) => {
      // thead
      if (!theadTr.querySelector(`th[data-xcol="${col.id}"]`)) {
        const th = document.createElement('th');
        th.dataset.xcol = col.id;
        th.contentEditable = 'true';
        th.spellcheck = false;
        th.style.cssText = [
          `width:${COL_W}px`,
          `min-width:${COL_W}px`,
          'border-left:1px solid var(--border-color,#e5e7eb)',
          'padding:0 10px',
          'font-size:12px',
          'font-weight:600',
          'outline:none',
          'cursor:text',
        ].join(';');
        theadTr.appendChild(th);
      }

      // tbody rows
      tbody.querySelectorAll('tr').forEach(tr => {
        if (!tr.querySelector(`td[data-xcol="${col.id}"]`)) {
          const td = document.createElement('td');
          td.dataset.xcol = col.id;
          td.contentEditable = 'true';
          td.spellcheck = false;
          td.style.cssText = [
            `width:${COL_W}px`,
            `min-width:${COL_W}px`,
            'border-left:1px solid var(--border-color,#e5e7eb)',
            'padding:0 10px',
            'font-size:13px',
            'outline:none',
            'vertical-align:middle',
          ].join(';');
          tr.appendChild(td);
        }
      });
    });

    // ── Resize table + frame to fit extra columns ────────────────────────
    if (extraColumns.length > 0) {
      const origW = origTableWidthRef.current ?? tableEl.offsetWidth;
      const newW  = origW + extraColumns.length * COL_W;
      tableEl.style.width    = `${newW}px`;
      tableEl.style.minWidth = `${newW}px`;
      if (frame) frame.style.width = `${newW + 2}px`; // +2 for frame's 1px borders
    } else {
      tableEl.style.width    = '';
      tableEl.style.minWidth = '';
      if (frame) frame.style.width = '';
      origTableWidthRef.current = null;
    }

    // Re-measure after DOM change so pill button stays flush
    computeTableGeom(wrapper);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraColumns, rows, wrapperRef, tbodyRef]);

  /* ── Event delegation on the wrapper ────────────────────────────────── */
  useEffect(() => {
    const wrapper = wrapperRef?.current;
    const tbody   = tbodyRef?.current;
    if (!wrapper || !tbody) return;

    const onMouseMove = (e) => {
      cancelGutterHide();
      cancelAddColHide();
      cancelAddRowHide();
      computeTableGeom(wrapper);
      setShowAddColBtn(true);
      setShowAddRowBtn(true);

      const tr = e.target.closest('tr');
      if (!tr || !tbody.contains(tr) || tr.classList.contains('table-inline-add-row')) {
        scheduleGutterHide();
        return;
      }
      const trs = [...tbody.querySelectorAll('tr:not(.table-inline-add-row)')];
      const idx = trs.indexOf(tr);
      if (idx === -1) { scheduleGutterHide(); return; }
      const rect = tr.getBoundingClientRect();
      setGutterPos({ top: rect.top, left: rect.left, height: rect.height, rowIdx: idx });
    };

    const onContextMenu = (e) => {
      const tr = e.target.closest('tr');
      if (!tr || !tbody.contains(tr) || tr.classList.contains('table-inline-add-row')) return;
      const idx = [...tbody.querySelectorAll('tr:not(.table-inline-add-row)')].indexOf(tr);
      if (idx === -1) return;
      e.preventDefault();
      setCtxMenu({ x: e.clientX, y: e.clientY, rowIdx: idx });
    };

    const onEnter = () => {
      cancelGutterHide(); cancelAddColHide(); cancelAddRowHide();
      setShowAddColBtn(true); setShowAddRowBtn(true);
      computeTableGeom(wrapper);
    };
    const onLeave = () => { scheduleGutterHide(); scheduleAddColHide(); scheduleAddRowHide(); };

    wrapper.addEventListener('mousemove',   onMouseMove);
    wrapper.addEventListener('mouseleave',  onLeave);
    wrapper.addEventListener('mouseenter',  onEnter);
    wrapper.addEventListener('contextmenu', onContextMenu);
    return () => {
      wrapper.removeEventListener('mousemove',   onMouseMove);
      wrapper.removeEventListener('mouseleave',  onLeave);
      wrapper.removeEventListener('mouseenter',  onEnter);
      wrapper.removeEventListener('contextmenu', onContextMenu);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapperRef, tbodyRef]);

  /* ── Dismiss context menu ────────────────────────────────────────────── */
  useEffect(() => {
    if (!ctxMenu) return;
    const dismiss = (e) => { if (!e.target.closest('.te-ctx')) setCtxMenu(null); };
    const onKey   = (e) => { if (e.key === 'Escape') setCtxMenu(null); };
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown',   onKey);
    return () => {
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('keydown',   onKey);
    };
  }, [ctxMenu]);

  useEffect(() => () => {
    clearTimeout(removeTimerRef.current);
    clearTimeout(addColHideTimer.current);
    clearTimeout(addRowHideTimer.current);
  }, []);

  /* ── Remove row ──────────────────────────────────────────────────────── */
  const handleRemove = (rowIdx) => {
    const row = rows[rowIdx];
    if (!row) return;
    setCtxMenu(null);
    const tbody = tbodyRef?.current;
    if (tbody) {
      const tr = [...tbody.querySelectorAll('tr:not(.table-inline-add-row)')][rowIdx];
      if (tr) {
        tr.style.transition = 'opacity 0.2s ease, max-height 0.25s ease';
        tr.style.opacity    = '0';
        tr.style.maxHeight  = tr.offsetHeight + 'px';
        requestAnimationFrame(() => { tr.style.maxHeight = '0'; tr.style.overflow = 'hidden'; });
      }
    }
    removeTimerRef.current = setTimeout(() => row.onRemove(), 270);
  };

  /* ── Row gutter (portalled) ──────────────────────────────────────────── */
  const gutter = gutterPos && rows[gutterPos.rowIdx] && (
    <div
      className="table-enhancer-gutter"
      onMouseEnter={() => { gutterLockedRef.current = true;  cancelGutterHide(); }}
      onMouseLeave={() => { gutterLockedRef.current = false; scheduleGutterHide(); }}
      style={{
        position: 'fixed', top: gutterPos.top, left: gutterPos.left - 48,
        height: gutterPos.height, display: 'flex', alignItems: 'center', gap: 2,
        zIndex: 9999, animation: 'teGutterIn 0.1s ease', pointerEvents: 'auto',
      }}
    >
      <button
        type="button" title="Remove row"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          width: 22, height: 22, borderRadius: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#9ca3af', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none';    e.currentTarget.style.color = '#9ca3af'; }}
        onClick={e => { e.stopPropagation(); handleRemove(gutterPos.rowIdx); }}
      >
        <Trash2 size={13} />
      </button>
      {onReorderRow && (
        <div
          title="Drag to reorder"
          style={{
            cursor: 'grab', width: 22, height: 22, borderRadius: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#d1d5db', flexShrink: 0, userSelect: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none';    e.currentTarget.style.color = '#d1d5db'; }}
          onMouseDown={e => {
            e.preventDefault();
            e.stopPropagation();
            const fromIdx = gutterPos.rowIdx;
            const tbody = tbodyRef?.current;
            if (!tbody || fromIdx < 0) return;

            const trs = [...tbody.querySelectorAll('tr:not(.table-inline-add-row)')];
            const draggedTr = trs[fromIdx];
            if (!draggedTr) return;
            draggedTr.style.opacity = '0.4';

            dragStateRef.current = { fromIdx, draggedTr };

            const onMove = (me) => {
              const tb = tbodyRef?.current;
              if (!tb) return;
              const allTrs = [...tb.querySelectorAll('tr:not(.table-inline-add-row)')];
              let targetIdx = allTrs.length; // default: after last row
              let lineY = null;
              for (let i = 0; i < allTrs.length; i++) {
                const r = allTrs[i].getBoundingClientRect();
                if (me.clientY < r.top + r.height / 2) { targetIdx = i; lineY = r.top; break; }
                lineY = r.bottom;
              }
              const tableEl = wrapperRef?.current?.querySelector('table');
              const tRect = tableEl?.getBoundingClientRect();
              dragStateRef.current.targetIdx = targetIdx;
              setDropLine(tRect ? { y: lineY, left: tRect.left, width: tRect.width } : null);
            };

            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
              const ds = dragStateRef.current;
              if (ds?.draggedTr) ds.draggedTr.style.opacity = '';
              dragStateRef.current = null;
              setDropLine(null);
              if (ds && ds.targetIdx != null && ds.targetIdx !== ds.fromIdx && ds.targetIdx !== ds.fromIdx + 1) {
                const to = ds.targetIdx > ds.fromIdx ? ds.targetIdx - 1 : ds.targetIdx;
                onReorderRow(ds.fromIdx, to);
              }
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
        >
          <GripVertical size={13} />
        </div>
      )}
    </div>
  );

  /* ── Context menu (portalled) ────────────────────────────────────────── */
  const contextMenu = ctxMenu && (
    <div
      className="te-ctx"
      style={{
        position: 'fixed', top: ctxMenu.y, left: ctxMenu.x,
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 9,
        boxShadow: '0 4px 20px rgba(0,0,0,0.13)', padding: '4px 0',
        zIndex: 99999, minWidth: 150, animation: 'teCtxIn 0.1s ease',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      <button
        type="button"
        style={{
          display: 'block', width: '100%', textAlign: 'left',
          padding: '8px 14px', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 13, color: '#dc2626',
          fontWeight: 500, fontFamily: 'inherit',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
        onClick={() => handleRemove(ctxMenu.rowIdx)}
      >
        Remove row
      </button>
    </div>
  );

  /* ── Add Row pill button (portalled, fixed, below the table) ────────── */
  const addRowButton = showAddRowBtn && tableGeom && !menuOpen && (
    <div
      style={{
        position: 'fixed',
        top: tableGeom.top + tableGeom.height + 5,
        left: tableGeom.tableLeft,
        width: tableGeom.tableWidth,
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 9999,
      }}
      onMouseEnter={() => { addRowLockedRef.current = true;  cancelAddRowHide(); setAddRowTooltip(true); }}
      onMouseLeave={() => { addRowLockedRef.current = false; scheduleAddRowHide(); setAddRowTooltip(false); }}
    >
      <div style={{ position: 'relative', width: '100%' }}>
        <button
          type="button"
          style={{
            width: '100%', height: 22,
            background: '#f3f4f6', border: '1px solid #e5e7eb',
            borderRadius: 9999, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#9ca3af', padding: 0,
            transition: 'background 0.12s ease, color 0.12s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#4F6EF7'; e.currentTarget.style.borderColor = '#c7d7fd'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
          onClick={e => { e.stopPropagation(); onAddRow?.(); }}
        >
          <Plus size={13} />
        </button>
        {addRowTooltip && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: '50%', transform: 'translateX(-50%)',
            background: '#1e293b', color: '#fff', borderRadius: 7,
            padding: '7px 11px', fontSize: 12, whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
            lineHeight: 1.5, pointerEvents: 'none',
          }}>
            Click to add a new row
          </div>
        )}
      </div>
    </div>
  );

  /* ── Add Column pill button (portalled, fixed) ───────────────────────── */
  const addColButton = showAddColBtn && tableGeom && !menuOpen && (
    <div
      style={{
        position: 'fixed', top: tableGeom.top, left: tableGeom.left + 5,
        height: tableGeom.height, display: 'flex', alignItems: 'stretch',
        zIndex: 9999,
      }}
      onMouseEnter={() => { addColLockedRef.current = true;  cancelAddColHide(); setAddColTooltip(true); }}
      onMouseLeave={() => { addColLockedRef.current = false; scheduleAddColHide(); setAddColTooltip(false); }}
    >
      <div style={{ position: 'relative', height: tableGeom.height }}>
        <button
          type="button"
          style={{
            width: 22, height: '100%',
            background: '#f3f4f6', border: '1px solid #e5e7eb',
            borderRadius: 9999, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#9ca3af', padding: 0,
            transition: 'background 0.12s ease, color 0.12s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#4F6EF7'; e.currentTarget.style.borderColor = '#c7d7fd'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
          onClick={e => { e.stopPropagation(); setExtraColumns(prev => [...prev, { id: `col-${Date.now()}` }]); }}
        >
          <Plus size={13} />
        </button>
        {addColTooltip && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 6px)',
            left: '50%', transform: 'translateX(-50%)',
            background: '#1e293b', color: '#fff', borderRadius: 7,
            padding: '8px 11px', fontSize: 12, whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
            lineHeight: 1.7, pointerEvents: 'none',
          }}>
            <strong style={{ fontWeight: 600 }}>Click</strong> to add a new column<br />
            <strong style={{ fontWeight: 600 }}>Drag</strong> to add or remove columns
          </div>
        )}
      </div>
    </div>
  );

  const dropIndicator = dropLine && createPortal(
    <div style={{
      position: 'fixed',
      top: dropLine.y - 1,
      left: dropLine.left,
      width: dropLine.width,
      height: 2,
      background: '#4F6EF7',
      borderRadius: 9999,
      pointerEvents: 'none',
      zIndex: 99998,
    }} />,
    document.body
  );

  return (
    <>
      {typeof document !== 'undefined' && gutter       && createPortal(gutter,       document.body)}
      {typeof document !== 'undefined' && contextMenu  && createPortal(contextMenu,  document.body)}
      {typeof document !== 'undefined' && addRowButton && createPortal(addRowButton, document.body)}
      {typeof document !== 'undefined' && addColButton && createPortal(addColButton, document.body)}
      {typeof document !== 'undefined' && dropIndicator}
    </>
  );
}
