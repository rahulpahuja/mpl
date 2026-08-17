import { useEffect, useState } from 'react'
import { deleteFilenFile, downloadFilenFile, listFilenFiles, type FilenFile } from '../lib/filen'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Bump this from a parent (e.g. after a successful upload) to force a re-fetch.
export function FilenFileList({ refreshKey = 0 }: { refreshKey?: number }) {
  const [files, setFiles] = useState<FilenFile[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    listFilenFiles()
      .then((f) => {
        if (!cancelled) setFiles(f)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load files')
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  async function handleView(file: FilenFile) {
    setBusyId(file.id)
    setError(null)
    try {
      const blob = await downloadFilenFile(file.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      // The new tab has its own reference to the blob by the time it opens;
      // revoking shortly after avoids leaking the object URL without racing
      // the tab's initial load.
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(file: FilenFile) {
    if (!confirm(`Delete "${file.name}"? This moves it to Filen's trash.`)) return
    setBusyId(file.id)
    setError(null)
    try {
      await deleteFilenFile(file.id)
      setFiles((prev) => prev?.filter((f) => f.id !== file.id) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file')
    } finally {
      setBusyId(null)
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!files) return <p className="text-sm text-gray-500">Loading...</p>
  if (files.length === 0) return <p className="text-sm text-gray-500">No files uploaded yet.</p>

  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
      {files.map((file) => (
        <li key={file.id} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
            <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={() => handleView(file)}
              disabled={busyId === file.id}
              className="text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
            >
              View
            </button>
            <button
              onClick={() => handleDelete(file)}
              disabled={busyId === file.id}
              className="text-gray-500 dark:text-gray-400 hover:underline disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
