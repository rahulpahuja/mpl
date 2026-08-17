import type { NextFunction, Request, Response } from 'express'
import admin from 'firebase-admin'
import { env } from './env.js'

admin.initializeApp({
  credential: admin.credential.cert(env.firebaseServiceAccount as admin.ServiceAccount),
})

// Extends Express's Request so downstream handlers can read req.uid without
// re-verifying the token.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      uid?: string
    }
  }
}

// Reuses MPL's existing Firebase Auth — same identity system the frontend
// already signs in with, no separate credential system for this proxy.
export async function requireFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization: Bearer <Firebase ID token> header' })
    return
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.uid = decoded.uid
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired ID token' })
  }
}
