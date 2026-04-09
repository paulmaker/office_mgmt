/**
 * Open a file stored as an S3 key (via /api/files/...), absolute URL, or legacy data: URL.
 * Client-only; matches behaviour in PDFUpload / receipt uploads.
 */
export function openStoredFileUrl(value: string) {
  if (!value) return
  if (value.startsWith('data:') || value.startsWith('http')) {
    window.open(value, '_blank')
    return
  }
  window.open(`/api/files/${value}`, '_blank')
}
