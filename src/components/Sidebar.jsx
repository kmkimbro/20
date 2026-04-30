import { useState, useEffect, Fragment } from 'react';
import {
  FileText,
  History,
  ClipboardList,
  FolderOpen,
  FileStack,
  Layers,
  Cog,
  ChevronRight,
} from 'lucide-react';
import { buildPageList, findNode, getOwnerNode } from '../lib/docTree.js';
import { usePrototype } from '../contexts/PrototypeContext.jsx';
import MergedPackageTag from './MergedPackageTag.jsx';

const ICON_SIZE = 16;

function TreeExpand({ expanded, onClick }) {
  return (
    <ChevronRight
      className="tree-expand"
      size={12}
      style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={expanded ? 'Collapse' : 'Expand'}
    />
  );
}

const REF_CANVAS_W = 400;
const REF_CANVAS_H = 250;

function isSpecialSidebarPageId(pageId) {
  return /^(?:m\d+-)?(cover|history|bom)$/.test(pageId);
}

function SlideThumbnailPreview({ page, placedItems = [] }) {
  const isSpecial = isSpecialSidebarPageId(page.id);
  const hasPlacedItems = placedItems.length > 0;
  const parts = page.parts || [];
  const hasParts = !page.isSubPage && parts.length > 0;

  const scaleX = (v) => (v / REF_CANVAS_W) * 100;
  const scaleY = (v) => (v / REF_CANVAS_H) * 100;

  if (isSpecial) {
    return <div className="slide-thumbnail-preview slide-thumbnail-special" />;
  }

  return (
    <div className="slide-thumbnail-preview slide-thumbnail-content">
      {hasParts && (
        <div className="slide-thumbnail-parts">
          {(parts.slice(0, 3).map((p, i) => ({ id: p.id, badge: String.fromCharCode(65 + i), name: p.name }))).map((row) => (
            <div key={row.id} className="slide-thumbnail-part-row">
              <span className="slide-thumbnail-badge">{row.badge}</span>
              <span className="slide-thumbnail-part-name">{row.name}</span>
            </div>
          ))}
        </div>
      )}
      {hasPlacedItems && (
        <div className="slide-thumbnail-canvas" style={{ aspectRatio: `${REF_CANVAS_W}/${REF_CANVAS_H}` }}>
          {placedItems.map((item) => (
            <div
              key={item.id}
              className="slide-thumbnail-placed"
              style={{
                left: `${scaleX(item.left ?? 0)}%`,
                top: `${scaleY(item.top ?? 0)}%`,
                width: `${scaleX(item.width ?? 120)}%`,
                height: `${scaleY(item.height ?? 100)}%`,
              }}
            >
              {item.type === 'uploaded' && item.src && <img src={item.src} alt="" />}
              {item.type === 'image' && item.svgContent && <div dangerouslySetInnerHTML={{ __html: item.svgContent }} />}
              {item.type === 'placeholder' && (
                <div className="slide-thumbnail-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 16l5-5 4 4 5-5 4 4" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  operations = [],
  activePageId,
  onSelectPage,
  showSubPages = false,
  placedItems = [],
  defaultViewTab,
  documentTitle = 'Test Document 1',
  megaSections = null,
}) {
  const { conceptId } = usePrototype();
  const showTabbedView = conceptId === 'image-two-buttons';
  const showDocumentTree = showSubPages;
  const [expanded, setExpanded] = useState(new Set(['op1', 'op2', 'op1-parts', 'op1-subpages']));

  useEffect(() => {
    if (!showDocumentTree || !activePageId) return;
    const idsToExpand = new Set();
    const ownerId = activePageId.replace(/-\d+$/, '');
    if (activePageId.includes('-') && activePageId.match(/-\d+$/)) {
      idsToExpand.add(`${ownerId}-subpages`);
    }
    const findOwnerForPart = (ops, partId) => {
      for (const op of ops) {
        if ((op.parts || []).some((p) => p.id === partId)) return op.id;
        const sub = findOwnerForPart(op.suboperations || [], partId);
        if (sub) return sub;
      }
      return null;
    };
    const partsOwner = findOwnerForPart(operations, activePageId);
    if (partsOwner) idsToExpand.add(`${partsOwner}-parts`);
    if (ownerId.includes('.')) {
      const parts = ownerId.split('.');
      let acc = parts[0];
      idsToExpand.add(acc);
      for (let i = 1; i < parts.length; i++) {
        acc += '.' + parts[i];
        idsToExpand.add(acc);
      }
    } else {
      idsToExpand.add(ownerId);
    }
    setExpanded((prev) => new Set([...prev, ...idsToExpand]));
  }, [activePageId, showDocumentTree, operations]);

  const toggleExpand = (id, e) => {
    if (e) e.stopPropagation();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setActive = (id, e) => {
    if (e) e.stopPropagation();
    if (onSelectPage) onSelectPage(id);
  };

  const isActive = (id) => String(activePageId) === String(id);
  const isParentActive = (node) => {
    if (node.id === activePageId) return true;
    if ((node.subPages || []).some((s) => s.id === activePageId)) return true;
    return (node.suboperations || []).some((sub) => isParentActive(sub));
  };

  function renderOperation(op, depth = 0) {
    const hasChildren = (op.parts?.length > 0) || (op.subPages?.length > 0) || (op.suboperations?.length > 0);
    const opExpanded = expanded.has(op.id);
    const isSuboperation = op.id.includes('.');
    const indent = depth === 1 ? 12 : 0;

    return (
      <div key={op.id} className="tree-section" style={{ marginLeft: indent }}>
        <div
          className={`tree-item tree-parent${depth === 0 ? ' tree-item-root' : ''}${isActive(op.id) ? ' tree-active' : isParentActive(op) ? ' tree-parent-active' : ''}`}
          onClick={(e) => {
            if (showDocumentTree && hasChildren && e.target.closest('.tree-expand')) {
              toggleExpand(op.id, e);
            } else {
              setActive(op.id, e);
            }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setActive(op.id)}
        >
          <span className="tree-number">{op.number}</span>
          {showDocumentTree && hasChildren ? (
            <span className="tree-icon-slot">
              <TreeExpand expanded={opExpanded} onClick={(e) => toggleExpand(op.id, e)} />
              {isSuboperation ? (
                <FileStack className="tree-icon" size={ICON_SIZE} />
              ) : (
                <FolderOpen className="tree-icon" size={ICON_SIZE} />
              )}
            </span>
          ) : (
            isSuboperation ? (
              <FileStack className="tree-icon" size={ICON_SIZE} />
            ) : (
              <FolderOpen className="tree-icon" size={ICON_SIZE} />
            )
          )}
          <span>{op.label}</span>
        </div>
        {showDocumentTree && opExpanded && (
          <div className="tree-children">
            {op.parts?.length > 0 && (
              <>
                <div
                  className="tree-item tree-child tree-node-parts"
                  onClick={(e) => {
                    if (e.target.closest('.tree-expand')) toggleExpand(`${op.id}-parts`, e);
                    else e.stopPropagation();
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="tree-number-prefix" aria-hidden />
                  <span className="tree-icon-slot">
                    <TreeExpand expanded={expanded.has(`${op.id}-parts`)} onClick={(e) => toggleExpand(`${op.id}-parts`, e)} />
                    <Cog className="tree-icon" size={ICON_SIZE} />
                  </span>
                  <span>Parts</span>
                </div>
                {expanded.has(`${op.id}-parts`) && op.parts.map((part) => (
                  <div
                    key={part.id}
                    className={`tree-item tree-child tree-child-nested${isActive(part.id) ? ' tree-active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setActive(part.id, e); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setActive(part.id, e)}
                  >
                    <span className="tree-number-prefix" aria-hidden />
                    <span className="tree-icon-placeholder" />
                    <span>{part.name}</span>
                  </div>
                ))}
              </>
            )}
            {op.subPages?.length > 0 && (
              <>
                <div
                  className="tree-item tree-child tree-node-subpages"
                  data-flow-anchor="add-subpage"
                  onClick={(e) => {
                    if (e.target.closest('.tree-expand')) toggleExpand(`${op.id}-subpages`, e);
                    else e.stopPropagation();
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="tree-number-prefix" aria-hidden />
                  <span className="tree-icon-slot">
                    <TreeExpand expanded={expanded.has(`${op.id}-subpages`)} onClick={(e) => toggleExpand(`${op.id}-subpages`, e)} />
                    <Layers className="tree-icon" size={ICON_SIZE} />
                  </span>
                  <span>Subpages</span>
                </div>
                {expanded.has(`${op.id}-subpages`) && op.subPages.map((sub) => (
                  <div
                    key={sub.id}
                    data-page-id={sub.id}
                    className={`tree-item tree-child tree-child-nested${isActive(sub.id) ? ' tree-active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setActive(sub.id, e); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setActive(sub.id)}
                  >
                    <span className="tree-number-prefix" aria-hidden />
                    <span className="tree-icon-placeholder" />
                    <span>{sub.label}</span>
                  </div>
                ))}
              </>
            )}
            {(op.suboperations || []).map((subop) => renderOperation(subop, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  const [viewTab, setViewTab] = useState(defaultViewTab ?? 'outline');

  const effectiveView = showTabbedView ? viewTab : 'outline';

  function renderSpecialRows(idPrefix) {
    const p = idPrefix || '';
    return (
      <>
        <div className={`tree-item tree-item-root${isActive(`${p}cover`) ? ' tree-active' : ''}`} onClick={() => setActive(`${p}cover`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setActive(`${p}cover`)}>
          <span className="tree-number-prefix" aria-hidden />
          <FileText className="tree-icon" size={ICON_SIZE} />
          <span>Cover</span>
        </div>
        <div className={`tree-item tree-item-root${isActive(`${p}history`) ? ' tree-active' : ''}`} onClick={() => setActive(`${p}history`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setActive(`${p}history`)}>
          <span className="tree-number-prefix" aria-hidden />
          <History className="tree-icon" size={ICON_SIZE} />
          <span>Document Version History</span>
        </div>
        <div className={`tree-item tree-item-root${isActive(`${p}bom`) ? ' tree-active' : ''}`} onClick={() => setActive(`${p}bom`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setActive(`${p}bom`)}>
          <span className="tree-number-prefix" aria-hidden />
          <ClipboardList className="tree-icon" size={ICON_SIZE} />
          <span>Bill of Materials</span>
        </div>
      </>
    );
  }

  return (
    <aside className="sidebar">
      {megaSections?.length ? (
        <div className="sidebar-title-block sidebar-title-block--mega">
          <MergedPackageTag className="sidebar-merged-tag-above-title" />
          <h2 className="sidebar-title sidebar-title--mega">{documentTitle}</h2>
        </div>
      ) : (
        <h2 className="sidebar-title">{documentTitle}</h2>
      )}
      {showTabbedView && (
        <div className="sidebar-tabs">
          <button
            type="button"
            data-flow-anchor="outline-tab"
            className={`sidebar-tab${viewTab === 'outline' ? ' sidebar-tab-active' : ''}`}
            onClick={() => setViewTab('outline')}
          >
            Outline view
          </button>
          <button
            type="button"
            data-flow-anchor="page-tab"
            className={`sidebar-tab${viewTab === 'page' ? ' sidebar-tab-active' : ''}`}
            onClick={() => setViewTab('page')}
          >
            Page view
          </button>
        </div>
      )}
      {effectiveView === 'outline' && (
        megaSections?.length ? (
          megaSections.map((sec, secIdx) => (
            <Fragment key={`${sec.prefix}-${sec.title}`}>
              <h3 className={`sidebar-section-title${secIdx === 0 ? ' sidebar-section-title--first' : ''}`}>{sec.title}</h3>
              <nav className="doc-tree" aria-label={`Outline: ${sec.title}`}>
                {renderSpecialRows(sec.prefix)}
                {sec.operations.map((op) => (showDocumentTree ? renderOperation(op) : (
                  <div key={op.id} className="tree-section">
                    <div
                      className={`tree-item tree-parent tree-item-root${isActive(op.id) ? ' tree-active' : ''}`}
                      onClick={(e) => setActive(op.id, e)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setActive(op.id)}
                    >
                      <span className="tree-number">{op.number}</span>
                      {op.id.includes('.') ? (
                        <FileStack className="tree-icon" size={ICON_SIZE} />
                      ) : (
                        <FolderOpen className="tree-icon" size={ICON_SIZE} />
                      )}
                      <span>{op.label}</span>
                    </div>
                  </div>
                )))}
              </nav>
            </Fragment>
          ))
        ) : (
          <nav className="doc-tree">
            {renderSpecialRows('')}
            {operations.map((op) => (showDocumentTree ? renderOperation(op) : (
              <div key={op.id} className="tree-section">
                <div
                  className={`tree-item tree-parent tree-item-root${isActive(op.id) ? ' tree-active' : ''}`}
                  onClick={(e) => setActive(op.id, e)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setActive(op.id)}
                >
                  <span className="tree-number">{op.number}</span>
                  {op.id.includes('.') ? (
                    <FileStack className="tree-icon" size={ICON_SIZE} />
                  ) : (
                    <FolderOpen className="tree-icon" size={ICON_SIZE} />
                  )}
                  <span>{op.label}</span>
                </div>
              </div>
            )))}
          </nav>
        )
      )}
      {effectiveView === 'page' && (() => {
        const opPages = buildPageList(operations);
        const firstOpPageId = opPages.find((p) => !p.isSubPage)?.id;

        function getPlacedItemsForPage(pageId) {
          return placedItems.filter((item) =>
            item.pageId != null ? item.pageId === pageId : pageId === firstOpPageId
          );
        }

        function getSlideLabel(page, hasChildren, opExpanded) {
          if (isSpecialSidebarPageId(page.id)) {
            if (page.id.endsWith('cover')) return <FileText className="slide-thumbnail-icon" size={14} strokeWidth={1.8} />;
            if (page.id.endsWith('history')) return <History className="slide-thumbnail-icon" size={14} strokeWidth={1.8} />;
            if (page.id.endsWith('bom')) return <ClipboardList className="slide-thumbnail-icon" size={14} strokeWidth={1.8} />;
          }
          if (page.isSubPage) {
            return <span className="slide-thumbnail-section" aria-hidden>•</span>;
          }
          if (hasChildren) {
            return (
              <span className="slide-thumbnail-label-inner">
                <span className="slide-thumbnail-number">{page.title.split(' ')[0]}</span>
                <TreeExpand expanded={opExpanded} onClick={(e) => { e.stopPropagation(); toggleExpand(page.id, e); }} />
              </span>
            );
          }
          const found = findNode(operations, page.id);
          return found ? <span className="slide-thumbnail-number">{found.node.number}</span> : null;
        }

        function renderOperationSlides(ops, depth = 0) {
          const indent = depth > 0 ? 12 : 0;
          return ops.map((op) => {
            const hasChildren = (op.subPages?.length > 0) || (op.suboperations?.length > 0);
            const opExpanded = expanded.has(op.id);
            const opPage = { id: op.id, title: `${op.number} ${op.label}`, isSubPage: false, parts: op.parts };

            return (
              <Fragment key={op.id}>
                <button
                  type="button"
                  className={`slide-thumbnail-row${depth ? ' slide-thumbnail-nested' : ''}${isActive(op.id) ? ' slide-thumbnail-active' : ''}`}
                  style={depth ? { marginLeft: indent } : undefined}
                  onClick={(e) => {
                    if (hasChildren && e.target.closest('.tree-expand')) {
                      toggleExpand(op.id, e);
                    } else {
                      setActive(op.id, e);
                    }
                  }}
                >
                  <span className="slide-thumbnail-label" aria-hidden>
                    {getSlideLabel(opPage, hasChildren, opExpanded)}
                  </span>
                  <span className="slide-thumbnail-card">
                    <SlideThumbnailPreview
                      page={opPage}
                      placedItems={getPlacedItemsForPage(op.id)}
                    />
                  </span>
                </button>
                {opExpanded && hasChildren && (
                  <>
                    {(op.subPages || []).map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        className="slide-thumbnail-row slide-thumbnail-nested"
                        style={{ marginLeft: 12 }}
                        onClick={() => setActive(sub.id)}
                      >
                        <span className="slide-thumbnail-label" aria-hidden>
                          {getSlideLabel({ id: sub.id, title: sub.label, isSubPage: true, parts: null }, false, false)}
                        </span>
                        <span className="slide-thumbnail-card">
                          <SlideThumbnailPreview
                            page={{ id: sub.id, title: sub.label, isSubPage: true, parts: null }}
                            placedItems={getPlacedItemsForPage(sub.id)}
                          />
                        </span>
                      </button>
                    ))}
                    {renderOperationSlides(op.suboperations || [], depth + 1)}
                  </>
                )}
              </Fragment>
            );
          });
        }

        return (
          <div className="sidebar-page-view">
            <div className="slide-thumbnails">
              {[
                { id: 'cover', title: 'Cover', isSubPage: false, parts: null },
                { id: 'history', title: 'Document Version History', isSubPage: false, parts: null },
                { id: 'bom', title: 'Bill of Materials', isSubPage: false, parts: null },
              ].map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className={`slide-thumbnail-row${isActive(page.id) ? ' slide-thumbnail-active' : ''}`}
                  onClick={() => setActive(page.id)}
                >
                  <span className="slide-thumbnail-label" aria-hidden>
                    {getSlideLabel(page, false, false)}
                  </span>
                  <span className="slide-thumbnail-card">
                    <SlideThumbnailPreview
                      page={page}
                      placedItems={getPlacedItemsForPage(page.id)}
                    />
                  </span>
                </button>
              ))}
              {renderOperationSlides(operations)}
            </div>
          </div>
        );
      })()}
    </aside>
  );
}
