import ProjectHome from './ProjectHome.jsx';

/** Isolated save slot for the empty-state walkthrough (first visit has no seeded content). */
export const MEGADOCUMENT_EMPTY_STORAGE_KEY = 'megadocument_empty_des36';

/**
 * First-login style shell: no projects, document packages, plugins (except after user connects one),
 * tool library rows, reusable procedures, or parts data until the user adds or imports something.
 * Each area uses the same rail + empty / upload patterns as the rest of the megadocument flow.
 */
export default function MegadocumentEmptyState() {
  return (
    <ProjectHome
      allowDeleteProjectsAndDocuments
      prdOnboarding
      storageKey={MEGADOCUMENT_EMPTY_STORAGE_KEY}
      megadocumentEmptyState
      documentConnectionSandbox
      documentConnectionShowSandboxBanner={false}
      showDocumentCardFooter={false}
      showDocumentLinksInSidebar={false}
      mergedPackageNavigation="toc-hub"
      mergedDocumentsSectionTitle="Document Packages"
    />
  );
}
