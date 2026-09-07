import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Avatar } from '../components/Avatar'
import { AuctionHistory } from '../components/AuctionHistory'
import { CareerStats } from '../components/CareerStats'
import { ProfileForm } from '../components/ProfileForm'
import { ProfilePhotoUpload } from '../components/ProfilePhotoUpload'
import { useKeyboardShortcutsEnabled } from '../hooks/useKeyboardShortcutsEnabled'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePlayerStats } from '../hooks/usePlayerStats'
import { ensureUserCode } from '../lib/auth'
import { strikeRate } from '../lib/matchFormat'
import { BATTING_TYPE_LABELS } from '../lib/battingTypes'
import { BOWLING_TYPE_LABELS } from '../lib/bowlingTypes'
import { PLAYING_ROLE_LABELS } from '../lib/playingRoles'
import { updateOwnProfile } from '../lib/users'
import { useAuthStore } from '../store/authStore'
import type { Handedness } from '../types'

const ACCOUNT_ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  auctionManager: 'Auction Manager',
  manager: 'Captain',
  player: 'Player',
  viewer: 'Viewer',
}

function handednessLabel(h: Handedness | undefined, arm: boolean): string | null {
  if (!h) return null
  if (arm) return h === 'right' ? 'Right-Arm' : 'Left-Arm'
  return h === 'right' ? 'Right-Handed' : 'Left-Handed'
}

function Attribute({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'orange'
}) {
  const set = value !== 'Not set'
  return (
    <div className="aa-tile">
      <p className="aa-label">{label}</p>
      <p
        className={`mt-1 text-[15px] font-semibold ${
          !set ? 'aa-muted font-normal' : accent === 'orange' ? 'aa-orange-text' : ''
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: 'orange' | 'mint'
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
      <span
        className={`aa-numeric text-2xl ${
          accent === 'orange' ? 'aa-orange-text' : accent === 'mint' ? 'aa-mint-text' : ''
        }`}
      >
        {value}
      </span>
      <span className="aa-label">{label}</span>
    </div>
  )
}

export function Profile() {
  usePageTitle('Your Profile')
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)
  const [shortcutsEnabled, setShortcutsEnabled] = useKeyboardShortcutsEnabled()
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const { stats } = usePlayerStats(user?.uid)

  // Accounts created before the userCode feature shipped won't have one —
  // assign it lazily here instead of requiring the admin backfill script.
  useEffect(() => {
    if (user && !user.userCode) {
      ensureUserCode(user.uid).catch((err) => console.error('Failed to assign user code', err))
    }
  }, [user])

  if (initializing) {
    return (
      <Layout>
        <p className="text-gray-500">Loading...</p>
      </Layout>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const specialismLabel = user.playingRole ? PLAYING_ROLE_LABELS[user.playingRole] : null
  const battingStyle = [
    handednessLabel(user.battingHandedness, false),
    user.battingType ? BATTING_TYPE_LABELS[user.battingType] : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const bowlingStyle = [
    handednessLabel(user.bowlingHandedness, true),
    user.bowlingType ? BOWLING_TYPE_LABELS[user.bowlingType] : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const sr =
    stats && stats.batting.balls > 0 ? strikeRate(stats.batting.runs, stats.batting.balls) : null
  const whatsappDigits = (user.whatsapp || user.phone || '').replace(/[^\d]/g, '')

  async function copyEmail() {
    if (!user) return
    try {
      await navigator.clipboard.writeText(user.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable (insecure context / permissions) — no-op.
    }
  }

  return (
    <Layout>
      <div className="apex-arena mx-auto max-w-3xl">
        <div className="aa-shell">
          <div className="relative flex flex-wrap items-start gap-4 border-b p-5 sm:p-6">
            {user.jerseyNumber != null && (
              <span
                aria-hidden="true"
                className="aa-numeric aa-watermark pointer-events-none absolute right-4 top-1 select-none text-6xl"
              >
                #{user.jerseyNumber}
              </span>
            )}
            <div className="shrink-0 rounded-xl border-2 border-[#ea580c] p-0.5">
              <Avatar
                name={user.displayName}
                filenPhotoId={user.filenPhotoId}
                encryptedPhoto={user.encryptedPhoto}
                photoURL={user.photoURL}
                avatarId={user.avatarId}
                shape="square"
                size={16}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="aa-head text-2xl">{user.displayName}</h1>
                <span className="aa-chip aa-chip-mint">{ACCOUNT_ROLE_LABELS[user.role]}</span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm aa-dim">
                {specialismLabel && <span className="aa-orange-text">{specialismLabel}</span>}
                {user.userCode && (
                  <>
                    {specialismLabel && <span className="aa-muted">·</span>}
                    <span>
                      User ID: <span className="aa-numeric" style={{ color: '#f9fafb' }}>{user.userCode}</span>
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="aa-card p-4">
                <p className="aa-label flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    mail
                  </span>
                  Email address
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{user.email}</span>
                  <button
                    type="button"
                    onClick={copyEmail}
                    aria-label="Copy email address"
                    className="material-symbols-outlined aa-muted shrink-0 text-[18px] hover:text-white"
                  >
                    {copied ? 'check' : 'content_copy'}
                  </button>
                </div>
              </div>
              <div className="aa-card p-4">
                <p className="aa-label flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    chat
                  </span>
                  Phone &amp; WhatsApp
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="aa-numeric text-sm">{user.phone || '—'}</span>
                  {whatsappDigits && (
                    <a
                      href={`https://wa.me/${whatsappDigits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aa-chip aa-chip-mint shrink-0"
                    >
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                        open_in_new
                      </span>
                      Chat
                    </a>
                  )}
                </div>
              </div>
            </div>

            <section>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="aa-head flex items-center gap-2 text-lg">
                  <span className="material-symbols-outlined aa-orange-text" aria-hidden="true">
                    sports_cricket
                  </span>
                  Athletic Attributes &amp; Classifications
                </h2>
                {user.location && (
                  <span className="text-sm aa-dim">
                    Location: <span style={{ color: '#f9fafb' }}>{user.location}</span>
                  </span>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Attribute
                  label="Jersey number"
                  value={user.jerseyNumber != null ? `#${user.jerseyNumber}` : 'Not set'}
                  accent="orange"
                />
                <Attribute
                  label="Playing role"
                  value={user.playingRole ? PLAYING_ROLE_LABELS[user.playingRole] : 'Not set'}
                />
                <Attribute label="Batting style" value={battingStyle || 'Not set'} />
                <Attribute label="Bowling style" value={bowlingStyle || 'Not set'} />
              </div>
            </section>

            <section>
              <h2 className="aa-head flex items-center gap-2 text-lg">
                <span className="material-symbols-outlined aa-orange-text" aria-hidden="true">
                  bar_chart
                </span>
                Auction &amp; Performance
              </h2>
              <div className="aa-card mt-3 grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
                <StatCell label="Auctions" value={user.assignedAuctions.length} />
                <StatCell label="Matches played" value={stats?.matchesPlayed ?? 0} />
                <StatCell label="Total runs" value={stats?.batting.runs ?? 0} accent="orange" />
                <StatCell label="Strike rate" value={sr != null ? sr.toFixed(1) : '—'} accent="mint" />
              </div>
            </section>

            <AuctionHistory role={user.role} assignedAuctions={user.assignedAuctions} />
            <CareerStats playerId={user.uid} />

            <section className="aa-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="aa-head text-[15px]">Profile &amp; photo</p>
                  <p className="text-sm aa-dim">Update your details, photo, or avatar.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing((v) => !v)}
                  className={`aa-btn ${editing ? 'aa-btn-ghost' : 'aa-btn-primary'}`}
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    {editing ? 'close' : 'edit'}
                  </span>
                  {editing ? 'Done' : 'Edit profile'}
                </button>
              </div>
              {editing && (
                <div className="mt-4 space-y-4">
                  <ProfilePhotoUpload
                    uid={user.uid}
                    filenPhotoId={user.filenPhotoId}
                    encryptedPhoto={user.encryptedPhoto}
                    avatarId={user.avatarId}
                  />
                  <ProfileForm
                    initial={{
                      displayName: user.displayName,
                      phone: user.phone ?? '',
                      whatsapp: user.whatsapp ?? '',
                      location: user.location ?? '',
                      battingHandedness: user.battingHandedness,
                      bowlingHandedness: user.bowlingHandedness,
                      playingRole: user.playingRole,
                      battingType: user.battingType,
                      bowlingType: user.bowlingType,
                      jerseyNumber: user.jerseyNumber ?? undefined,
                    }}
                    onSave={(fields) => updateOwnProfile(user.uid, fields)}
                  />
                </div>
              )}
            </section>

            <div className="border-t pt-4">
              <label className="flex items-center gap-2 text-sm aa-dim">
                <input
                  type="checkbox"
                  checked={shortcutsEnabled}
                  onChange={(e) => setShortcutsEnabled(e.target.checked)}
                  className="rounded border-[#ffffff26] bg-transparent text-[#ea580c] focus:ring-[#ea580c]"
                />
                Enable keyboard shortcuts
              </label>
              <p className="mt-1 text-xs aa-muted">
                Press{' '}
                <kbd className="rounded border px-1 font-mono">?</kbd> anywhere to see the full list.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
