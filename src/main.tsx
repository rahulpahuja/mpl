import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const

const missing = requiredEnvVars.filter((key) => !import.meta.env[key])

const root = createRoot(document.getElementById('root')!)

if (missing.length > 0) {
  const { FirebaseSetupNotice } = await import('./pages/FirebaseSetupNotice.tsx')
  root.render(
    <StrictMode>
      <FirebaseSetupNotice missing={missing} />
    </StrictMode>,
  )
} else {
  const { default: App } = await import('./App.tsx')
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
