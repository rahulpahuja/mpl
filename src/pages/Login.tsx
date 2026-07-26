import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithGoogle } from '../lib/auth'

export function Login() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    setLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md p-8 shadow-xl shadow-red-950/5 dark:shadow-black/40 ring-1 ring-black/5">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Sign in</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Sign in with Google to get an account. An Admin then assigns you as a Team Manager or
          Auction Manager — you don't need an account at all just to watch as a Viewer.
        </p>
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 border-t border-gray-200 dark:border-gray-800 pt-4 text-center">
          <a href="/join" className="text-sm text-red-600 dark:text-red-400 hover:underline">
            Join an auction as a viewer instead
          </a>
        </div>
      </div>
    </div>
  )
}
