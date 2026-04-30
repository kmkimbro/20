import ProjectHome from './ProjectHome.jsx';

/**
 * DES 36 — Document connection: fork of the project/document browser for exploring
 * how documents link to each other (separate localStorage from other DES 36 routes).
 */
export default function Des36DocumentConnection() {
  return (
    <ProjectHome
      allowDeleteProjectsAndDocuments
      prdOnboarding
      storageKey="des36_document_connection"
      documentConnectionSandbox
    />
  );
}
