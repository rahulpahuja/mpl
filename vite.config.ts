import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Firebase's signInWithPopup polls window.closed on the popup to detect completion.
// Without this header, Chrome's COOP blocks that poll and the sign-in hangs silently.
const coopHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { headers: coopHeaders },
  preview: { headers: coopHeaders },
})
