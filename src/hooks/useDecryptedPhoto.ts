import { useEffect, useState } from 'react'
import { decryptFromBase64 } from '../lib/crypto'

// Decrypting is per-row work (AdminUsers/AdminPlayers/AuctionSetup all list
// many users at once), so cache by ciphertext to avoid re-decrypting the same
// photo on every re-render or when it appears in more than one list.
const cache = new Map<string, Promise<string>>()

export function useDecryptedPhoto(encryptedPhoto: string | null | undefined) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!encryptedPhoto) {
      setDataUrl(null)
      return
    }
    let cancelled = false
    let promise = cache.get(encryptedPhoto)
    if (!promise) {
      promise = decryptFromBase64(encryptedPhoto)
      cache.set(encryptedPhoto, promise)
    }
    promise
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        cache.delete(encryptedPhoto)
        if (!cancelled) setDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [encryptedPhoto])

  return dataUrl
}
