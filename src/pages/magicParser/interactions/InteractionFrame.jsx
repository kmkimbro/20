import Header from '../../../components/Header.jsx';

export default function InteractionFrame({
  doc,
  banner,
  tree,
  aside = null,
  onBack,
  children,
  showCadNav = false,
  navActive = 'doc',
  onNavChange,
  cad = null,
  stageHeader = null,
}) {
  return (
    <div className="lb-app ai-doc">
      <Header
        navActive={navActive}
        onNavChange={onNavChange}
        onBack={onBack}
        hideCadNav={!showCadNav}
      />
      {banner ? (
        <div className="mp-banner">
          <span>{banner}</span>
        </div>
      ) : null}
      {showCadNav && navActive === 'cad' ? (
        <div className="ai-cad-host">{cad}</div>
      ) : (
      <div className="lb-doc">
        {tree ? (
          <aside className="lb-doc-tree">
            <div className="lb-tree-title">{doc.name}</div>
            {tree}
          </aside>
        ) : null}
        <div className="lb-doc-stage">
          {stageHeader}
          <div className="lb-doc-canvas">
            {children}
          </div>
        </div>
        {aside}
      </div>
      )}
    </div>
  );
}
