import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import Container from "@/components/layout/Container"
import { Button } from "@cloudflare/kumo/components/button"
import { SparklesIcon } from "@/components/icons"
import AdminComboBox from "@/components/address/AdminComboBox"
import useAddressLookup, { CONFIDENCE_THRESHOLD } from "@/hooks/useAddressLookup"
import { normalizeAdminName } from "@/services/adminDb"
import { EXAMPLE_ADDRESSES } from "@/data/mock"

const countries = ["Indonesia", "Malaysia"] as const
type Country = (typeof countries)[number]

const initialForm = {
  name: "",
  phone: "",
  address: "",
}

const helperCopy: Record<string, string> = {
  "low-confidence": "Pick a city and district.",
  "no-match":
    "We found a possible location, but could not match it to regional data. Please pick a city and district.",
  "api-error": "The address could not be checked right now. Please pick a city and district.",
}

/** Three sample addresses reused from the Playground page. */
const EXAMPLE_SELECTIONS = EXAMPLE_ADDRESSES.slice(0, 3)

const EXAMPLE_RECIPIENT = {
  name: "Gary",
  phone: "6280989999",
}

export default function AddressDemo() {
  const [form, setForm] = useState(initialForm)
  const [country] = useState<Country>("Indonesia")
  const [submitted, setSubmitted] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const { status, result, selection, manualReason, onAddressChange, startLookup, onManualSelect, resetManualOverride } =
    useAddressLookup()

  const revealAdminFields = status !== "idle"

  const errors = useMemo(() => {
    const errs: { name?: string; phone?: string; address?: string; kota?: string } = {}
    if (form.name.trim() === "") errs.name = "Recipient name is required."
    if (form.phone.trim() === "") errs.phone = "Recipient phone is required."
    if (form.address.trim() === "") errs.address = "Address details are required."
    if (revealAdminFields && !selection) errs.kota = "Pick a location."
    return errs
  }, [form, revealAdminFields, selection])

  const formValid = Object.keys(errors).length === 0

  const kotaHelper = useMemo(() => {
    if (showErrors && errors.kota) return errors.kota
    if (status === "auto-filled") return "Double-check this location is correct."
    if (manualReason) return helperCopy[manualReason]
    return undefined
  }, [showErrors, errors.kota, status, manualReason])

  const isLoading = status === "loading"

  const payload = useMemo(() => {
    if (!submitted || !selection) return null

    /**
     * address_suggestion — did the committed selection come from Address Quality?
     * USED             : selection matches the API suggestion (confidence ≥ 0.8)
     * UNUSED           : user picked a different city/district via the dropdown
     * BELOW_THRESHOLD  : API confidence below threshold (or lookup failed/no result)
     */
    const { confidence, location } = result?.data ?? {}
    const suggested =
      result != null &&
      (confidence ?? 0) >= CONFIDENCE_THRESHOLD &&
      Boolean(location?.city?.trim()) &&
      Boolean(location?.district?.trim())

    let addressSuggestion: "USED" | "UNUSED" | "BELOW_THRESHOLD" = "BELOW_THRESHOLD"
    if (suggested && location) {
      const sameCity =
        selection.city != null &&
        normalizeAdminName(location.city) === normalizeAdminName(selection.city.displayName)
      const sameDistrict =
        selection.district != null &&
        normalizeAdminName(location.district) === normalizeAdminName(selection.district.name)
      addressSuggestion = sameCity && sameDistrict ? "USED" : "UNUSED"
    }

    return {
      recipient_name: form.name.trim(),
      recipient_phone: form.phone.trim(),
      address: form.address.trim(),
      country,
      province: selection.province.name,
      province_id: selection.province.id,
      city: selection.city ? selection.city.displayName : null,
      city_id: selection.city ? selection.city.id : null,
      district: selection.district ? selection.district.name : null,
      district_id: selection.district ? selection.district.id : null,
      address_suggestion: addressSuggestion,
      address_quality: result
        ? {
            confidence: result.data.confidence,
            status: result.data.status,
            source: status === "auto-filled" ? "auto" : "manual",
          }
        : { source: "manual" },
    }
  }, [submitted, selection, form, country, result, status])

  /** Fill the form from an example: recipient + address, then run the lookup
   *  immediately so Save stays disabled until the API responds. */
  const applyExample = (address: string) => {
    setForm({ ...EXAMPLE_RECIPIENT, address })
    setSubmitted(false)
    setShowErrors(false)
    resetManualOverride()
    startLookup(address)
  }

  return (
    <Container className="pb-24">
      <div className="py-12 lg:py-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">Demo</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-surface-900 sm:text-4xl">
          Address Demo
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-surface-500">
          Customers often type a full address and are then asked to pick the very same
          location again. This demo uses Address Quality to pull the{" "}
          <span className="text-surface-900">City/Regency</span> and{" "}
          <span className="text-surface-900">District</span> straight from the address
          text — the user only needs to verify the result.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* form column: form + result payload */}
        <div className="flex min-w-0 flex-col gap-8">
        {/* form card */}
        <form
          noValidate
          className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm sm:p-8"
          onSubmit={(e) => {
            e.preventDefault()
            setSubmitted(false)
            setShowErrors(true)
            if (formValid) setSubmitted(true)
          }}
        >
          <div className="flex flex-col gap-5">
            <div>
              <label
                htmlFor="recipient-name"
                className="block text-sm font-medium text-surface-900"
              >
                Recipient Name
              </label>
              <input
                id="recipient-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value })
                  if (showErrors) setShowErrors(false)
                }}
                aria-invalid={showErrors && errors.name ? true : undefined}
                aria-describedby={showErrors && errors.name ? "name-error" : undefined}
                placeholder="e.g. Balon"
                className={`mt-1.5 w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 ${
                  showErrors && errors.name
                    ? "border-red-300 focus:border-red-400 focus:ring-red-500/20"
                    : "border-surface-200 focus:border-accent-500 focus:ring-accent-500/20"
                }`}
              />
              {showErrors && errors.name && (
                <p id="name-error" className="mt-1.5 text-sm text-red-600">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="recipient-phone"
                className="block text-sm font-medium text-surface-900"
              >
                Recipient Phone
              </label>
              <input
                id="recipient-phone"
                type="tel"
                required
                value={form.phone}
                onChange={(e) => {
                  // Only allow an optional leading "+" followed by digits.
                  const cleaned = e.target.value.replace(/[^+\d]/g, "").replace(/(?!^)\+/g, "")
                  setForm({ ...form, phone: cleaned })
                  if (showErrors) setShowErrors(false)
                }}
                aria-invalid={showErrors && errors.phone ? true : undefined}
                aria-describedby={showErrors && errors.phone ? "phone-error" : undefined}
                placeholder="+628111564567"
                className={`mt-1.5 w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 ${
                  showErrors && errors.phone
                    ? "border-red-300 focus:border-red-400 focus:ring-red-500/20"
                    : "border-surface-200 focus:border-accent-500 focus:ring-accent-500/20"
                }`}
              />
              {showErrors && errors.phone && (
                <p id="phone-error" className="mt-1.5 text-sm text-red-600">
                  {errors.phone}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="detail-address"
                className="block text-sm font-medium text-surface-900"
              >
                Address Details
              </label>
              <textarea
                id="detail-address"
                required
                rows={3}
                value={form.address}
                onChange={(e) => {
                  setForm({ ...form, address: e.target.value })
                  setSubmitted(false)
                  setShowErrors(false)
                  resetManualOverride()
                  onAddressChange(e.target.value)
                }}
                aria-invalid={showErrors && errors.address ? true : undefined}
                aria-describedby={
                  isLoading
                    ? "detail-address-status"
                    : showErrors && errors.address
                      ? "detail-address-error"
                      : undefined
                }
                placeholder="Jl. Wastukencana No.2, Babakan Ciamis, Kec. Sumur Bandung, Kota Bandung, Jawa Barat 40117"
                className={`mt-1.5 w-full resize-y rounded-xl border bg-white px-4 py-2.5 text-sm leading-relaxed text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 ${
                  showErrors && errors.address
                    ? "border-red-300 focus:border-red-400 focus:ring-red-500/20"
                    : "border-surface-200 focus:border-accent-500 focus:ring-accent-500/20"
                }`}
              />
              {showErrors && errors.address && (
                <p id="detail-address-error" className="mt-1 text-sm text-red-600">
                  {errors.address}
                </p>
              )}
              {isLoading && (
                <p id="detail-address-status" aria-live="polite" className="mt-1 text-sm text-surface-500">
                  Checking address...
                </p>
              )}
            </div>

            {revealAdminFields && (
              <div className="rounded-xl bg-surface-50 p-4">
                <AdminComboBox
                  id="kota-kecamatan"
                  label="Location"
                  placeholder="Search province, city, or district..."
                  value={selection}
                  onSelect={onManualSelect}
                  helperText={kotaHelper}
                  invalid={showErrors && !!errors.kota}
                  disabled={isLoading}
                  badge={
                    status === "auto-filled" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent-200 bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700">
                        <SparklesIcon className="h-3 w-3" aria-hidden="true" />
                        Auto-detected
                      </span>
                    ) : undefined
                  }
                />
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-surface-400">
                No information is submitted when you click Save — this is a client-side
                demo only.
              </p>
              <div className="shrink-0">
                <Button type="submit" variant="primary" size="lg" disabled={isLoading}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </form>

        {submitted && payload && (
          <div className="rounded-2xl border border-surface-200 bg-white p-6" aria-live="polite">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-500">
              Result payload
            </h2>
            <pre className="mt-3 overflow-auto rounded-xl bg-surface-50 p-4 text-xs leading-relaxed text-surface-800">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        )}
        </div>

        {/* side panel */}
        <aside className="flex min-w-0 flex-col gap-6">
          <div className="rounded-2xl border border-surface-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-500">
              Example addresses
            </h2>
            <p className="mt-2 text-sm text-surface-500">
              Fill the form instantly with a sample recipient and address.
            </p>
            <ul className="mt-3 space-y-2">
              {EXAMPLE_SELECTIONS.map((address) => (
                <li key={address}>
                  <button
                    type="button"
                    onClick={() => applyExample(address)}
                    className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-left text-xs leading-relaxed text-surface-700 transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-surface-900"
                  >
                    {address}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-surface-200 bg-surface-50 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-500">
              About this demo
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-surface-600">
              Customers often type a full address and are then asked to pick the same
              location again. Address Quality extracts the City and District from
              the address text, while still asking the user to verify uncertain results.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-surface-600">
              <li className="flex gap-2">
                <span aria-hidden="true">•</span> Validation runs automatically after you
                finish typing (800ms debounce).
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">•</span> Results with confidence ≥ 0.80 are
                auto-filled and can be changed.
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">•</span> Region options come from official
                Kemendagri data, stored locally in your browser (PGlite).
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Link
                to="/"
                className="font-medium text-accent-600 hover:text-accent-700"
              >
                &larr; Address Quality
              </Link>
              <Link to="/docs" className="font-medium text-accent-600 hover:text-accent-700">
                API Docs
              </Link>
              <Link
                to="/playground"
                className="font-medium text-accent-600 hover:text-accent-700"
              >
                Playground
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </Container>
  )
}
