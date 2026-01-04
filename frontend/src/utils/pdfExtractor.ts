/**
 * Utility functions for extracting PDFs from ZIP files in the browser
 */

import JSZip from 'jszip';

/**
 * Extract a specific PDF file from a ZIP archive
 *
 * @param zipFile - The ZIP file object
 * @param pdfFileName - Name of the PDF file to extract (e.g., "HYDERABAD/BABY OF X.pdf")
 * @returns Blob URL for the extracted PDF, or null if not found/error
 */
export async function extractPDFFromZip(
  zipFile: File | null,
  pdfFileName: string
): Promise<string | null> {
  if (!zipFile) {
    console.error('No ZIP file provided');
    return null;
  }

  try {
    // Load the ZIP file
    const zip = await JSZip.loadAsync(zipFile);

    // Try to find the PDF file (case-insensitive search)
    let pdfFile = zip.file(pdfFileName);

    // If not found with exact name, try searching all files
    if (!pdfFile) {
      const allFiles = Object.keys(zip.files);
      const normalizedFileName = pdfFileName.toLowerCase().replace(/\\/g, '/');

      // Search for matching file (case-insensitive, handle both / and \ separators)
      const matchingFileName = allFiles.find(name =>
        name.toLowerCase().replace(/\\/g, '/') === normalizedFileName
      );

      if (matchingFileName) {
        pdfFile = zip.file(matchingFileName);
      }
    }

    if (!pdfFile) {
      console.error(`PDF file not found in ZIP: ${pdfFileName}`);
      return null;
    }

    // Extract the PDF as a Blob with proper MIME type
    const pdfArrayBuffer = await pdfFile.async('arraybuffer');

    // Create a blob with explicit PDF MIME type
    const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

    // Create a blob URL that can be used in an iframe or opened in a new tab
    const blobUrl = URL.createObjectURL(pdfBlob);

    return blobUrl;

  } catch (error) {
    console.error('Error extracting PDF from ZIP:', error);
    return null;
  }
}

/**
 * Clean up a blob URL to free memory
 *
 * @param blobUrl - The blob URL to revoke
 */
export function revokeBlobURL(blobUrl: string): void {
  try {
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Error revoking blob URL:', error);
  }
}
