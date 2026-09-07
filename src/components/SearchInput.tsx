import type { InputHTMLAttributes } from 'react'

// Text input with a leading Material Symbols "search" glyph for visibility.
// The caller styles the input itself via `className`; this component only
// reserves room for the icon and positions it. `containerClassName` covers
// the wrapper's layout (margins, width constraints).
export function SearchInput({
  className = '',
  containerClassName = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { containerClassName?: string }) {
  return (
    <div className={`relative ${containerClassName}`}>
      <span
        className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[20px] text-gray-400"
        aria-hidden="true"
      >
        search
      </span>
      <input {...props} className={`w-full pl-9 ${className}`} />
    </div>
  )
}
