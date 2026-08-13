import { useState } from 'react'
import type { ProfileFields } from '../lib/users'
import { PLAYING_ROLE_OPTIONS } from '../lib/playingRoles'
import type { Handedness, PlayingRole } from '../types'
import { LocationAutocomplete } from './LocationAutocomplete'

const COUNTRY_CODE = '+91'

// Numbers are stored with the +91 prefix (e.g. "+919876543210") so they're
// unambiguous everywhere they're used — displayed, dialed, or turned into a
// wa.me link, which requires the country code to resolve to the right contact.
function localDigits(storedValue: string) {
  return storedValue.startsWith(COUNTRY_CODE) ? storedValue.slice(COUNTRY_CODE.length) : storedValue
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 10)
}

function toStoredPhone(localValue: string) {
  return localValue === '' ? '' : `${COUNTRY_CODE}${localValue}`
}

function isValidPhone(value: string) {
  return value === '' || /^\d{10}$/.test(value)
}

function isValidJerseyNumber(value: string) {
  if (value === '') return true
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 && n <= 99
}

export function ProfileForm({
  initial,
  onSave,
  submitLabel = 'Save',
}: {
  initial: ProfileFields
  onSave: (fields: ProfileFields) => Promise<void>
  submitLabel?: string
}) {
  const [phone, setPhone] = useState(localDigits(initial.phone))
  const [whatsapp, setWhatsapp] = useState(localDigits(initial.whatsapp))
  const [sameAsPhone, setSameAsPhone] = useState(
    initial.whatsapp !== '' && initial.whatsapp === initial.phone,
  )
  const [location, setLocation] = useState(initial.location)
  const [battingHandedness, setBattingHandedness] = useState<Handedness | ''>(
    initial.battingHandedness ?? '',
  )
  const [bowlingHandedness, setBowlingHandedness] = useState<Handedness | ''>(
    initial.bowlingHandedness ?? '',
  )
  const [playingRole, setPlayingRole] = useState<PlayingRole | ''>(initial.playingRole ?? '')
  const [jerseyNumber, setJerseyNumber] = useState(
    initial.jerseyNumber !== undefined ? String(initial.jerseyNumber) : '',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handlePhoneChange(value: string) {
    const digits = onlyDigits(value)
    setPhone(digits)
    if (sameAsPhone) setWhatsapp(digits)
  }

  function handleSameAsPhoneChange(checked: boolean) {
    setSameAsPhone(checked)
    if (checked) setWhatsapp(phone)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isValidPhone(phone)) {
      setError('Enter a valid 10-digit phone number')
      return
    }
    if (!isValidPhone(whatsapp)) {
      setError('Enter a valid 10-digit WhatsApp number')
      return
    }
    if (!isValidJerseyNumber(jerseyNumber)) {
      setError('Enter a jersey number between 0 and 99')
      return
    }

    setSaving(true)
    try {
      await onSave({
        phone: toStoredPhone(phone),
        whatsapp: toStoredPhone(whatsapp),
        location: location.trim(),
        battingHandedness: battingHandedness || undefined,
        bowlingHandedness: bowlingHandedness || undefined,
        playingRole: playingRole || undefined,
        jerseyNumber: jerseyNumber === '' ? undefined : Number(jerseyNumber),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone number</label>
        <div className="mt-1 flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700 focus-within:ring-2 focus-within:ring-red-500">
          <span className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 text-sm text-gray-500 dark:text-gray-400">
            {COUNTRY_CODE}
          </span>
          <input
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            inputMode="numeric"
            maxLength={10}
            className="w-full bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          WhatsApp number
        </label>
        <div className="mt-1 flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700 focus-within:ring-2 focus-within:ring-red-500">
          <span className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 text-sm text-gray-500 dark:text-gray-400">
            {COUNTRY_CODE}
          </span>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(onlyDigits(e.target.value))}
            disabled={sameAsPhone}
            inputMode="numeric"
            maxLength={10}
            className="w-full bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none disabled:opacity-60"
          />
        </div>
        <label className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <input
            type="checkbox"
            checked={sameAsPhone}
            onChange={(e) => handleSameAsPhoneChange(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-700 text-red-600 focus:ring-red-500"
          />
          Same as phone number
        </label>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
        <div className="mt-1">
          <LocationAutocomplete value={location} onChange={setLocation} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Jersey number
        </label>
        <input
          value={jerseyNumber}
          onChange={(e) => setJerseyNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
          inputMode="numeric"
          maxLength={2}
          placeholder="e.g. 7"
          className="mt-1 w-24 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Playing role
        </label>
        <select
          value={playingRole}
          onChange={(e) => setPlayingRole(e.target.value as PlayingRole | '')}
          className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">Not set</option>
          {PLAYING_ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Batting handedness
          </label>
          <select
            value={battingHandedness}
            onChange={(e) => setBattingHandedness(e.target.value as Handedness | '')}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Not set</option>
            <option value="right">Right-handed</option>
            <option value="left">Left-handed</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Bowling handedness
          </label>
          <select
            value={bowlingHandedness}
            onChange={(e) => setBowlingHandedness(e.target.value as Handedness | '')}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Not set</option>
            <option value="right">Right-arm</option>
            <option value="left">Left-arm</option>
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
