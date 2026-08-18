import { useState } from 'react'
import { useDecryptedPhoto } from '../hooks/useDecryptedPhoto'
import { useFilenPhoto } from '../hooks/useFilenPhoto'
import { compressImageToDataUrl } from '../lib/imageProcessing'
import { uploadToFilen } from '../lib/filen'
import { updateOwnAvatar, updateOwnProfilePhoto } from '../lib/users'
import { getDefaultAvatar } from '../lib/avatars'
import {
  MAX_UPLOAD_BYTES,
  PROFILE_PHOTO_JPEG_QUALITY,
  PROFILE_PHOTO_MAX_DIMENSION_PX,
  bytesToMB,
} from '../lib/photoUpload'
import { AvatarPicker } from './AvatarPicker'

export function ProfilePhotoUpload({
  uid,
  filenPhotoId,
  encryptedPhoto,
  avatarId,
}: {
  uid: string
  filenPhotoId: string | null | undefined
  encryptedPhoto: string | null | undefined
  avatarId: string | null | undefined
}) {
  const filenPhoto = useFilenPhoto(filenPhotoId)
  // Legacy fallback — accounts that haven't re-uploaded since the Filen
  // migration still have their old photo here instead.
  const legacyPhoto = useDecryptedPhoto(filenPhotoId ? null : encryptedPhoto)
  const previewUrl = filenPhoto ?? legacyPhoto
  const loadingPreview = Boolean((filenPhotoId && !filenPhoto) || (!filenPhotoId && encryptedPhoto && !legacyPhoto))

  const [progress, setProgress] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preset = getDefaultAvatar(avatarId)

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
      await updateOwnProfilePhoto(uid, uploaded.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save photo')
    } finally {
      setProgress(null)
    }
  }

  async function handleRemove() {
    setSaving(true)
    setError(null)
    try {
      await updateOwnProfilePhoto(uid, null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove photo')
    } finally {
      setSaving(false)
    }
  }

  async function handleSelectAvatar(id: string) {
    setSaving(true)
    setError(null)
    try {
      await updateOwnAvatar(uid, id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set avatar')
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || progress !== null

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile photo</label>
      <div className="mt-1 flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-400">
          {loadingPreview ? (
            'Loading...'
          ) : previewUrl ? (
            <img src={previewUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : preset ? (
            <div className={`flex h-full w-full items-center justify-center text-2xl ${preset.bg}`}>
              {preset.emoji}
            </div>
          ) : (
            'No photo'
          )}
        </div>
        <div className="flex flex-col items-start gap-1">
          <label className="cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 hover:underline">
            {progress !== null
              ? `Uploading... ${Math.round(progress * 100)}%`
              : previewUrl
                ? 'Change photo'
                : 'Upload photo'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={busy}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-400 dark:text-gray-500">Max 25MB</p>
          {(previewUrl || preset) && !busy && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Not ready to upload your own photo? Pick an avatar instead:
      </p>
      <div className="mt-1.5">
        <AvatarPicker
          selectedId={previewUrl ? null : preset?.id}
          onSelect={handleSelectAvatar}
          disabled={busy}
        />
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
