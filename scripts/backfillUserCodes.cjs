// One-time backfill for the short user-ID feature (see ensureUserDoc in
// src/lib/auth.ts): new users get a `userCode` + a `userCodes/{code}`
// reservation doc at sign-up time, but users created before this shipped
// have neither. This assigns a unique code to every user doc missing one.
//
// Safe by design: it only ever sets `userCode` on docs where it's currently
// unset, and only ever creates userCodes/{code} docs for codes it just
// picked — it never overwrites or removes anything.
//
// Usage:
//   1. Authenticate against the target Firebase project, e.g.:
//        gcloud auth application-default login
//      or set GOOGLE_APPLICATION_CREDENTIALS to a service account key path.
//   2. Dry run first (default) to see what would change, no writes made:
//        node scripts/backfillUserCodes.cjs --project <firebase-project-id>
//   3. Once you've reviewed the output, apply it for real:
//        node scripts/backfillUserCodes.cjs --project <firebase-project-id> --apply

const { initializeApp, applicationDefault } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
const MAX_ATTEMPTS_PER_USER = 10

function generateCode() {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

function parseArgs(argv) {
  const args = { apply: false, project: null }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--apply') args.apply = true
    if (argv[i] === '--project') args.project = argv[++i]
  }
  return args
}

async function main() {
  const { apply, project } = parseArgs(process.argv.slice(2))
  if (!project) {
    console.error('Usage: node scripts/backfillUserCodes.cjs --project <firebase-project-id> [--apply]')
    process.exit(1)
  }

  initializeApp({ credential: applicationDefault(), projectId: project })
  const db = getFirestore()

  const [usersSnap, existingCodesSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('userCodes').get(),
  ])

  const usedCodes = new Set(existingCodesSnap.docs.map((d) => d.id))
  for (const userDoc of usersSnap.docs) {
    const existing = userDoc.data().userCode
    if (existing) usedCodes.add(existing)
  }

  let fixed = 0
  let skipped = 0

  for (const userDoc of usersSnap.docs) {
    if (userDoc.data().userCode) continue

    let code = null
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_USER; attempt++) {
      const candidate = generateCode()
      if (!usedCodes.has(candidate)) {
        code = candidate
        break
      }
    }
    if (!code) {
      console.warn(`Could not find a free code for ${userDoc.id} — skipping, re-run to retry.`)
      skipped++
      continue
    }

    usedCodes.add(code)
    fixed++
    console.log(`${userDoc.id} (${userDoc.data().displayName ?? 'unknown'}): assigning ${code}`)

    if (apply) {
      await db.collection('userCodes').doc(code).set({ uid: userDoc.id })
      await userDoc.ref.update({ userCode: code })
    }
  }

  console.log(
    `\n${apply ? 'Assigned' : 'Would assign'} codes for ${fixed} user(s)${skipped ? `, ${skipped} skipped` : ''}.`,
  )
  if (!apply && fixed > 0) {
    console.log('Re-run with --apply to write these changes.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
