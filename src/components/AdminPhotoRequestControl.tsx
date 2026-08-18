import { useState } from 'react'
import { compressImageToDataUrl } from '../lib/imageProcessing'
import { uploadToFilen } from '../lib/filen'
import { requestProfilePhotoChange } from '../lib/users'
import {
  MAX_UPLOAD_BYTES,
  PROFILE_PHOTO_JPEG_QUALITY,
  PROFILE_PHOTO_MAX_DIMENSION_PX,
  bytesToMB,
} from '../lib/photoUpload'
import type { AppUser } from '../types'

// Lets an Admin/Auction Manager propose a replacement photo for someone
// else, from UserDetailModal. Never writes the live photo directly — it
// uploads to Filen (same pipeline as self-service ProfilePhotoUpload) and
// hands the resulting id to requestProfilePhotoChange, which only the target
// can turn into their real photo by approving it (see PhotoApprovalPrompt).
export function AdminPhotoRequestControl({
  targetUser,
  requestedBy,
}: {
  targetUser: AppUser
  requestedBy: AppUser
}) {
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pending = targetUser.pendingPhotoRequest?.status === 'pending' ? targetUser.pendingPhotoRequest : null

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Image is too large (${bytesToMB(file.size)}MB) — choose a photo under 25MB.`)
      return
    }

    setProgress(0)
    try {
      const dataUrl = await compressImageToDataUrl(file, {
        maxDimension: PROFILE_PHOTO_MAX_DIMENSION_PX,
        quality: PROFILE_PHOTO_JPEG_QUALITY,
      })
      const compressedFile = await (await fetch(dataUrl)).blob().then(
        (blob) => new File([blob], file.name, { type: blob.type }),
      )
      const uploaded = await uploadToFilen(compressedFile, setProgress)
      await requestProfilePhotoChange(targetUser.uid, uploaded.id, requestedBy.uid, requestedBy.displayName)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send photo')
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Replace profile photo</p>
      {pending ? (
        <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
          Waiting for {targetUser.displayName} to approve the photo you sent...
        </p>
      ) : (
        <label className="mt-1 inline-block cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 hover:underline">
          {progress !== null ? `Uploading... ${Math.round(progress * 100)}%` : 'Send a new photo for approval'}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={progress !== null}
            className="hidden"
          />
        </label>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
