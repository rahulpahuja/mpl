import { useState } from 'react'
import { Layout } from '../components/Layout'
import { AdminNav } from '../components/AdminNav'
import { LocationAutocomplete } from '../components/LocationAutocomplete'
import { usePageTitle } from '../hooks/usePageTitle'
import { useVenuesRegistry } from '../hooks/useVenuesRegistry'
import { compressImageToDataUrl } from '../lib/imageProcessing'
import { MAX_VENUE_IMAGES, addVenueImage, createVenue, deleteVenue, removeVenueImage, updateVenue } from '../lib/venues'
import type { Venue } from '../types'

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

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
      const dataUrl = await compressImageToDataUrl(file)
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
            {venues.map((v) => {
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
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{v.name}</span>
                        <span className="ml-2 text-gray-500">{v.location}</span>
                      </div>
                      <span className="flex gap-3">
                        <button
                          onClick={() => startEdit(v)}
                          className="text-red-600 dark:text-red-400 hover:underline"
                        >
                          Edit
                        </button>
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
            })}
            {venues.length === 0 && <li className="py-2 text-gray-500">No venues added yet.</li>}
          </ul>
        </section>
      </div>
    </Layout>
  )
}
