import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import Container from "@/components/layout/Container"
import { Button } from "@cloudflare/kumo/components/button"
import { SparklesIcon } from "@/components/icons"
import AdminComboBox from "@/components/shipping/AdminComboBox"
import useShippingLookup from "@/hooks/useShippingLookup"

const countries = ["Indonesia", "Malaysia"] as const
type Country = (typeof countries)[number]

const initialForm = {
  name: "",
  phone: "",
  address: "",
}

const helperCopy: Record<string, string> = {
  "low-confidence": "Pilih kota dan kecamatan.",
  "no-match":
    "Kami menemukan kemungkinan lokasi, tetapi belum dapat mencocokkannya dengan data wilayah. Silakan pilih kota dan kecamatan.",
  "api-error": "Alamat tidak dapat diperiksa saat ini. Silakan pilih kota dan kecamatan.",
}

export default function ShippingDemo() {
  const [form, setForm] = useState(initialForm)
  const [country] = useState<Country>("Indonesia")
  const [submitted, setSubmitted] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const { status, result, selection, manualReason, onAddressChange, onManualSelect, resetManualOverride } =
    useShippingLookup()

  const revealAdminFields = status !== "idle"

  const errors = useMemo(() => {
    const errs: { name?: string; phone?: string; address?: string; kota?: string } = {}
    if (form.name.trim() === "") errs.name = "Nama Penerima wajib diisi."
    if (form.phone.trim() === "") errs.phone = "Nomor HP Penerima wajib diisi."
    if (form.address.trim() === "") errs.address = "Detail Alamat wajib diisi."
    if (revealAdminFields && !selection) errs.kota = "Pilih kota dan kecamatan."
    return errs
  }, [form, revealAdminFields, selection])

  const formValid = Object.keys(errors).length === 0

  const kotaHelper = useMemo(() => {
    if (showErrors && errors.kota) return errors.kota
    if (status === "auto-filled") return "Periksa kembali apakah lokasi ini sudah benar."
    if (manualReason) return helperCopy[manualReason]
    return undefined
  }, [showErrors, errors.kota, status, manualReason])

  const payload = useMemo(() => {
    if (!submitted || !selection) return null
    return {
      recipient_name: form.name.trim(),
      recipient_phone: form.phone.trim(),
      address: form.address.trim(),
      country,
      city: selection.city.displayName,
      district: selection.district.name,
      address_quality: result
        ? {
            confidence: result.data.confidence,
            status: result.data.status,
            source: status === "auto-filled" ? "auto" : "manual",
          }
        : { source: "manual" },
    }
  }, [submitted, selection, form, country, result, status])

  return (
    <Container className="pb-24">
      <div className="py-12 lg:py-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">Demo</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-surface-900 sm:text-4xl">
          Shipping Address Demo
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-surface-500">
          Pelanggan sering mengetik alamat lengkap, lalu diminta memilih lokasi yang sama
          lagi. Demo ini menggunakan Address Quality untuk mengambil{" "}
          <span className="text-surface-900">Kota/Kabupaten</span> dan{" "}
          <span className="text-surface-900">Kecamatan</span> langsung dari teks alamat —
          pengguna cukup memverifikasi hasilnya.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
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
                Nama Penerima
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
                placeholder="Balon"
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
                Nomor HP Penerima
              </label>
              <input
                id="recipient-phone"
                type="tel"
                required
                value={form.phone}
                onChange={(e) => {
                  setForm({ ...form, phone: e.target.value })
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
                Detail Alamat
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
                  status === "loading"
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
              {status === "loading" && (
                <p id="detail-address-status" aria-live="polite" className="mt-1 text-sm text-surface-500">
                  Memeriksa alamat...
                </p>
              )}
            </div>

            {revealAdminFields && (
              <div
                className={`rounded-xl p-4 ${
                  status === "auto-filled"
                    ? "border border-accent-200 bg-accent-50/50"
                    : "border border-surface-200"
                }`}
              >
                <AdminComboBox
                  id="kota-kecamatan"
                  label="Kota & Kecamatan"
                  value={selection}
                  onSelect={onManualSelect}
                  helperText={kotaHelper}
                  invalid={showErrors && !!errors.kota}
                  accent={status === "auto-filled"}
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

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="lg">
                Simpan
              </Button>
            </div>
          </div>
        </form>

        {/* side panel */}
        <aside className="flex flex-col gap-6">
          <div className="rounded-2xl border border-surface-200 bg-surface-50 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-500">
              Tentang demo ini
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-surface-600">
              Pelanggan sering mengetik alamat lengkap lalu diminta memilih lokasi yang
              sama lagi. Address Quality mengambil Kota/Kabupaten dan Kecamatan dari teks
              alamat, sambil tetap meminta pengguna memverifikasi hasil yang belum pasti.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-surface-600">
              <li className="flex gap-2">
                <span aria-hidden="true">•</span> Validasi berjalan otomatis setelah Anda
                selesai mengetik (debounce 800ms).
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">•</span> Hasil dengan confidence ≥ 0.80 diisi
                otomatis dan dapat diubah.
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">•</span> Opsi wilayah berasal dari data resmi
                Kemendagri, disimpan lokal di browser (PGlite).
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

          {submitted && payload && (
            <div className="rounded-2xl border border-surface-200 bg-white p-6" aria-live="polite">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-500">
                Submitted payload
              </h2>
              <pre className="mt-3 overflow-auto rounded-xl bg-surface-50 p-4 text-xs leading-relaxed text-surface-800">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          )}
        </aside>
      </div>
    </Container>
  )
}
