import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { MagnifyingGlassIcon, MapPinIcon } from "@/components/icons"
import { searchAdmin, type AdminSelection } from "@/services/adminDb"

const RESULT_LIMIT = 20
/** Debounce for PGlite search queries while typing. */
const SEARCH_DEBOUNCE_MS = 200

type AdminComboBoxProps = {
  id: string
  label: string
  placeholder?: string
  value: AdminSelection | null
  onSelect: (selection: AdminSelection) => void
  helperText?: string
  autoFocus?: boolean
  /** Red border — used when the form was submitted without a selection. */
  invalid?: boolean
  /** Accent border — used for auto-detected values. */
  accent?: boolean
  /** Chip rendered next to the label (e.g. "Auto-detected"). */
  badge?: React.ReactNode
}

/**
 * Searchable kota/kecamatan combobox backed by PGlite.
 * Results show full hierarchy: "Kota Bandung, Sumur Bandung".
 */
export default function AdminComboBox({
  id,
  label,
  placeholder = "Search kota atau kecamatan...",
  value,
  onSelect,
  helperText,
  autoFocus,
  invalid = false,
  accent = false,
  badge,
}: AdminComboBoxProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Array<AdminSelection & { label: string }>>([])
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const [searchError, setSearchError] = useState(false)
  const [loading, setLoading] = useState(false)

  const inputId = useId()
  const listboxId = `${id}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchIdRef = useRef(0)

  // While open with a typed query, show the query — otherwise a previous
  // selection would swallow the user's typing. Closed shows the selection.
  const displayValue = useMemo(() => {
    const label = value ? `${value.city.displayName}, ${value.district.name}` : ""
    if (open) return query || label
    return label || query
  }, [value, query, open])

  // debounced PGlite search
  useEffect(() => {
    const q = query.trim()
    if (!open) return

    const id2 = ++searchIdRef.current
    if (!q) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const found = await searchAdmin(q, RESULT_LIMIT)
        if (id2 !== searchIdRef.current) return // stale
        setResults(found)
        setSearchError(false)
        setHighlighted(0)
      } catch {
        if (id2 !== searchIdRef.current) return
        setSearchError(true)
        setResults([])
      } finally {
        if (id2 === searchIdRef.current) setLoading(false)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query, open])

  // close on outside click
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [open])

  const choose = useCallback(
    (sel: AdminSelection) => {
      onSelect(sel)
      setQuery("")
      setResults([])
      setOpen(false)
      inputRef.current?.blur()
    },
    [onSelect],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      if (results.length === 0) return
      setHighlighted((h) => {
        const dir = e.key === "ArrowDown" ? 1 : -1
        return (h + dir + results.length) % results.length
      })
    } else if (e.key === "Enter" && open && results[highlighted]) {
      e.preventDefault()
      choose(results[highlighted])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="block text-sm font-medium text-surface-900">
          {label}
        </label>
        {badge}
      </div>
      <div className="relative mt-1.5">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-invalid={invalid || undefined}
          aria-describedby={helperText ? `${id}-helper` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-10 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 ${
            invalid
              ? "border-red-300 focus:border-red-400 focus:ring-red-500/20"
              : accent
                ? "border-accent-300 focus:border-accent-500 focus:ring-accent-500/20"
                : "border-surface-200 focus:border-accent-500 focus:ring-accent-500/20"
          }`}
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => {
            // If the input still shows a previous selection's label, a typed
            // character starting from the label is a fresh query, not an edit
            // of the old value (caret at end / no selection happened).
            const typed = e.target.value
            if (value && open && typed !== "") {
              const currentLabel = `${value.city.displayName}, ${value.district.name}`
              if (typed.startsWith(currentLabel) && typed.length > currentLabel.length) {
                setQuery(typed.slice(currentLabel.length))
                return
              }
              // caret mid-label: whole label replaced by the typed text — fall through
            }
            setQuery(typed)
            setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            // Select the whole label so typing replaces it instead of appending.
            if (value) requestAnimationFrame(() => inputRef.current?.select())
          }}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <MapPinIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-600" />
        )}
      </div>

      {open && (loading || searchError || results.length > 0 || query.trim()) && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={`${label} options`}
          className="absolute z-20 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-surface-200 bg-white py-1 shadow-lg"
        >
          {loading && (
            <li className="px-4 py-2 text-sm text-surface-500" role="status">
              Mencari...
            </li>
          )}
          {!loading && searchError && (
            <li className="px-4 py-2 text-sm text-surface-500" role="status">
              Data wilayah belum tersedia.
            </li>
          )}
          {!loading && !searchError && results.length === 0 && (
            <li className="px-4 py-2 text-sm text-surface-500" role="status">
              Tidak ada hasil untuk &ldquo;{query.trim()}&rdquo;.
            </li>
          )}
          {!loading &&
            results.map((r, i) => (
              <li key={r.district.code} role="option" aria-selected={i === highlighted}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => choose(r)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${
                    i === highlighted ? "bg-accent-50 text-surface-900" : "text-surface-700"
                  }`}
                >
                  <span className="font-medium">{r.district.name}</span>
                  <span className="text-xs text-surface-500">{r.city.displayName}</span>
                </button>
              </li>
            ))}
        </ul>
      )}

      {helperText && (
        <p
          id={`${id}-helper`}
          aria-live="polite"
          className={`mt-1.5 text-sm ${invalid ? "text-red-600" : "text-surface-500"}`}
        >
          {helperText}
        </p>
      )}
    </div>
  )
}
