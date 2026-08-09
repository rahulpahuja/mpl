import { arrayRemove, arrayUnion, deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { Venue } from '../types'

// Keeps a venue doc well under Firestore's 1MB limit even with every photo
// compressed (~10-30KB each, see lib/imageProcessing.ts).
export const MAX_VENUE_IMAGES = 8

export async function createVenue(name: string, location: string): Promise<string> {
  const venueId = crypto.randomUUID()
  const venue: Omit<Venue, 'createdAt'> = { venueId, name, location, images: [] }
  await setDoc(doc(db, 'venues', venueId), { ...venue, createdAt: serverTimestamp() })
  return venueId
}

export async function updateVenue(venueId: string, updates: Partial<Pick<Venue, 'name' | 'location'>>) {
  await updateDoc(doc(db, 'venues', venueId), updates)
}

export async function addVenueImage(venueId: string, imageDataUrl: string) {
  await updateDoc(doc(db, 'venues', venueId), { images: arrayUnion(imageDataUrl) })
}

// Images are deduped by exact data-URL match rather than a separate ID
// scheme — arrayRemove needs the exact stored value, which is what the
// gallery already renders from, so this stays simple.
export async function removeVenueImage(venueId: string, imageDataUrl: string) {
  await updateDoc(doc(db, 'venues', venueId), { images: arrayRemove(imageDataUrl) })
}

export async function deleteVenue(venueId: string) {
  await deleteDoc(doc(db, 'venues', venueId))
}

// Retiring (rather than deleting) keeps the venue doc around — anything that
// referenced it by ID in the past keeps resolving — while hiding it from
// future venue pickers.
export async function retireVenue(venueId: string) {
  await updateDoc(doc(db, 'venues', venueId), { retired: true, retiredAt: serverTimestamp() })
}

export async function unretireVenue(venueId: string) {
  await updateDoc(doc(db, 'venues', venueId), { retired: false, retiredAt: null })
}
