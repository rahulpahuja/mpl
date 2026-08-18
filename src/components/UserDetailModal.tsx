import { Avatar } from './Avatar'
import { WhatsAppButton } from './WhatsAppButton'
import { AdminPhotoRequestControl } from './AdminPhotoRequestControl'
import { useAuthStore } from '../store/authStore'
import { BATTING_TYPE_LABELS } from '../lib/battingTypes'
import { BOWLING_TYPE_LABELS } from '../lib/bowlingTypes'
import { PLAYING_ROLE_LABELS } from '../lib/playingRoles'
import type { AppUser } from '../types'

const ROLE_LABELS: Record<AppUser['role'], string> = {
  admin: 'Admin',
  auctionManager: 'Auction Manager',
  manager: 'Captain',
  player: 'Player',
  viewer: 'Viewer',
}

const HANDEDNESS_LABELS = { right: 'Right-handed', left: 'Left-handed' } as const

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="min-w-0 text-right text-gray-900 dark:text-gray-100 break-words">{value}</dd>
    </div>
  )
}

export function UserDetailModal({
  user,
  auctionNameById,
  onClose,
}: {
  user: AppUser | null
  auctionNameById: Record<string, string>
  onClose: () => void
}) {
  const me = useAuthStore((s) => s.user)
  const canRequestPhoto = me && me.uid !== user?.uid && (me.role === 'admin' || me.role === 'auctionManager')

  if (!user) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-full overflow-y-auto rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar
              name={user.displayName}
              filenPhotoId={user.filenPhotoId}
              encryptedPhoto={user.encryptedPhoto}
              photoURL={user.photoURL}
              avatarId={user.avatarId}
            />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user.displayName}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-sm text-gray-500 dark:text-gray-400 hover:underline"
          >
            Close
          </button>
        </div>

        <dl className="mt-4 divide-y divide-gray-200 dark:divide-gray-800 text-sm">
          <Field label="Email" value={user.email} />
          <Field
            label="Phone"
            value={
              user.phone ? (
                <span className="inline-flex items-center gap-2">
                  {user.phone}
                  <WhatsAppButton
                    phone={user.phone}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600"
                  />
                </span>
              ) : (
                '—'
              )
            }
          />
          <Field
            label="WhatsApp"
            value={
              user.whatsapp ? (
                <span className="inline-flex items-center gap-2">
                  {user.whatsapp}
                  <WhatsAppButton
                    phone={user.whatsapp}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600"
                  />
                </span>
              ) : (
                '—'
              )
            }
          />
          <Field label="Location" value={user.location || '—'} />
          {user.userCode && <Field label="User ID" value={<span className="font-mono">{user.userCode}</span>} />}
          <Field label="Jersey number" value={user.jerseyNumber ?? '—'} />
          <Field
            label="Playing role"
            value={user.playingRole ? PLAYING_ROLE_LABELS[user.playingRole] : '—'}
          />
          <Field
            label="Batting type"
            value={user.battingType ? BATTING_TYPE_LABELS[user.battingType] : '—'}
          />
          <Field
            label="Bowling type"
            value={user.bowlingType ? BOWLING_TYPE_LABELS[user.bowlingType] : '—'}
          />
          <Field
            label="Batting handedness"
            value={user.battingHandedness ? HANDEDNESS_LABELS[user.battingHandedness] : '—'}
          />
          <Field
            label="Bowling handedness"
            value={user.bowlingHandedness ? HANDEDNESS_LABELS[user.bowlingHandedness] : '—'}
          />
          <Field
            label="Assigned auctions"
            value={
              user.assignedAuctions.length > 0
                ? user.assignedAuctions.map((id) => auctionNameById[id] ?? id).join(', ')
                : '—'
            }
          />
          {user.role === 'viewer' && user.playerRequested && (
            <Field label="Player request" value="Requested" />
          )}
        </dl>

        {canRequestPhoto && me && <AdminPhotoRequestControl targetUser={user} requestedBy={me} />}
      </div>
    </div>
  )
}
