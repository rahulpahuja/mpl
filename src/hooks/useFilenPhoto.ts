import { useEffect, useState } from 'react'
import { downloadFilenFile } from '../lib/filen'

// Same caching rationale as useDecryptedPhoto — avatars using the same photo
// show up in multiple lists (AdminUsers, AdminPlayers, AuctionSetup search,
// team rosters, ...), so cache by id to avoid re-fetching through the proxy
// on every render. Object URLs are deliberately never revoked, same
// lifetime-of-the-session tradeoff useDecryptedPhoto already makes for data
// URLs — fine at this app's scale (a bounded number of distinct photos per
// session), not fine at a much larger one.
const cache = new Map<string, Promise<string>>()

export function useFilenPhoto(filenPhotoId: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!filenPhotoId) {
      setUrl(null)
      return
    }
    let cancelled = false
    let promise = cache.get(filenPhotoId)
    if (!promise) {
      promise = downloadFilenFile(filenPhotoId).then((blob) => URL.createObjectURL(blob))
      cache.set(filenPhotoId, promise)
    }
    promise
      .then((objectUrl) => {
        if (!cancelled) setUrl(objectUrl)
      })
      .catch(() => {
        cache.delete(filenPhotoId)
        if (!cancelled) setUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [filenPhotoId])

  return url
}
