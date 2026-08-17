import { randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdtemp, rm, stat as fsStat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Busboy from 'busboy'
import cors from 'cors'
import express from 'express'
import mime from 'mime-types'
import { env } from './env.js'
import { ensureFilenLoggedIn, filenFs } from './filenClient.js'
import { requireFirebaseAuth } from './firebaseAdmin.js'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // 25MB — raise if you need bigger files

const app = express()
app.use(cors({ origin: env.allowedOrigins }))

// Every stored file's name on Filen is `${id}__${originalName}`, all flat in
// one folder (env.filenBaseFolder). That prefix is the only "database" this
// proxy needs — the frontend only ever has to remember the opaque `id` (that's
// what gets saved as the "path" in Firestore), and a readdir + prefix match
// resolves it back to the real stored filename. Trades an O(n) directory
// listing per lookup for not needing a second datastore; fine at this app's
// scale (tens to low hundreds of files), reconsider if that changes.
function storedName(id: string, originalName: string) {
  const safeOriginalName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  return `${id}__${safeOriginalName}`
}

function parseStoredName(name: string): { id: string; originalName: string } | null {
  const sep = name.indexOf('__')
  if (sep === -1) return null
  return { id: name.slice(0, sep), originalName: name.slice(sep + 2) }
}

async function findStoredFile(id: string) {
  await ensureFilenLoggedIn()
  const names = await filenFs().readdir({ path: env.filenBaseFolder })
  const match = names.find((n) => n.startsWith(`${id}__`))
  if (!match) return null
  const parsed = parseStoredName(match)
  if (!parsed) return null
  return { fullPath: `${env.filenBaseFolder}/${match}`, ...parsed }
}

app.post('/upload', requireFirebaseAuth, async (req, res) => {
  await ensureFilenLoggedIn()

  const busboy = Busboy({
    headers: req.headers,
    limits: { files: 1, fileSize: MAX_UPLOAD_BYTES },
  })

  const workDir = await mkdtemp(join(tmpdir(), 'filen-upload-'))
  const id = randomUUID()
  let responded = false
  let originalName = 'file'
  let tmpFilePath: string | null = null
  let sizeTooLarge = false

  function fail(status: number, message: string) {
    if (responded) return
    responded = true
    res.status(status).json({ error: message })
  }

  busboy.on('file', (_name, fileStream, info) => {
    originalName = info.filename || originalName
    tmpFilePath = join(workDir, 'upload')
    const writeStream = fileStream.pipe(createWriteStream(tmpFilePath))
    fileStream.on('limit', () => {
      sizeTooLarge = true
      writeStream.destroy()
    })
  })

  busboy.on('finish', async () => {
    try {
      if (sizeTooLarge) {
        fail(413, `File exceeds the ${MAX_UPLOAD_BYTES} byte limit`)
        return
      }
      if (!tmpFilePath) {
        fail(400, 'No file field found in the upload')
        return
      }
      const targetPath = `${env.filenBaseFolder}/${storedName(id, originalName)}`
      await filenFs().upload({ path: targetPath, source: tmpFilePath })
      const stats = await fsStat(tmpFilePath)
      if (!responded) {
        responded = true
        res.json({ id, name: originalName, size: stats.size })
      }
    } catch (err) {
      fail(500, err instanceof Error ? err.message : 'Upload failed')
    } finally {
      await rm(workDir, { recursive: true, force: true })
    }
  })

  req.pipe(busboy)
})

app.get('/files', requireFirebaseAuth, async (_req, res) => {
  try {
    await ensureFilenLoggedIn()
    const names = await filenFs().readdir({ path: env.filenBaseFolder })
    const files = await Promise.all(
      names.map(async (name) => {
        const parsed = parseStoredName(name)
        if (!parsed) return null
        const stats = await filenFs().stat({ path: `${env.filenBaseFolder}/${name}` })
        return {
          id: parsed.id,
          name: parsed.originalName,
          size: stats.size,
          lastModified: stats.mtimeMs ?? null,
        }
      }),
    )
    res.json(files.filter((f): f is NonNullable<typeof f> => f !== null))
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list files' })
  }
})

app.get('/download/:id', requireFirebaseAuth, async (req, res) => {
  const workDir = await mkdtemp(join(tmpdir(), 'filen-download-'))
  try {
    const found = await findStoredFile(req.params.id)
    if (!found) {
      res.status(404).json({ error: 'File not found' })
      return
    }
    const tmpFilePath = join(workDir, found.originalName)
    await filenFs().download({ path: found.fullPath, destination: tmpFilePath })

    res.setHeader('Content-Type', mime.lookup(found.originalName) || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${found.originalName}"`)
    const stream = createReadStream(tmpFilePath)
    stream.pipe(res)
    stream.on('close', () => {
      rm(workDir, { recursive: true, force: true }).catch(() => {})
    })
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).end()
      rm(workDir, { recursive: true, force: true }).catch(() => {})
    })
  } catch (err) {
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
    res.status(500).json({ error: err instanceof Error ? err.message : 'Download failed' })
  }
})

app.delete('/files/:id', requireFirebaseAuth, async (req, res) => {
  try {
    const found = await findStoredFile(req.params.id)
    if (!found) {
      res.status(404).json({ error: 'File not found' })
      return
    }
    // Soft-delete by default (permanent defaults to false) — moves the file
    // to Filen's trash rather than wiping it immediately, so an accidental
    // delete is recoverable from the Filen UI. Pass `permanent: true` if you
    // want this endpoint to hard-delete instead.
    await filenFs().unlink({ path: found.fullPath })
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Delete failed' })
  }
})

// Server being reachable at all doesn't mean Filen is — this actually
// exercises a live call (a cheap readdir) rather than just reporting process
// liveness, so a dropped Filen session or account issue shows up here
// instead of silently failing on the next real upload/download.
app.get('/health', async (_req, res) => {
  try {
    await ensureFilenLoggedIn()
    await filenFs().readdir({ path: env.filenBaseFolder })
    res.json({ server: 'up', filen: 'up' })
  } catch (err) {
    res.json({ server: 'up', filen: 'down', error: err instanceof Error ? err.message : 'unknown error' })
  }
})

ensureFilenLoggedIn()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`Filen proxy listening on :${env.port}`)
    })
  })
  .catch((err) => {
    console.error('Failed to log in to Filen at boot', err)
    process.exit(1)
  })
