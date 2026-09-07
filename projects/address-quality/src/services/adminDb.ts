import { PGlite } from "@electric-sql/pglite"

export interface AdminCity {
  code: string // "32.73"
  kind: "Kota" | "Kabupaten"
  name: string // "Bandung"
  displayName: string // "Kota Bandung"
  province: string // "Jawa Barat"
}

export interface AdminDistrict {
  code: string // "32.73.19"
  name: string // "Sumur Bandung"
  cityCode: string
  cityDisplayName: string
  province: string
}

export interface AdminSelection {
  city: AdminCity
  district: AdminDistrict
}

type SeedCity = [string, string, string, string, Array<string>]

interface CityRow {
  code: string
  kind: string
  name: string
  display_name: string
  province: string
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
    CREATE TABLE IF NOT EXISTS cities (
      code TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      province TEXT NOT NULL,
      full_norm TEXT NOT NULL,
      bare_norm TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS districts (
      code TEXT PRIMARY KEY,
      city_code TEXT NOT NULL REFERENCES cities(code),
      name TEXT NOT NULL,
      name_norm TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_districts_city ON districts(city_code);
    CREATE INDEX IF NOT EXISTS idx_districts_name_norm ON districts(name_norm);
    CREATE INDEX IF NOT EXISTS idx_cities_full_norm ON cities(full_norm);
    CREATE INDEX IF NOT EXISTS idx_cities_bare_norm ON cities(bare_norm);
  `)
  return db
}

async function seed(db: PGlite): Promise<void> {
  const res = await fetch(`${import.meta.env.BASE_URL}wilayah-seed.json`)
  if (!res.ok) throw new Error(`Failed to load administrative data (${res.status})`)
  const seed = (await res.json()) as SeedCity[]

  await db.exec("BEGIN")
  try {
    for (const [code, kind, name, province, districts] of seed) {
      const displayName = kind === "Kota" ? `Kota ${name}` : `Kabupaten ${name}`
      await db.query(
        `INSERT INTO cities (code, kind, name, display_name, province, full_norm, bare_norm)
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
 * Search cities and districts by free text. Returns up to `limit` results,
 * districts rendered as "Kota Bandung, Sumur Bandung". An empty query returns
 * a default browse list (major cities first) so the combobox can open a
 * dropdown before the user types.
 */
export async function searchAdmin(
  query: string,
  limit = 20,
): Promise<Array<AdminSelection & { label: string }>> {
  const db = await getAdminDb()
  const q = normalizeSearchTerm(query)

  const districtRes = await db.query<{
    d_code: string
    d_name: string
    c_code: string
    c_kind: string
    c_name: string
    c_display: string
    province: string
  }>(
    q
      ? `SELECT d.code AS d_code, d.name AS d_name, d.name_norm AS d_norm,
            c.code AS c_code, c.kind AS c_kind, c.name AS c_name,
            c.display_name AS c_display, c.province AS province
     FROM districts d
     JOIN cities c ON c.code = d.city_code
     WHERE d.name_norm LIKE $1
        OR c.bare_norm LIKE $1
     ORDER BY (d.name_norm LIKE $1) DESC, d.name ASC
     LIMIT $2`
      : `SELECT d.code AS d_code, d.name AS d_name, d.name_norm AS d_norm,
            c.code AS c_code, c.kind AS c_kind, c.name AS c_name,
            c.display_name AS c_display, c.province AS province
     FROM districts d
     JOIN cities c ON c.code = d.city_code
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
    q ? [`%${q}%`, limit] : [limit],
  )

  const out: Array<AdminSelection & { label: string }> = districtRes.rows.map((r) => ({
    city: {
      code: r.c_code,
      kind: r.c_kind as AdminCity["kind"],
      name: r.c_name,
      displayName: r.c_display,
      province: r.province,
    },
    district: {
      code: r.d_code,
      name: r.d_name,
      cityCode: r.c_code,
      cityDisplayName: r.c_display,
      province: r.province,
    },
    label: `${r.c_display}, ${r.d_name}`,
  }))
  return out
}

/**
 * Match an API-resolved city/district pair against the local dataset.
 * Prefers the full normalized form ("kota bandung") so Kota and Kabupaten
 * stay distinct, then falls back to the bare name. District must live inside
 * the matched city. Returns null when no match can be trusted.
 */
export async function matchAdmin(
  city: string | null,
  district: string | null,
): Promise<{
  city: AdminCity
  district: AdminDistrict | null
} | null> {
  const db = await getAdminDb()
  const cityFull = city ? normalizeAdminName(city) : null
  const cityBare = city
    ? normalizeAdminName(city.replace(/^\s*(kota|kab\.?|kabupaten)\s+/i, ""))
    : null
  const districtNorm = district ? normalizeAdminName(district) : null

  let cityRow: CityRow | null = null

  if (cityFull || cityBare) {
    const res = await db.query<CityRow>(
      `SELECT code, kind, name, display_name, province FROM cities
       WHERE full_norm = $1 OR full_norm = $2 OR bare_norm = $2
       ORDER BY (full_norm = $1) DESC, (full_norm = $2) DESC, code
       LIMIT 1`,
      [cityFull ?? "", cityBare ?? ""],
    )
    cityRow = res.rows[0] ?? null
  }

  if (!cityRow) return null
  const adminCity: AdminCity = {
    code: cityRow.code,
    kind: cityRow.kind as AdminCity["kind"],
    name: cityRow.name,
    displayName: cityRow.display_name,
    province: cityRow.province,
  }

  if (!districtNorm) return { city: adminCity, district: null }

  const dRes = await db.query<{ code: string; name: string }>(
    `SELECT code, name FROM districts
     WHERE city_code = $1 AND name_norm = $2
     LIMIT 1`,
    [adminCity.code, districtNorm],
  )
  const dRow = dRes.rows[0] ?? null

  if (!dRow) return { city: adminCity, district: null }

  return {
    city: adminCity,
    district: {
      code: dRow.code,
      name: dRow.name,
      cityCode: adminCity.code,
      cityDisplayName: adminCity.displayName,
      province: adminCity.province,
    },
  }
}
