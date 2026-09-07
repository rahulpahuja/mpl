import { useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { LocationAutocomplete } from '../components/LocationAutocomplete'
import { usePageTitle } from '../hooks/usePageTitle'
import { useVenuesRegistry } from '../hooks/useVenuesRegistry'
import {
  ANY,
  DEFAULT_VENUE_FILTER,
  VENUE_LOCATIONS,
  citiesFor,
  locationMatchesFilter,
  statesFor,
} from '../lib/venueLocations'
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

const FILTER_SELECT_CLASS =
  'input-glass rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50'

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

// The location picker with a titled, pinned label — shared by the add and
// edit venue forms.
function LocationField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
      <span className="flex items-center gap-1">
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          location_on
        </span>
        Location
      </span>
      <LocationAutocomplete value={value} onChange={onChange} />
    </label>
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

  const [filter, setFilter] = useState<{ country: string; state: string; city: string }>({
    ...DEFAULT_VENUE_FILTER,
  })
  const stateOptions = statesFor(filter.country)
  const cityOptions = citiesFor(filter.country, filter.state)

  // Changing a broader level clears the narrower ones, since their options no
  // longer apply.
  function setCountry(country: string) {
    setFilter({ country, state: ANY, city: ANY })
  }
  function setStateProvince(state: string) {
    setFilter((f) => ({ ...f, state, city: ANY }))
  }

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

  const visibleVenues = useMemo(
    () => venues.filter((v) => locationMatchesFilter(v.location, filter)),
    [venues, filter],
  )
  const activeVenues = visibleVenues.filter((v) => !v.retired)
  const retiredVenues = visibleVenues.filter((v) => v.retired)
  const hiddenByFilter = venues.length - visibleVenues.length

  function renderVenue(v: Venue) {
    const isEditing = editingVenueId === v.venueId
    return (
      <li key={v.venueId} className="glass-card space-y-2 p-4">
        {isEditing ? (
          <>
            <div className="relative z-[3] grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input-glass rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
              <div className="sm:col-span-2">
                <LocationField value={editLocation} onChange={setEditLocation} />
              </div>
            </div>
            <div className="relative z-[3] flex gap-2">
              <button
                onClick={() => handleSaveEdit(v.venueId)}
                disabled={savingEdit || !editName.trim() || !editLocation.trim()}
                className="btn-brand rounded-md px-3 py-1 text-xs font-medium"
              >
                {savingEdit ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditingVenueId(null)}
                disabled={savingEdit}
                className="rounded-md btn-glass border px-3 py-1 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="relative z-[3] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 break-words">
              <span className={`font-medium ${v.retired ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {v.name}
              </span>
              <span className="ml-2 text-gray-500">{v.location}</span>
              {v.retired && (
                <span className="ml-2 rounded-full bg-gray-200/80 dark:bg-gray-700/80 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                  Retired
                </span>
              )}
              <div className="text-xs text-gray-400 dark:text-gray-500">Added {formatAddedDate(v)}</div>
            </div>
            <span className="flex shrink-0 flex-wrap gap-3">
              {v.retired ? (
                <button
                  onClick={() => unretireVenue(v.venueId)}
                  className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                >
                  Unretire
                </button>
              ) : (
                <>
                  <button
                    onClick={() => startEdit(v)}
                    className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRetire(v.venueId, v.name)}
                    className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    Retire
                  </button>
                </>
              )}
              <button
                onClick={() => handleDelete(v.venueId, v.name)}
                className="font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                Delete
              </button>
            </span>
          </div>
        )}
        <div className="relative z-[3]">
          <VenueGallery venue={v} />
        </div>
      </li>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <section>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Venues</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add a venue with its location and a photo gallery — up to {MAX_VENUE_IMAGES} photos each.
          </p>

          <div className="glass-card mt-3 grid grid-cols-1 gap-2 p-4 sm:grid-cols-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Venue name"
              className="input-glass rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <div className="sm:col-span-2">
              <LocationField value={location} onChange={setLocation} />
            </div>
            <button
              onClick={handleCreateVenue}
              disabled={creating || !name.trim() || !location.trim()}
              className="btn-brand rounded-lg px-4 py-2 text-sm font-medium h-fit"
            >
              Add venue
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              Country
              <select
                value={filter.country}
                onChange={(e) => setCountry(e.target.value)}
                className={FILTER_SELECT_CLASS}
              >
                <option value={ANY}>{ANY} country</option>
                {VENUE_LOCATIONS.map((c) => (
                  <option key={c.country} value={c.country}>
                    {c.country}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              State / Province
              <select
                value={filter.state}
                onChange={(e) => setStateProvince(e.target.value)}
                disabled={filter.country === ANY}
                className={FILTER_SELECT_CLASS}
              >
                <option value={ANY}>{ANY} state / province</option>
                {stateOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              City
              <select
                value={filter.city}
                onChange={(e) => setFilter((f) => ({ ...f, city: e.target.value }))}
                disabled={filter.state === ANY}
                className={FILTER_SELECT_CLASS}
              >
                <option value={ANY}>{ANY} city</option>
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {hiddenByFilter > 0 && (
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              {hiddenByFilter} venue{hiddenByFilter === 1 ? '' : 's'} hidden by this filter.{' '}
              <button
                type="button"
                onClick={() => setFilter({ country: ANY, state: ANY, city: ANY })}
                className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
              >
                Clear
              </button>
            </p>
          )}

          <ul className="mt-4 space-y-2.5 text-sm">
            {activeVenues.map(renderVenue)}
            {activeVenues.length === 0 && (
              <li className="py-2 text-gray-500">
                {venues.length === 0 ? 'No venues added yet.' : 'No venues match this filter.'}
              </li>
            )}
          </ul>

          {retiredVenues.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Retired venues ({retiredVenues.length})
              </h2>
              <ul className="mt-2 space-y-2.5 text-sm">
                {retiredVenues.map(renderVenue)}
              </ul>
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
