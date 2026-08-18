export type UploadFile = {
  blob: Blob
  filename: string
}

/** FormData upload for iOS Safari: append Blob with filename, not synthetic File. */
export function buildUploadForm(file: File | UploadFile): FormData {
  const blob = file instanceof File ? file : file.blob
  const filename =
    (file instanceof File ? file.name : file.filename) || 'photo.jpg'
  const fd = new FormData()
  fd.append('file', blob, filename)
  return fd
}
