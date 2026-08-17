# MPL Filen proxy

A small always-on Express server that authenticates to Filen once and exposes
upload/list/download/delete over HTTP to the MPL frontend. Exists because
`@filen/sdk` is Node-only and Filen has no presigned/temporary URL mechanism
(files are E2E-encrypted — every download has to be decrypted server-side),
so the browser can never talk to Filen directly.

## Endpoints

All routes except `/health` require `Authorization: Bearer <Firebase ID token>`.

- `POST /upload` — multipart `file` field. Returns `{ id, name, size }`.
- `GET /files` — returns `[{ id, name, size, lastModified }]`.
- `GET /download/:id` — streams the file back with the right `Content-Type`.
- `DELETE /files/:id` — deletes it. Returns `204`.

Save the returned `id` as the "path" reference in Firestore — that's the only
thing the frontend needs to remember to fetch the file again later.

## Local dev

```
cp .env.example .env   # fill in the values
npm install
npm run dev
```

## Deploying for free (Render)

Render's free Web Service tier costs $0 and needs no card, with one
tradeoff: it spins down after ~15 minutes idle, so the first request after a
quiet period pays a cold start (container boot + this app's Filen `login()`
call, which does real key-derivation work — expect a few extra seconds on
that first request, not on the ones after).

1. Push this repo to GitHub (already is).
2. On Render: **New > Web Service**, connect the repo.
3. **Root Directory**: `server`
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm start`
6. Add the env vars from `.env.example` under **Environment**.
7. Deploy. Note the resulting `https://<name>.onrender.com` URL — that's what
   the frontend's `VITE_FILEN_PROXY_URL` should point to.

## Notes

- **`DELETE /files/:id` soft-deletes** (`unlink({ path })`, `permanent`
  defaults to `false`) — the file goes to Filen's trash, not gone
  immediately. Pass `permanent: true` in `src/index.ts` if you want a hard
  delete instead. Confirmed against the installed SDK's own type
  definitions (`node_modules/@filen/sdk/dist/types/fs/index.d.ts`).
- **No stream-based upload/download exists in the SDK** — `upload`'s
  `source` and `download`'s `destination` are both local file path strings
  only (confirmed in the same type definitions), which is *why* this proxy
  round-trips through a temp file rather than a guess or a workaround.
- **25MB upload limit** (`MAX_UPLOAD_BYTES` in `src/index.ts`) is an
  arbitrary starting point, not a Filen constraint — raise it if you need to
  move bigger files.
- **Uploads/downloads go through a local temp file** (`os.tmpdir()`), not a
  raw stream straight into/out of the SDK — Filen's own S3-compatible gateway
  package documents that its own PUT handling buffers whole files in memory,
  which suggested the SDK's streaming story wasn't solid enough to build on
  directly. This still avoids buffering the whole file in *this process's
  memory* (it hits disk instead), but does mean each request needs scratch
  disk space equal to the file size, and adds a bit of latency vs. a true
  pass-through stream.
