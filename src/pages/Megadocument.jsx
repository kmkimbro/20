import ProjectHome from './ProjectHome.jsx';

/**
 * Megadocument: same onboarding + document-connection experience as DES 36 — Document connection
 * (project browser, PRD flow, doc↔doc links, connection graph). Uses its own localStorage key.
 */
export default function Megadocument() {
  return (
    <ProjectHome
      allowDeleteProjectsAndDocuments
      prdOnboarding
      storageKey="megadocument_des36"
      documentConnectionSandbox
      documentConnectionShowSandboxBanner={false}
      showPartsSidebarSection={false}
      showDocumentCardFooter={false}
      showDocumentLinksInSidebar={false}
    />
  );
}
