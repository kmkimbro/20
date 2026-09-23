import ProjectHome from './ProjectHome.jsx';

/** Isolated save slot for Assembly Map (separate from DES 57 Procedures). */
export const ASSEMBLY_MAP_STORAGE_KEY = 'assembly_map';

/** Document editor route for this prototype. */
export const ASSEMBLY_MAP_EDITOR_PATH = '/prototype/assembly-map-editor';

/**
 * Assembly Map — forked from DES 57 Procedures V1 as a starting point for assembly-mapping work.
 * Uses its own storage and editor routes; not linked to DES 57 saved state.
 */
export default function AssemblyMap() {
  return (
    <ProjectHome
      allowDeleteProjectsAndDocuments
      prdOnboarding
      storageKey={ASSEMBLY_MAP_STORAGE_KEY}
      editorPrototypePath={ASSEMBLY_MAP_EDITOR_PATH}
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
      procedureStorageKey={ASSEMBLY_MAP_STORAGE_KEY}
      documentPackagesEnabled={false}
      documentCardLinkedCaption
      documentCardShowStatusTag={false}
      newProjectButtonPlacement="bottom"
      showDocumentsUnderProjectInSidebar
      toolLibraryUsedInStyle="count-list"
    />
  );
}
