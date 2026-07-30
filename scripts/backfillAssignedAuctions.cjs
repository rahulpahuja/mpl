// One-time backfill for a bug where adding a team (or an Auction Manager) to an
// auction never updated that user's `assignedAuctions` array — so their Home
// page never showed auctions they were actually part of, even on refresh.
// The code path that caused this (`addTeamToAuction` in src/lib/auctions.ts)
// is already fixed for all *future* assignments; this script repairs existing
// data by re-deriving `assignedAuctions` from each auction's teamManagers and
// auctionManagerIds.
//
// Safe by design: it only ever ADDS missing auction IDs to a user's
// assignedAuctions (via arrayUnion) — it never removes or overwrites anything.
//
// Usage:
//   1. Authenticate against the target Firebase project, e.g.:
//        gcloud auth application-default login
//      or set GOOGLE_APPLICATION_CREDENTIALS to a service account key path.
//   2. Dry run first (default) to see what would change, no writes made:
//        node scripts/backfillAssignedAuctions.cjs --project <firebase-project-id>
//   3. Once you've reviewed the output, apply it for real:
//        node scripts/backfillAssignedAuctions.cjs --project <firebase-project-id> --apply

const { initializeApp, applicationDefault } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

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
    console.error('Usage: node scripts/backfillAssignedAuctions.cjs --project <firebase-project-id> [--apply]')
    process.exit(1)
  }

  initializeApp({ credential: applicationDefault(), projectId: project })
  const db = getFirestore()

  const auctionsSnap = await db.collection('auctions').get()

  // Map of managerId/uid -> Set of auctionIds they should be assigned to.
  const shouldHave = new Map()
  function addExpectation(uid, auctionId) {
    if (!shouldHave.has(uid)) shouldHave.set(uid, new Set())
    shouldHave.get(uid).add(auctionId)
  }

  for (const doc of auctionsSnap.docs) {
    const auction = doc.data()
    for (const managerId of auction.auctionManagerIds || []) {
      addExpectation(managerId, doc.id)
    }
    for (const tm of auction.teamManagers || []) {
      addExpectation(tm.managerId, doc.id)
    }
  }

  let usersToFix = 0
  let totalMissing = 0

  for (const [uid, expectedAuctionIds] of shouldHave) {
    const userSnap = await db.collection('users').doc(uid).get()
    if (!userSnap.exists) {
      console.warn(`Skipping ${uid} — referenced in an auction but has no user doc.`)
      continue
    }
    const current = new Set(userSnap.data().assignedAuctions || [])
    const missing = [...expectedAuctionIds].filter((id) => !current.has(id))
    if (missing.length === 0) continue

    usersToFix++
    totalMissing += missing.length
    console.log(`${uid} (${userSnap.data().displayName ?? 'unknown'}): missing ${missing.join(', ')}`)

    if (apply) {
      await userSnap.ref.update({ assignedAuctions: FieldValue.arrayUnion(...missing) })
    }
  }

  console.log(
    `\n${apply ? 'Applied' : 'Would apply'} fixes for ${usersToFix} user(s), ${totalMissing} missing assignment(s) total.`,
  )
  if (!apply && usersToFix > 0) {
    console.log('Re-run with --apply to write these changes.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
