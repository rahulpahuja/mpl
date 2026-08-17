import FilenSDK from '@filen/sdk'
import { env } from './env.js'

// Filen is E2E-encrypted, so there is no S3-style presigned/temporary URL —
// every read has to go through an authenticated client that holds the
// account's derived keys (confirmed against Filen's own filen-s3 gateway
// docs: "Presigned URLs are not yet supported"). That client is this
// singleton: authenticate once at boot (login derives keys via
// Argon2/PBKDF2 and is too slow to redo per-request), then reuse it for
// every request this process handles for its whole lifetime.
const filen = new FilenSDK({
  metadataCache: true,
})

let loginPromise: Promise<void> | null = null

export function ensureFilenLoggedIn(): Promise<void> {
  if (!loginPromise) {
    loginPromise = filen
      .login({
        email: env.filenEmail,
        password: env.filenPassword,
        twoFactorCode: env.filenTwoFactorCode,
      })
      .then(async () => {
        // Idempotent — throws if it already exists, which we ignore.
        try {
          await filen.fs().mkdir({ path: env.filenBaseFolder })
        } catch {
          // already exists
        }
      })
  }
  return loginPromise
}

export function filenFs() {
  return filen.fs()
}
