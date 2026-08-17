import { useState } from 'react'
import { Layout } from '../components/Layout'
import { FilenUpload } from '../components/FilenUpload'
import { FilenFileList } from '../components/FilenFileList'
import { usePageTitle } from '../hooks/usePageTitle'

// Admin-only sanity check for the Filen storage proxy (server/) — store a
// file, list it back, view/download it, delete it. Not part of any real
// feature; exists to verify the pipeline end-to-end before wiring Filen into
// an actual part of the app.
export function FilenTest() {
  usePageTitle('Filen test')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <Layout>
      <div className="mx-auto max-w-xl space-y-6 rounded-xl border border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md p-8 shadow-xl">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Filen storage test</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Uploads go through the proxy at{' '}
            <code className="rounded bg-gray-100 dark:bg-gray-800 px-1 py-0.5 text-xs">
              {import.meta.env.VITE_FILEN_PROXY_URL || '(VITE_FILEN_PROXY_URL not set)'}
            </code>{' '}
            and are stored on Filen. Nothing here is wired into any real feature yet.
          </p>
        </div>

        <FilenUpload onUploaded={() => setRefreshKey((k) => k + 1)} />

        <div>
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Files</h2>
          <div className="mt-2">
            <FilenFileList refreshKey={refreshKey} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
