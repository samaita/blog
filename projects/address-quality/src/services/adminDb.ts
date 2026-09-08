import { PGlite } from "@electric-sql/pglite"

export interface AdminProvince {
  id: number
  code: string // "32"
  name: string // "Jawa Barat"
}

export interface AdminCity {
  id: number
  code: string // "32.73"
  kind: "Kota" | "Kabupaten"
  name: string // "Bandung"
  displayName: string // "Kota Bandung"
  province: AdminProvince
}

export interface AdminDistrict {
  id: number
  code: string // "32.73.19"
  name: string // "Sumur Bandung"
  cityCode: string
  cityDisplayName: string
  province: AdminProvince
}

/** Location levels the combobox resolves: province > city > district. */
export type AdminLevel = "province" | "city" | "district"

export interface AdminSelection {
  /** The record the user picked, identified by its database id. */
  level: AdminLevel
  id: number
  province: AdminProvince
  city: AdminCity | null
  district: AdminDistrict | null
}

/** AdminSelection with a precomputed dropdown label. */
export interface AdminSearchResult extends AdminSelection {
  label: string
}

type SeedCity = [string, string, string, string, Array<string>]

interface CityRow {
  id: number
  code: string
  kind: string
  name: string
  display_name: string
  province_name: string
}

const LEVEL_ORDER: Record<AdminLevel, number> = { province: 0, city: 1, district: 2 }

/** One-line label for a selection, e.g. "Jawa Barat · Kabupaten Bogor, Cibinong". */
export function selectionLabel(sel: AdminSelection): string {
  const chain =
    sel.city && sel.district ? `${sel.city.displayName}, ${sel.district.name}` : null
  if (sel.level === "province") return chain ? `${sel.province.name} · ${chain}` : sel.province.name
  return chain ?? sel.province.name
}

let dbPromise: Promise<PGlite> | null = null
let dbReady: Promise<PGlite> | null = null

/**
 * Normalize an administrative name for matching:
 * lowercase, strip parenthesized alternate spellings, drop punctuation,
 * collapse whitespace. Kind words (kota/kabupaten/kecamatan) are kept so that
 * "Kota Bandung" and "Kabupaten Bandung" stay distinct.
 */
export function normalizeAdminName(name: string): string {
  let n = name.toLowerCase().trim()
  n = n.replace(/\(([^)]*)\)/g, " ") // drop parenthesized alternates
  n = n.replace(/\bkec(?:amatan)?\b/g, " ") // kecamatan prefix is never part of the name
  n = n.replace(/\bkab(?:upaten)?\b/g, "kab")
  n = n.replace(/\bkota\b/g, "kota")
  n = n.replace(/[^a-z0-9\s]/g, " ")
  n = n.replace(/\s+/g, " ").trim()
  return n
}

/** Same as above but kind words stripped — used for search typing. */
export function normalizeSearchTerm(name: string): string {
  let n = normalizeAdminName(name)
  n = n.replace(/\b(?:kota|kab)\b/g, " ")
  return n.replace(/\s+/g, " ").trim()
}

async function initDb(): Promise<PGlite> {
  const db = new PGlite()
  await db.exec(`
    CREATE TABLE IF NOT EXISTS provinces (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL UNIQUE,
      name_norm TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cities (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      province_name TEXT NOT NULL REFERENCES provinces(name),
      full_norm TEXT NOT NULL,
      bare_norm TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS districts (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      city_code TEXT NOT NULL REFERENCES cities(code),
      name TEXT NOT NULL,
      name_norm TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_districts_city ON districts(city_code);
    CREATE INDEX IF NOT EXISTS idx_districts_name_norm ON districts(name_norm);
    CREATE INDEX IF NOT EXISTS idx_cities_full_norm ON cities(full_norm);
    CREATE INDEX IF NOT EXISTS idx_cities_bare_norm ON cities(bare_norm);
    CREATE INDEX IF NOT EXISTS idx_cities_province ON cities(province_name);
    CREATE INDEX IF NOT EXISTS idx_provinces_norm ON provinces(name_norm);
  `)
  return db
}

async function seed(db: PGlite): Promise<void> {
  const res = await fetch(`${import.meta.env.BASE_URL}wilayah-seed.json`)
  if (!res.ok) throw new Error(`Failed to load administrative data (${res.status})`)
  const seed = (await res.json()) as SeedCity[]

  // Provinces are derived from the seed: one record per unique province name,
  // coded by the two-digit prefix of its city codes ("32.73" -> "32" = Jawa
  // Barat). Codes are NOT unique — the upstream dump gives Papua Barat and
  // Papua Barat Daya both the "92" prefix — so provinces are keyed by name.
  const provinces = new Map<string, { code: string; name: string }>()
  for (const [code, , , province] of seed) {
    const pCode = code.split(".")[0]
    if (!provinces.has(province)) provinces.set(province, { code: pCode, name: province })
  }

  await db.exec("BEGIN")
  try {
    for (const { code, name } of provinces.values()) {
      await db.query(
        `INSERT INTO provinces (code, name, name_norm) VALUES ($1, $2, $3)`,
        [code, name, normalizeAdminName(name)],
      )
    }
    for (const [code, kind, name, province, districts] of seed) {
      const displayName = kind === "Kota" ? `Kota ${name}` : `Kabupaten ${name}`
      await db.query(
        `INSERT INTO cities (code, kind, name, display_name, province_name, full_norm, bare_norm)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          code,
          kind,
          name,
          displayName,
          province,
          normalizeAdminName(displayName),
          normalizeAdminName(name),
        ],
      )
      const districtRows: Array<[string, string, string]> = []
      for (let i = 0; i < districts.length; i += 2) {
        districtRows.push([districts[i], code, districts[i + 1]])
      }
      for (const [dCode, cCode, dName] of districtRows) {
        await db.query(
          `INSERT INTO districts (code, city_code, name, name_norm)
           VALUES ($1, $2, $3, $4)`,
          [dCode, cCode, dName, normalizeAdminName(dName)],
        )
      }
    }
    await db.exec("COMMIT")
  } catch (err) {
    await db.exec("ROLLBACK")
    throw err
  }
}

/**
 * Get (and lazily initialize + seed) the singleton PGlite instance.
 */
export function getAdminDb(): Promise<PGlite> {
  if (!dbPromise) {
    dbPromise = initDb()
    dbReady = dbPromise.then(async (db) => {
      const count = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM cities")
      if (!count.rows[0] || count.rows[0].count === 0) await seed(db)
      return db
    })
  }
  return dbReady as Promise<PGlite>
}

/**
 * Search provinces, cities, and districts by free text. Returns up to
 * `limit` results across all three levels, each indexed by its database id
 * (province > city > district). An empty query returns a default browse list —
 * priority provinces first, then the same priority cities (with their
 * districts) as before — so the combobox can open a dropdown before the user
 * types.
 */
/**
 * Row carrying a full province→city→district chain. Province and city
 * matches get a DEFAULT district attached (first by administrative code) so
 * the dropdown never offers a bare province/city: every pick resolves to a
 * kecamatan.
 */
type LocationRow = {
  p_id: number
  p_code: string
  p_name: string
  c_id: number
  c_code: string
  c_kind: string
  c_name: string
  c_display: string
  d_id: number
  d_code: string
  d_name: string
  own?: number
  city_own?: number
}

export async function searchAdmin(
  query: string,
  limit = 20,
): Promise<AdminSearchResult[]> {
  const db = await getAdminDb()
  const q = normalizeSearchTerm(query)
  const pat = `%${q}%`
  const rows: Array<{ rank: number; sel: AdminSelection }> = []

  const toSelection = (r: LocationRow) => {
    const province: AdminProvince = { id: r.p_id, code: r.p_code, name: r.p_name }
    const city: AdminCity = {
      id: r.c_id,
      code: r.c_code,
      kind: r.c_kind as AdminCity["kind"],
      name: r.c_name,
      displayName: r.c_display,
      province,
    }
    const district: AdminDistrict = {
      id: r.d_id,
      code: r.d_code,
      name: r.d_name,
      cityCode: r.c_code,
      cityDisplayName: r.c_display,
      province,
    }
    return { province, city, district }
  }

  /** Push a row; `id` is the ORIGIN record's id (province/city/district). */
  const pushRow = (level: AdminLevel, id: number, r: LocationRow, rank: number) => {
    rows.push({ rank, sel: { level, id, ...toSelection(r) } })
  }

  const provinceDefaultSql = `
    SELECT p.id AS p_id, p.code AS p_code, p.name AS p_name,
           dc.id AS c_id, dc.code AS c_code, dc.kind AS c_kind, dc.name AS c_name,
           dc.display_name AS c_display,
           dd.id AS d_id, dd.code AS d_code, dd.name AS d_name
    FROM provinces p
    JOIN LATERAL (
      SELECT * FROM cities WHERE province_name = p.name ORDER BY code LIMIT 1
    ) dc ON true
    JOIN LATERAL (
      SELECT * FROM districts WHERE city_code = dc.code ORDER BY code LIMIT 1
    ) dd ON true
  `

  if (q) {
    // province level — direct name match, wrapped with the province's default
    // city + default district so the pick carries a full chain
    const provRes = await db.query<LocationRow>(
      `${provinceDefaultSql}
       WHERE p.name_norm LIKE $1
       ORDER BY p.code, p.name LIMIT $2`,
      [pat, limit],
    )
    for (const r of provRes.rows) pushRow("province", r.p_id, r, 1)

    // city level — own-name matches rank highest, cities inside a matching
    // province rank lower; each carries its default district
    const cityRes = await db.query<LocationRow>(
      `SELECT c.id AS c_id, c.code AS c_code, c.kind AS c_kind, c.name AS c_name,
              c.display_name AS c_display,
              p.id AS p_id, p.code AS p_code, p.name AS p_name,
              dd.id AS d_id, dd.code AS d_code, dd.name AS d_name,
              (c.bare_norm LIKE $1 OR c.full_norm LIKE $1)::int AS own
       FROM cities c
       JOIN provinces p ON p.name = c.province_name
       JOIN LATERAL (
         SELECT * FROM districts WHERE city_code = c.code ORDER BY code LIMIT 1
       ) dd ON true
       WHERE c.bare_norm LIKE $1 OR c.full_norm LIKE $1 OR p.name_norm LIKE $1
       ORDER BY c.code LIMIT $2`,
      [pat, limit],
    )
    for (const r of cityRes.rows) pushRow("city", r.c_id, r, r.own ? 1 : 2)

    // district level — own name matches rank highest, then own-city matches,
    // then districts inside a matching province
    const districtRes = await db.query<LocationRow>(
      `SELECT d.id AS d_id, d.code AS d_code, d.name AS d_name,
              c.id AS c_id, c.code AS c_code, c.kind AS c_kind, c.name AS c_name,
              c.display_name AS c_display,
              p.id AS p_id, p.code AS p_code, p.name AS p_name,
              (d.name_norm LIKE $1)::int AS own,
              (c.bare_norm LIKE $1 OR c.full_norm LIKE $1)::int AS city_own
       FROM districts d
       JOIN cities c ON c.code = d.city_code
       JOIN provinces p ON p.name = c.province_name
       WHERE d.name_norm LIKE $1 OR c.bare_norm LIKE $1 OR c.full_norm LIKE $1
          OR p.name_norm LIKE $1
       ORDER BY d.code LIMIT $2`,
      [pat, limit],
    )
    for (const r of districtRes.rows) pushRow("district", r.d_id, r, r.own ? 1 : r.city_own ? 2 : 3)
  } else {
    // default browse list — provinces hosting the priority cities lead (with
    // their default city+district), then the priority cities with districts
    const provRes = await db.query<LocationRow>(
      `${provinceDefaultSql}
       WHERE p.code IN ('31','32','35','34','33','12','73','51','36','62','16')
       ORDER BY CASE p.code
         WHEN '31' THEN 1  WHEN '32' THEN 2  WHEN '35' THEN 3  WHEN '34' THEN 4
         WHEN '33' THEN 5  WHEN '12' THEN 6  WHEN '73' THEN 7  WHEN '51' THEN 8
         WHEN '36' THEN 9  WHEN '62' THEN 10 WHEN '16' THEN 11
         ELSE 99 END, p.code
       LIMIT $1`,
      [limit],
    )
    for (const r of provRes.rows) pushRow("province", r.p_id, r, 0)

    const districtRes = await db.query<LocationRow>(
      `SELECT d.id AS d_id, d.code AS d_code, d.name AS d_name,
              c.id AS c_id, c.code AS c_code, c.kind AS c_kind, c.name AS c_name,
              c.display_name AS c_display,
              p.id AS p_id, p.code AS p_code, p.name AS p_name
       FROM districts d
       JOIN cities c ON c.code = d.city_code
       JOIN provinces p ON p.name = c.province_name
       ORDER BY CASE c.code
         WHEN '31.71' THEN 1  WHEN '31.72' THEN 2  WHEN '31.73' THEN 3
         WHEN '31.74' THEN 4  WHEN '31.75' THEN 5  WHEN '32.73' THEN 6
         WHEN '32.71' THEN 7  WHEN '35.78' THEN 8  WHEN '34.71' THEN 9
         WHEN '33.74' THEN 10 WHEN '12.71' THEN 11 WHEN '73.71' THEN 12
         WHEN '51.71' THEN 13 WHEN '32.76' THEN 14 WHEN '32.75' THEN 15
         WHEN '36.71' THEN 16 WHEN '33.73' THEN 17 WHEN '35.71' THEN 18
         WHEN '62.71' THEN 19 WHEN '16.71' THEN 20
         ELSE 999 END,
         c.code, d.code
       LIMIT $1`,
      [limit],
    )
    for (const r of districtRes.rows) pushRow("district", r.d_id, r, 1)
  }

  rows.sort(
    (a, b) =>
      a.rank - b.rank ||
      LEVEL_ORDER[a.sel.level] - LEVEL_ORDER[b.sel.level] ||
      selectionLabel(a.sel).localeCompare(selectionLabel(b.sel)),
  )
  return rows.slice(0, limit).map(({ sel }) => ({ ...sel, label: selectionLabel(sel) }))
}

/**
 * Match an API-resolved province/city/district against the local dataset.
 * Prefers the full normalized form ("kota bandung") so Kota and Kabupaten stay
 * distinct, then falls back to the bare name. District must live inside the
 * matched city. Returns the narrowest trusted selection (province -> city ->
 * district), or null when nothing matches locally.
 */
export async function matchAdmin(
  province: string | null,
  city: string | null,
  district: string | null,
): Promise<AdminSelection | null> {
  const db = await getAdminDb()
  const provNorm = province ? normalizeAdminName(province) : null
  const cityFull = city ? normalizeAdminName(city) : null
  const cityBare = city
    ? normalizeAdminName(city.replace(/^\s*(kota|kab\.?|kabupaten)\s+/i, ""))
    : null
  const districtNorm = district ? normalizeAdminName(district) : null

  let matchedProvince: AdminProvince | null = null
  if (provNorm) {
    const res = await db.query<{ id: number; code: string; name: string }>(
      `SELECT id, code, name FROM provinces WHERE name_norm = $1 LIMIT 1`,
      [provNorm],
    )
    const r = res.rows[0] ?? null
    if (r) matchedProvince = { id: r.id, code: r.code, name: r.name }
  }

  let cityRow: (CityRow & { p_id: number; p_code: string; p_name: string }) | null = null
  if (cityFull || cityBare) {
    const res = await db.query<CityRow & { p_id: number; p_code: string; p_name: string }>(
      `SELECT c.id, c.code, c.kind, c.name, c.display_name, c.province_name,
              p.id AS p_id, p.code AS p_code, p.name AS p_name
       FROM cities c
       JOIN provinces p ON p.name = c.province_name
       WHERE c.full_norm = $1 OR c.full_norm = $2 OR c.bare_norm = $2
       ORDER BY (c.full_norm = $1) DESC, (c.full_norm = $2) DESC, c.code
       LIMIT 1`,
      [cityFull ?? "", cityBare ?? ""],
    )
    cityRow = res.rows[0] ?? null
  }

  if (!matchedProvince && !cityRow) return null

  const provinceObj: AdminProvince =
    matchedProvince ?? {
      id: cityRow!.p_id,
      code: cityRow!.p_code,
      name: cityRow!.p_name,
    }

  if (cityRow) {
    const adminCity: AdminCity = {
      id: cityRow.id,
      code: cityRow.code,
      kind: cityRow.kind as AdminCity["kind"],
      name: cityRow.name,
      displayName: cityRow.display_name,
      province: provinceObj,
    }
    if (!districtNorm) {
      return { level: "city", id: adminCity.id, province: provinceObj, city: adminCity, district: null }
    }

    const dRes = await db.query<{ id: number; code: string; name: string }>(
      `SELECT id, code, name FROM districts
       WHERE city_code = $1 AND name_norm = $2
       LIMIT 1`,
      [adminCity.code, districtNorm],
    )
    const dRow = dRes.rows[0] ?? null
    if (!dRow) {
      return { level: "city", id: adminCity.id, province: provinceObj, city: adminCity, district: null }
    }

    const adminDistrict: AdminDistrict = {
      id: dRow.id,
      code: dRow.code,
      name: dRow.name,
      cityCode: adminCity.code,
      cityDisplayName: adminCity.displayName,
      province: provinceObj,
    }
    return {
      level: "district",
      id: adminDistrict.id,
      province: provinceObj,
      city: adminCity,
      district: adminDistrict,
    }
  }

  // Only the province matched locally — still a valid province-level pick.
  return { level: "province", id: provinceObj.id, province: provinceObj, city: null, district: null }
}
