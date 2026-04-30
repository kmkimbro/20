import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Squirrel, Box, LayoutGrid } from 'lucide-react';
import { PROTOTYPES } from '../config/prototypes.js';
import { useViewMode } from '../contexts/ViewModeContext.jsx';

export default function PrototypeSwitcher() {
  const { viewMode, setViewMode } = useViewMode();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  /** Production root, gallery, and every static or dynamic prototype under `/prototype/`. */
  const shouldShow =
    location.pathname === '/' ||
    location.pathname === '/prototype' ||
    location.pathname.startsWith('/prototype/');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSelect = (path) => {
    navigate(path);
    setOpen(false);
  };

  if (!shouldShow) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 400,
        pointerEvents: 'none',
      }}
    >
      <div ref={menuRef} style={{ position: 'relative', pointerEvents: 'auto' }}>
        {open && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              marginBottom: 8,
              minWidth: 220,
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: 4,
              fontSize: 14,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode((m) => (m === 'wireframe' ? 'normal' : 'wireframe'))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                background: viewMode === 'wireframe' ? '#F0F7FF' : 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 4,
                fontSize: 14,
                color: viewMode === 'wireframe' ? '#4F6EF7' : 'inherit',
              }}
              onMouseEnter={(e) => {
                if (viewMode !== 'wireframe') e.currentTarget.style.background = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  viewMode === 'wireframe' ? '#F0F7FF' : 'transparent';
              }}
            >
              <Box size={16} />
              Wireframe view
            </button>
            <button
              type="button"
              onClick={() => setViewMode((m) => (m === 'flow' ? 'normal' : 'flow'))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                background: viewMode === 'flow' ? '#F0F7FF' : 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 4,
                fontSize: 14,
                color: viewMode === 'flow' ? '#4F6EF7' : 'inherit',
              }}
              onMouseEnter={(e) => {
                if (viewMode !== 'flow') e.currentTarget.style.background = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  viewMode === 'flow' ? '#F0F7FF' : 'transparent';
              }}
            >
              <LayoutGrid size={16} />
              Flow view
            </button>
            <div
              style={{
                height: 1,
                background: '#e0e0e0',
                margin: '4px 0',
              }}
            />
            <button
              type="button"
              onClick={() => handleSelect('/')}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Production
            </button>
            {PROTOTYPES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.path)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  background: location.pathname === p.path ? '#F0F7FF' : 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: 4,
                  color: location.pathname === p.path ? '#4F6EF7' : 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== p.path) e.currentTarget.style.background = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    location.pathname === p.path ? '#F0F7FF' : 'transparent';
                }}
              >
                {p.title}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Switch prototype"
        title="Switch prototype concept"
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '1px solid #e0e0e0',
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          color: '#4F6EF7',
        }}
      >
        <Squirrel size={24} />
      </button>
    </div>
  );
}
