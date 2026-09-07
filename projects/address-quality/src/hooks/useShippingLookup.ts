import { useCallback, useEffect, useRef, useState } from "react"
import { validateAddress as callApi } from "@/services/api"
import { matchAdmin, type AdminSelection } from "@/services/adminDb"
import type { AddressResponse } from "@/types/api"

const DEBOUNCE_MS = 800
const CONFIDENCE_THRESHOLD = 0.8
/** Below this length (trimmed), an address is not worth a lookup. */
const MIN_ADDRESS_LENGTH = 8

export type LookupStatus =
  | "idle"
  | "loading"
  | "auto-filled"
  | "manual-required"
  | "matched-partial"
  | "error"

/**
 * Debounced address-quality lookup driving the shipping form reveal logic.
 *
 * Stale-response protection:
 * - debounce timer reset on every keystroke
 * - a monotonically increasing lookupId: a response whose id is no longer
 *   current is discarded (also covers out-of-order completions)
 * - a manual override flag: once the user picks their own kota/kecamatan,
 *   later API responses never overwrite it. If Detail Alamat changes to a
 *   substantially different address, a fresh lookup is allowed to update the
 *   field again (handled by the page resetting the override when the address
 *   changes).
 */
export default function useShippingLookup() {
  const [status, setStatus] = useState<LookupStatus>("idle")
  const [result, setResult] = useState<AddressResponse | null>(null)
  const [selection, setSelection] = useState<AdminSelection | null>(null)
  const [manualReason, setManualReason] = useState<
    "low-confidence" | "no-match" | "api-error" | undefined
  >(undefined)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lookupIdRef = useRef(0)
  const lastRequestedRef = useRef<string>("")
  const manualOverrideRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => clearTimer, [clearTimer])

  const runLookup = useCallback(async (address: string) => {
    const id = ++lookupIdRef.current
    setStatus("loading")

    let response: AddressResponse
    try {
      response = await callApi({ address })
    } catch {
      if (id !== lookupIdRef.current) return // stale
      setStatus("error")
      setManualReason("api-error")
      setResult(null)
      setSelection(null)
      return
    }

    if (id !== lookupIdRef.current) return // stale response — a newer lookup owns the UI
    setResult(response)

    const { confidence, location, status: apiStatus } = response.data

    const hasLocation =
      Boolean(location?.city?.trim()) && Boolean(location?.district?.trim())

    // Case B: low confidence → manual selection, no guessed value shown
    if (!hasLocation || confidence < CONFIDENCE_THRESHOLD) {
      setStatus("manual-required")
      setManualReason("low-confidence")
      setSelection(null)
      return
    }

    // Case A/C: high confidence → resolve against local PGlite data
    const matched = await matchAdmin(location.city, location.district)

    if (id !== lookupIdRef.current) return // became stale while querying PGlite

    if (matched && matched.district) {
      if (manualOverrideRef.current) return // user already chose; never overwrite
      setStatus("auto-filled")
      setSelection({
        city: matched.city,
        district: matched.district,
      })
      setManualReason(undefined)
      if (import.meta.env.DEV) {
        console.debug("[shipping-demo] autofill", {
          apiStatus,
          confidence,
          city: matched.city.displayName,
          district: matched.district.name,
        })
      }
    } else if (matched && !matched.district) {
      // City matched but the district is not in that city → manual
      if (manualOverrideRef.current) return
      setStatus("matched-partial")
      setManualReason("no-match")
      setSelection(null)
      if (import.meta.env.DEV) {
        console.debug("[shipping-demo] city matched, district not found", {
          apiStatus,
          confidence,
          apiCity: location.city,
          apiDistrict: location.district,
        })
      }
    } else {
      // Case C: nothing matched locally → manual with warning
      if (manualOverrideRef.current) return
      setStatus("manual-required")
      setManualReason("no-match")
      setSelection(null)
      if (import.meta.env.DEV) {
        console.debug("[shipping-demo] no PGlite match for API result", {
          apiStatus,
          confidence,
          apiCity: location.city,
          apiDistrict: location.district,
        })
      }
    }
  }, [])

  /** Call on every Detail Alamat change. Starts/clears the debounce timer. */
  const onAddressChange = useCallback(
    (value: string) => {
      clearTimer()
      const trimmed = value.trim()

      if (trimmed.length < MIN_ADDRESS_LENGTH) {
        // too short to be meaningful — reset to idle without a request
        lookupIdRef.current++ // invalidate any in-flight lookup
        setStatus("idle")
        setResult(null)
        setSelection(null)
        setManualReason(undefined)
        return
      }

      timerRef.current = setTimeout(() => {
        if (lastRequestedRef.current === trimmed) return // unchanged since last request
        lastRequestedRef.current = trimmed
        void runLookup(trimmed)
      }, DEBOUNCE_MS)
    },
    [clearTimer, runLookup],
  )

  /** User picked their own kota/kecamatan — protect from future overwrites. */
  const onManualSelect = useCallback((sel: AdminSelection) => {
    manualOverrideRef.current = true
    setStatus("manual-required")
    setManualReason(undefined)
    setSelection(sel)
    if (import.meta.env.DEV) {
      console.debug(
        "[shipping-demo] manual override",
        `${sel.city.displayName}, ${sel.district.name}`,
      )
    }
  }, [])

  /** Clear a manual override (e.g. address changed substantially). */
  const resetManualOverride = useCallback(() => {
    manualOverrideRef.current = false
  }, [])

  return {
    status,
    result,
    selection,
    manualReason,
    onAddressChange,
    onManualSelect,
    resetManualOverride,
  } as const
}
