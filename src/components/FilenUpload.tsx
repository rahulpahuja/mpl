import { useState } from 'react'
import { uploadToFilen, type FilenFile } from '../lib/filen'

export function FilenUpload({ onUploaded }: { onUploaded: (file: FilenFile) => void }) {
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError(null)
    setProgress(0)
    try {
      const uploaded = await uploadToFilen(file, setProgress)
      onUploaded(uploaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setProgress(null)
    }
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
        {progress === null ? 'Upload file' : `Uploading... ${Math.round(progress * 100)}%`}
        <input
          type="file"
          onChange={handleFileChange}
          disabled={progress !== null}
          className="hidden"
        />
      </label>
      {progress !== null && (
        <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full bg-red-600 transition-[width]"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
