import { useState } from 'react'
import { Layout } from '../components/Layout'
import { AdminNav } from '../components/AdminNav'
import { LocationAutocomplete } from '../components/LocationAutocomplete'
import { usePageTitle } from '../hooks/usePageTitle'
import { useVenuesRegistry } from '../hooks/useVenuesRegistry'
import { compressImageToDataUrl } from '../lib/imageProcessing'
import {
  MAX_VENUE_IMAGES,
  addVenueImage,
  createVenue,
  deleteVenue,
  removeVenueImage,
  retireVenue,
  unretireVenue,
  updateVenue,
} from '../lib/venues'
import type { Venue } from '../types'

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

// Higher than imageProcessing's avatar-sized default — a venue photo is
// shown full-bleed as an auction page backdrop (see AuctionBackground.tsx),
// not as a small thumbnail, so it needs real resolution to not look
// blurry stretched across a whole screen. At ~50-110KB/photo this still
// keeps MAX_VENUE_IMAGES photos on one venue well under Firestore's 1MB
// document limit.
const VENUE_PHOTO_MAX_DIMENSION_PX = 768
const VENUE_PHOTO_JPEG_QUALITY = 0.75

function formatAddedDate(venue: Venue): string {
  const date = venue.createdAt?.toDate?.()
  if (!date) return 'Unknown'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function VenueGallery({ venue }: { venue: Venue }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError(null)
    if (venue.images.length >= MAX_VENUE_IMAGES) {
      setError(`This venue already has the max of ${MAX_VENUE_IMAGES} photos — remove one first.`)
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Image is too large — choose a photo under 8MB.')
      return
    }

    setUploading(true)
    try {
      const dataUrl = await compressImageToDataUrl(file, {
        maxDimension: VENUE_PHOTO_MAX_DIMENSION_PX,
        quality: VENUE_PHOTO_JPEG_QUALITY,
      })
      await addVenueImage(venue.venueId, dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add photo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {venue.images.map((image) => (
          <div
            key={image}
            className="group relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
          >
            <img src={image} alt={venue.name} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeVenueImage(venue.venueId, image)}
              className="absolute inset-0 hidden items-center justify-center bg-black/50 text-xs font-medium text-white group-hover:flex"
            >
              Remove
            </button>
          </div>
        ))}
        {venue.images.length < MAX_VENUE_IMAGES && (
          <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
            {uploading ? '...' : '+ Add'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        {venue.images.length}/{MAX_VENUE_IMAGES} photos
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function AdminVenues() {
  usePageTitle('Venues')
  const { venues } = useVenuesRegistry()

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [creating, setCreating] = useState(false)

  const [editingVenueId, setEditingVenueId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  async function handleCreateVenue() {
    if (!name.trim() || !location.trim()) return
    setCreating(true)
    try {
      await createVenue(name.trim(), location.trim())
      setName('')
      setLocation('')
    } finally {
      setCreating(false)
    }
  }

  function startEdit(venue: Venue) {
    setEditingVenueId(venue.venueId)
    setEditName(venue.name)
    setEditLocation(venue.location)
  }

  async function handleSaveEdit(venueId: string) {
    if (!editName.trim() || !editLocation.trim()) return
    setSavingEdit(true)
    try {
      await updateVenue(venueId, { name: editName.trim(), location: editLocation.trim() })
      setEditingVenueId(null)
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete(venueId: string, venueName: string) {
    if (!confirm(`Delete "${venueName}"? This permanently removes it and cannot be undone.`)) return
    await deleteVenue(venueId)
  }

  async function handleRetire(venueId: string, venueName: string) {
    if (!confirm(`Retire "${venueName}"? It'll be hidden from new auctions but its history is kept.`)) return
    await retireVenue(venueId)
  }

  const activeVenues = venues.filter((v) => !v.retired)
  const retiredVenues = venues.filter((v) => v.retired)

  function renderVenue(v: Venue) {
    const isEditing = editingVenueId === v.venueId
    return (
      <li key={v.venueId} className="space-y-2 py-3">
        {isEditing ? (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
              <div className="sm:col-span-2">
                <LocationAutocomplete value={editLocation} onChange={setEditLocation} />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveEdit(v.venueId)}
                disabled={savingEdit || !editName.trim() || !editLocation.trim()}
                className="rounded-md bg-gray-800 dark:bg-gray-200 px-3 py-1 text-xs font-medium text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-50"
              >
                {savingEdit ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditingVenueId(null)}
                disabled={savingEdit}
                className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 break-words">
              <span className={`font-medium ${v.retired ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {v.name}
              </span>
              <span className="ml-2 text-gray-500">{v.location}</span>
              {v.retired && (
                <span className="ml-2 rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                  Retired
                </span>
              )}
              <div className="text-xs text-gray-400 dark:text-gray-500">Added {formatAddedDate(v)}</div>
            </div>
            <span className="flex shrink-0 flex-wrap gap-3">
              {v.retired ? (
                <button
                  onClick={() => unretireVenue(v.venueId)}
                  className="text-red-600 dark:text-red-400 hover:underline"
                >
                  Unretire
                </button>
              ) : (
                <>
                  <button
                    onClick={() => startEdit(v)}
                    className="text-red-600 dark:text-red-400 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRetire(v.venueId, v.name)}
                    className="text-red-600 dark:text-red-400 hover:underline"
                  >
                    Retire
                  </button>
                </>
              )}
              <button
                onClick={() => handleDelete(v.venueId, v.name)}
                className="text-red-600 dark:text-red-400 hover:underline"
              >
                Delete
              </button>
            </span>
          </div>
        )}
        <VenueGallery venue={v} />
      </li>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <AdminNav />
        <section>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Venues</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add a venue with its location and a photo gallery — up to {MAX_VENUE_IMAGES} photos each.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Venue name"
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <div className="sm:col-span-2">
              <LocationAutocomplete value={location} onChange={setLocation} />
            </div>
            <button
              onClick={handleCreateVenue}
              disabled={creating || !name.trim() || !location.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 h-fit"
            >
              Add venue
            </button>
          </div>

          <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            {activeVenues.map(renderVenue)}
            {activeVenues.length === 0 && <li className="py-2 text-gray-500">No venues added yet.</li>}
          </ul>

          {retiredVenues.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Retired venues ({retiredVenues.length})
              </h2>
              <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                {retiredVenues.map(renderVenue)}
              </ul>
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
