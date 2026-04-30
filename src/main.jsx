import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PrototypeProvider from './contexts/PrototypeProvider.jsx';
import ViewModeProvider, { ViewModeRoot } from './contexts/ViewModeContext.jsx';
import PrototypeWrapper from './PrototypeWrapper.jsx';
import PrototypeGallery from './pages/PrototypeGallery.jsx';
import ProjectHome from './pages/ProjectHome.jsx';
import Des36DocumentConnection from './pages/Des36DocumentConnection.jsx';
import Megadocument from './pages/Megadocument.jsx';
import Megadocument2 from './pages/Megadocument2.jsx';
import MegadocumentEmptyState from './pages/MegadocumentEmptyState.jsx';
import App from './App.jsx';
import '../styles.css';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  render() {
    if (this.state.error) {
      const msg = String(this.state.error?.stack || this.state.error);
      return (
        <div style={{
          minHeight: '100vh',
          padding: 24,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#fff',
          color: '#111',
        }}
        >
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>This page hit a JavaScript error</h1>
          <p style={{ color: '#444', marginBottom: 16, lineHeight: 1.5, maxWidth: 640 }}>
            Try clearing site data for this origin and reload (Application → Local Storage → remove
            {' '}
            <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>des36_state</code>
            ). If the problem persists, share the stack trace below.
          </p>
          <pre style={{
            fontSize: 12,
            overflow: 'auto',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            padding: 12,
            maxHeight: '55vh',
          }}
          >
            {msg}
          </pre>
          <button
            type="button"
            style={{ marginTop: 16, padding: '8px 14px', cursor: 'pointer', borderRadius: 8, border: '1px solid #ccc', background: '#fff' }}
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Missing #root element in index.html');
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <ViewModeProvider>
        <ViewModeRoot>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<PrototypeProvider conceptId={null}><App /></PrototypeProvider>} />
              <Route path="/prototype" element={<PrototypeGallery />} />
              <Route path="/prototype/des-36" element={<ProjectHome allowDeleteProjectsAndDocuments prdOnboarding />} />
              <Route
                path="/prototype/des-36-v2"
                element={(
                <ProjectHome
                  allowDeleteProjectsAndDocuments
                  prdOnboarding
                  projectConnectionGraph
                />
                )}
              />
              <Route path="/prototype/des-36-document-connection" element={<Des36DocumentConnection />} />
              <Route path="/prototype/megadocument" element={<Megadocument />} />
              <Route path="/prototype/megadocument-2" element={<Megadocument2 />} />
              <Route path="/prototype/megadocument-empty" element={<MegadocumentEmptyState />} />
              <Route path="/prototype/tool-library-mid-fi" element={<ProjectHome editorPrototypePath="/prototype/tool-library-mid-fi-editor" />} />
              <Route path="/prototype/:conceptId" element={<PrototypeWrapper />} />
            </Routes>
          </BrowserRouter>
        </ViewModeRoot>
      </ViewModeProvider>
    </RootErrorBoundary>
  </React.StrictMode>,
);
