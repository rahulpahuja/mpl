// A short, easy-to-read-aloud ID for anything a human shares by typing it
// (an auction ID, a Team Draft match ID) rather than pasting a Firestore auto-ID.
export function generateShortId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}
