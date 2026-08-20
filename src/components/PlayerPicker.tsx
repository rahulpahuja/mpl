import type { ReactNode } from 'react'
import { Avatar } from './Avatar'
import { PLAYING_ROLE_LABELS } from '../lib/playingRoles'
import type { AppUser } from '../types'

function matches(users: AppUser[], search: string) {
  const q = search.trim().toLowerCase()
  if (!q) return users
  return users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.userCode?.toLowerCase().includes(q),
  )
}

// Search-and-pick modal for registered ('role: player') users — same visual
// pattern as AuctionSetup's "Import players" dialog. Two modes cover both
// places this app needs to pick from a pool of players:
//  - 'add': each row adds immediately (team roster management).
//  - 'multiSelect': rows toggle a bounded in-memory selection with a
//    separate confirm step (Playing XI picking, capped at 11).
export function PlayerPicker({
  open,
  onClose,
  title,
  description,
  candidates,
  search,
  onSearchChange,
  mode,
  onAdd,
  addingIds,
  selectedIds,
  onToggle,
  maxSelect,
  onConfirm,
  confirmLabel = 'Confirm',
  confirming,
  extraRow,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  candidates: AppUser[]
  search: string
  onSearchChange: (value: string) => void
  mode: 'add' | 'multiSelect'
  onAdd?: (user: AppUser) => void
  addingIds?: Set<string>
  selectedIds?: Set<string>
  onToggle?: (user: AppUser) => void
  maxSelect?: number
  onConfirm?: () => void
  confirmLabel?: string
  confirming?: boolean
  extraRow?: ReactNode
}) {
  if (!open) return null
  const filtered = matches(candidates, search)
  const selectionFull = mode === 'multiSelect' && maxSelect != null && (selectedIds?.size ?? 0) >= maxSelect

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 sm:px-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white p-4 shadow-xl sm:p-6 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Close">
            ✕
          </button>
        </div>
        {description && <p className="mt-1 text-xs text-gray-500 sm:text-sm dark:text-gray-400">{description}</p>}
        {mode === 'multiSelect' && maxSelect != null && (
          <p className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-300">
            {selectedIds?.size ?? 0} / {maxSelect} selected
          </p>
        )}
        <input
          autoFocus
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, email, phone, or ID..."
          className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        {extraRow}
        <ul className="mt-3 flex-1 divide-y divide-gray-200 overflow-y-auto text-sm dark:divide-gray-800">
          {filtered.length === 0 && (
            <li className="py-2 text-gray-500">{candidates.length === 0 ? 'No players available.' : 'No players match.'}</li>
          )}
          {filtered.map((p) => {
            const isSelected = mode === 'multiSelect' && selectedIds?.has(p.uid)
            const isAdding = mode === 'add' && addingIds?.has(p.uid)
            const disabled = mode === 'add' ? isAdding : !isSelected && selectionFull
            return (
              <li key={p.uid} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex min-w-0 items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Avatar
                    name={p.displayName}
                    filenPhotoId={p.filenPhotoId}
                    encryptedPhoto={p.encryptedPhoto}
                    photoURL={p.photoURL}
                    avatarId={p.avatarId}
                  />
                  <span className="min-w-0 break-words">
                    {p.displayName}
                    {p.playingRole && PLAYING_ROLE_LABELS[p.playingRole] && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {PLAYING_ROLE_LABELS[p.playingRole]}
                      </span>
                    )}
                    <br />
                    <span className="text-xs text-gray-500">
                      {p.userCode ? `ID ${p.userCode} · ` : ''}
                      {p.phone || p.email}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => (mode === 'add' ? onAdd?.(p) : onToggle?.(p))}
                  disabled={disabled}
                  className={`shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                    isSelected
                      ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  {mode === 'add' ? (isAdding ? 'Adding...' : 'Add') : isSelected ? 'Selected' : 'Select'}
                </button>
              </li>
            )
          })}
        </ul>
        {mode === 'multiSelect' && (
          <div className="mt-3 flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirming || (maxSelect != null && (selectedIds?.size ?? 0) !== maxSelect)}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {confirming ? 'Saving...' : confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
