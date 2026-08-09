import { useEffect, useState } from 'react'
import { decryptFromBase64, encryptToBase64 } from '../lib/crypto'
import { compressImageToDataUrl } from '../lib/imageProcessing'
import { updateOwnAvatar, updateOwnProfilePhoto } from '../lib/users'
import { getDefaultAvatar } from '../lib/avatars'
import { AvatarPicker } from './AvatarPicker'

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export function ProfilePhotoUpload({
  uid,
  encryptedPhoto,
  avatarId,
}: {
  uid: string
  encryptedPhoto: string | null | undefined
  avatarId: string | null | undefined
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [decrypting, setDecrypting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preset = getDefaultAvatar(avatarId)

  useEffect(() => {
    if (!encryptedPhoto) {
      setPreviewUrl(null)
      return
    }
    let cancelled = false
    setDecrypting(true)
    decryptFromBase64(encryptedPhoto)
      .then((dataUrl) => {
        if (!cancelled) setPreviewUrl(dataUrl)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load photo')
      })
      .finally(() => {
        if (!cancelled) setDecrypting(false)
      })
    return () => {
      cancelled = true
    }
  }, [encryptedPhoto])

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
      setError('Image is too large — choose a photo under 8MB.')
      return
    }

    setSaving(true)
    try {
      const dataUrl = await compressImageToDataUrl(file)
      const encrypted = await encryptToBase64(dataUrl)
      await updateOwnProfilePhoto(uid, encrypted)
      setPreviewUrl(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save photo')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setSaving(true)
    setError(null)
    try {
      await updateOwnProfilePhoto(uid, null)
      setPreviewUrl(null)
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
      setPreviewUrl(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set avatar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile photo</label>
      <div className="mt-1 flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-400">
          {decrypting ? (
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
            {saving ? 'Saving...' : previewUrl ? 'Change photo' : 'Upload photo'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={saving}
              className="hidden"
            />
          </label>
          {(previewUrl || preset) && !saving && (
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
          disabled={saving}
        />
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
