function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

// FIREBASE_SERVICE_ACCOUNT_JSON holds the full service-account JSON as a
// single-line string (base64-encoded, since most hosts choke on raw JSON —
// quotes/newlines — inside an env var UI). Decode once at boot.
function requiredServiceAccount(): Record<string, unknown> {
  const raw = required('FIREBASE_SERVICE_ACCOUNT_JSON_BASE64')
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
  } catch (err) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 is not valid base64-encoded JSON: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }
}

export const env = {
  port: Number(process.env.PORT ?? 8787),
  // CORS origin(s) allowed to call this proxy — e.g. https://thempl.netlify.app.
  // Comma-separated if you need more than one (e.g. a local dev origin too).
  allowedOrigins: required('ALLOWED_ORIGINS').split(',').map((o) => o.trim()),
  filenEmail: required('FILEN_EMAIL'),
  filenPassword: required('FILEN_PASSWORD'),
  filenTwoFactorCode: process.env.FILEN_TWO_FACTOR_CODE, // omit if 2FA isn't enabled
  // Every uploaded file lives flat in this one Filen folder — see the
  // id-prefixed-filename comment in filenClient.ts for why no nested paths
  // or separate id->path database are needed.
  filenBaseFolder: process.env.FILEN_BASE_FOLDER ?? '/mpl-uploads',
  firebaseServiceAccount: requiredServiceAccount(),
}
