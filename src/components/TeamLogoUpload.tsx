import { useState } from 'react'
import { compressImageToDataUrl } from '../lib/imageProcessing'
import { updateTeamLogoImage } from '../lib/teams'
import { TeamAvatar } from './TeamAvatar'

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

// Only usable once a team exists (needs a teamId to write to) — for the
// create-team form, upload happens as a follow-up edit after creation.
export function TeamLogoUpload({
  teamId,
  teamName,
  logoImage,
  onChange,
}: {
  teamId: string
  teamName: string
  logoImage?: string | null
  onChange?: (logoImage: string | null) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setError('Image is too large — choose a logo under 8MB.')
      return
    }

    setSaving(true)
    try {
      const dataUrl = await compressImageToDataUrl(file)
      await updateTeamLogoImage(teamId, dataUrl)
      onChange?.(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save logo')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setSaving(true)
    setError(null)
    try {
      await updateTeamLogoImage(teamId, null)
      onChange?.(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove logo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <TeamAvatar teamName={teamName} logoImage={logoImage} size={12} />
      <div className="flex flex-col items-start gap-1">
        <label className="cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 hover:underline">
          {saving ? 'Saving...' : logoImage ? 'Change logo' : 'Upload logo'}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={saving}
            className="hidden"
          />
        </label>
        {logoImage && !saving && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
          >
            Remove
          </button>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}
