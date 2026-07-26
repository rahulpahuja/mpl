import { doc, runTransaction } from 'firebase/firestore'
import { db } from './firebase'

function adminClaimedRef() {
  return doc(db, 'meta', 'adminClaimed')
}

export async function claimFirstAdmin(uid: string) {
  await runTransaction(db, async (tx) => {
    const claimedSnap = await tx.get(adminClaimedRef())
    if (claimedSnap.exists() && claimedSnap.data().claimed) {
      throw new Error('An admin has already been claimed for this app.')
    }
    const userRef = doc(db, 'users', uid)
    const userSnap = await tx.get(userRef)
    if (!userSnap.exists()) {
      throw new Error('User profile not found. Sign in first, then try again.')
    }
    tx.set(adminClaimedRef(), { claimed: true })
    tx.update(userRef, { role: 'admin' })
  })
}
