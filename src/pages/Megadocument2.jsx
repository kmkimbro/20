import ProjectHome from './ProjectHome.jsx';

/** Persisted state key for this prototype (isolated from Megadocument v1). */
export const MEGADOCUMENT2_STORAGE_KEY = 'megadocument2_des36';

/**
 * Megadocument 2 — CEO / folder model: merged packages are listed under their owning
 * project in the left rail (not a separate section). Selecting a package shows a TOC
 * of members in the main area. Each member opens in the normal editor. No combined mega-editor.
 */
export default function Megadocument2() {
  return (
    <ProjectHome
      allowDeleteProjectsAndDocuments
      prdOnboarding
      storageKey={MEGADOCUMENT2_STORAGE_KEY}
      toolLibraryUsedInDesignReview
      documentConnectionSandbox
      documentConnectionShowSandboxBanner={false}
      showPartsSidebarSection={false}
      showDocumentCardFooter={false}
      showDocumentLinksInSidebar={false}
      mergedPackageNavigation="toc-hub"
      mergedDocumentsSectionTitle="Document Packages"
    />
  );
}
