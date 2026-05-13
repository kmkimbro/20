import ProjectHome from './ProjectHome.jsx';

/** Isolated save slot for DES 57 Procedures V1. */
export const DES57_PROCEDURES_V1_STORAGE_KEY = 'des57_procedures_v1';

/** Document editor route for this prototype (keeps return links in DES 57, not des-combined-3). */
export const DES57_PROCEDURES_V1_EDITOR_PATH = '/prototype/des-57-procedures-v1-editor';

/**
 * DES 57 Procedures V1 — cloned from DES 36 MVP as a starting point for procedures work.
 * Starts empty and keeps all saved prototype data isolated from DES 36 MVP.
 */
export default function Des57ProceduresV1() {
  return (
    <ProjectHome
      allowDeleteProjectsAndDocuments
      prdOnboarding
      storageKey={DES57_PROCEDURES_V1_STORAGE_KEY}
      editorPrototypePath={DES57_PROCEDURES_V1_EDITOR_PATH}
      editorDefaultNav="doc"
      initialView="procedure-library"
      megadocumentEmptyState
      seedStarterProjectDocument
      seedProcedureLibraryMockData
      documentConnectionSandbox
      documentConnectionShowSandboxBanner={false}
      showDocumentConnectionSampleCta={false}
      showPartsSidebarSection={false}
      showDocumentCardFooter={false}
      showDocumentLinksInSidebar={false}
      showReusableProceduresInSidebar={false}
      showProcedureLibraryInSidebar
      showPartsLibraryInSidebar={false}
      procedureStorageKey={DES57_PROCEDURES_V1_STORAGE_KEY}
      documentPackagesEnabled={false}
      documentCardLinkedCaption
      documentCardShowStatusTag={false}
      newProjectButtonPlacement="bottom"
      showDocumentsUnderProjectInSidebar
      toolLibraryUsedInStyle="count-list"
    />
  );
}
