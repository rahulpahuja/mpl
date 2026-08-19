// Shared by ProfilePhotoUpload (self-service) and AdminPhotoRequestControl
// (admin/auction manager proposing a photo on someone else's behalf) so both
// upload paths produce identically-sized/quality photos.

// Applies to the originally-picked file, before compression — Filen itself
// (10GiB free tier) has no reason to cap this tightly, but the proxy
// (server/src/index.ts's MAX_UPLOAD_BYTES) enforces the same 25MB server-side,
// so this is a fast client-side reject rather than the actual limit.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
// Profile photos get shown up to 288px (up to ~576px on a retina display,
// e.g. the auction "current player" spotlight) — 512px/0.92 is
// visually-near-lossless at that size without uploading/downloading a much
// larger original on every avatar render than the app ever actually displays.
export const PROFILE_PHOTO_MAX_DIMENSION_PX = 512
export const PROFILE_PHOTO_JPEG_QUALITY = 0.92

// A player's roster-snapshot photo (see resolvePlayerPhotoFields in
// AuctionSetup.tsx) gets embedded, base64-encoded, and encrypted directly
// into the auction document's `players` array — unlike a profile photo it
// isn't fetched on demand, so every player added multiplies the document
// size. At PROFILE_PHOTO settings a single photo can run 60-160KB once
// double-base64'd for encryption, so a few dozen players blows past
// Firestore's 1MB document cap and every future write to the auction starts
// failing. 320px/0.75 keeps a photo in the ~10-25KB range — still sharp
// enough for the largest on-screen use (the ~288px "current player"
// spotlight) while leaving headroom for a large roster.
export const ROSTER_PHOTO_MAX_DIMENSION_PX = 320
export const ROSTER_PHOTO_JPEG_QUALITY = 0.75

export function bytesToMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1)
}
