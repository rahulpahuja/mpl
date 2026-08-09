// Downscales and re-encodes an uploaded image client-side before it's
// encrypted and stored on the user doc — keeps it well under Firestore's 1MB
// document limit (a 256x256 JPEG at quality 0.7 is typically 10-30KB).
const MAX_DIMENSION_PX = 256
const JPEG_QUALITY = 0.7

export async function compressImageToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(bitmap.width, bitmap.height))
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
        JPEG_QUALITY,
      )
    })
  } finally {
    bitmap.close()
  }
}
