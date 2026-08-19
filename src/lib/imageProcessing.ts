// Downscales and re-encodes an uploaded image client-side before storing it,
// keeping it well under Firestore's 1MB document limit. Defaults suit small
// avatar-sized images (profile photos, team logos) — a 256x256 JPEG at
// quality 0.7 is typically 10-30KB. Callers that render the image much
// larger (e.g. a venue photo used as a full-page backdrop) should pass a
// bigger maxDimension/quality; see AdminVenues.tsx.
const DEFAULT_MAX_DIMENSION_PX = 256
const DEFAULT_JPEG_QUALITY = 0.7

export async function compressImageToDataUrl(
  file: Blob,
  options?: { maxDimension?: number; quality?: number },
): Promise<string> {
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION_PX
  const quality = options?.quality ?? DEFAULT_JPEG_QUALITY
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Image compression is not supported in this browser.')
    ctx.drawImage(bitmap, 0, 0, width, height)

    return await new Promise<string>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image.'))
            return
          }
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(reader.error ?? new Error('Failed to read compressed image.'))
          reader.readAsDataURL(blob)
        },
        'image/jpeg',
        quality,
      )
    })
  } finally {
    bitmap.close()
  }
}
