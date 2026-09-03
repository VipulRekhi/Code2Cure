/**
 * Medical Document Intake Service Abstraction (Section 31 & 40)
 * Prepares the boundary for Phase 6 (PaddleOCR & Qwen2.5 Entity Extraction).
 */

class DocumentService {
  async processDocument(fileInfo, onProgress) {
    // Stage 1: Reading document
    onProgress('readingDoc');
    await new Promise((r) => setTimeout(r, 800));

    // Stage 2: Extracting information
    onProgress('extractingDoc');
    await new Promise((r) => setTimeout(r, 900));

    // Stage 3: Organizing for doctor review
    onProgress('organizingDoc');
    await new Promise((r) => setTimeout(r, 600));

    return {
      id: `doc-${Date.now()}`,
      name: fileInfo.name || 'Scanned_Document.pdf',
      type: fileInfo.type || 'PRESCRIPTION',
      fileSizeBytes: fileInfo.size || 1500000,
      mimeType: fileInfo.type === 'image' ? 'image/jpeg' : 'application/pdf',
      simulatedSummary: 'Identified Active Medications & Clinical Tests (Simulated Draft)',
      isDemoData: true,
    };
  }
}

export const documentService = new DocumentService();
