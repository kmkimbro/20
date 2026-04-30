import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Box,
  FileText,
  ChevronDown,
  EllipsisVertical,
  CircleHelp,
} from 'lucide-react';

const DOC_LIFECYCLE_OPTIONS = ['Draft', 'In review', 'Approved', 'Technician mode'];

export default function Header({
  navActive = 'doc',
  onNavChange,
  minimal = false,
  documentLifecycle = null,
  onDocumentLifecycleChange,
  publishStatusLabel = 'Unpublished',
  backTo = null,
  hideCadNav = false,
}) {
  const navigate = useNavigate();
  const [publishOpen, setPublishOpen] = useState(false);

  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <div className="logo">
          <img src="/logo.png" alt="Logo" width={28} height={28} />
        </div>
        {!minimal && (
          <>
            <button
              type="button"
              className="nav-btn nav-back"
              onClick={() => navigate(backTo || -1)}
            >
              <ChevronLeft className="nav-icon" size={20} />
              Projects
            </button>
            {!hideCadNav ? (
              <button type="button" className={`nav-btn${navActive === 'cad' ? ' nav-active' : ''}`} onClick={() => onNavChange?.('cad')}>
                <Box className="nav-icon" size={20} />
                CAD View
              </button>
            ) : null}
            <button type="button" className={`nav-btn${navActive === 'doc' ? ' nav-active' : ''}`} onClick={() => onNavChange?.('doc')}>
              <FileText className="nav-icon" size={20} />
              Document Editor
            </button>
          </>
        )}
      </div>
      <div className="top-nav-right">
        {!minimal && documentLifecycle != null && onDocumentLifecycleChange && (
          <div className="header-doc-lifecycle">
            <span className="header-doc-lifecycle-label">State</span>
            <select
              className="header-doc-lifecycle-select"
              value={documentLifecycle}
              aria-label="Document state"
              onChange={(e) => onDocumentLifecycleChange(e.target.value)}
            >
              {DOC_LIFECYCLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}
        {!minimal && (
          <button type="button" className={`publish-btn${publishOpen ? ' publish-open' : ''}`} onClick={() => setPublishOpen((p) => !p)}>
            {publishStatusLabel || 'Unpublished'} <ChevronDown className="publish-caret" size={16} />
          </button>
        )}
        <button type="button" className="icon-btn more-btn">
          <EllipsisVertical className="header-icon" size={20} />
        </button>
        <button type="button" className="icon-btn help-btn">
          <CircleHelp className="header-icon" size={20} />
        </button>
        <div className="avatar">F</div>
      </div>
    </header>
  );
}
