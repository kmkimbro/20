import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PrototypeProvider from './contexts/PrototypeProvider.jsx';
import ViewModeProvider, { ViewModeRoot } from './contexts/ViewModeContext.jsx';
import Des57ProceduresV1 from './pages/Des57ProceduresV1.jsx';
import App from './App.jsx';
import '../styles.css';

const DES57_HOME = '/prototype/des-57-procedures-v1';

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
            Try clearing site data for this origin and reload (Application → Local Storage).
            If the problem persists, share the stack trace below.
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
              <Route path="/" element={<Navigate to={DES57_HOME} replace />} />
              <Route path="/prototype" element={<Navigate to={DES57_HOME} replace />} />
              <Route path={DES57_HOME} element={<Des57ProceduresV1 />} />
              <Route
                path="/prototype/des-57-procedures-v1-editor"
                element={(
                  <PrototypeProvider conceptId="des-57-procedures-v1-editor">
                    <App />
                  </PrototypeProvider>
                )}
              />
              <Route path="*" element={<Navigate to={DES57_HOME} replace />} />
            </Routes>
          </BrowserRouter>
        </ViewModeRoot>
      </ViewModeProvider>
    </RootErrorBoundary>
  </React.StrictMode>,
);
