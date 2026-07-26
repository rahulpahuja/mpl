export function FirebaseSetupNotice({ missing }: { missing: string[] }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200/80 bg-white/80 backdrop-blur-md p-8 shadow-xl ring-1 ring-black/5">
        <h1 className="text-xl font-semibold text-gray-900">Firebase isn't configured yet</h1>
        <p className="mt-2 text-sm text-gray-600">
          Copy <code className="rounded bg-gray-100 px-1 py-0.5">.env.example</code> to{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5">.env</code> and fill in your Firebase
          project's web config, then restart the dev server.
        </p>
        <p className="mt-4 text-sm font-medium text-gray-700">Missing variables:</p>
        <ul className="mt-1 list-disc pl-5 text-sm text-gray-600">
          {missing.map((key) => (
            <li key={key} className="font-mono">
              {key}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
