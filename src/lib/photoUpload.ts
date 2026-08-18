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

export function bytesToMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1)
}
