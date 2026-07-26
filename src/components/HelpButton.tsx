import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { HelpModal } from './HelpModal'

export function HelpButton() {
  const [open, setOpen] = useState(false)
  const user = useAuthStore((s) => s.user)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Help"
        title="Help"
        className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-lg font-semibold text-white shadow-lg hover:bg-red-700"
      >
        ?
      </button>
      {open && (
        <HelpModal onClose={() => setOpen(false)} defaultSection={user?.role ?? 'overview'} />
      )}
    </>
  )
}
