import { readdirSync, existsSync, statSync, readFileSync, cpSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin, ResolvedConfig } from "vite"

const VIRTUAL_ID = "virtual:benchmarks"
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const benchmarkRoot = join(projectRoot, "benchmark")

function listBenchmarkVersions(): string[] {
  if (!existsSync(benchmarkRoot)) return []
  return readdirSync(benchmarkRoot)
    .filter((name) => {
      const stat = statSync(join(benchmarkRoot, name))
      return stat.isDirectory() && existsSync(join(benchmarkRoot, name, "benchmark.html"))
    })
    .sort((a, b) => b.localeCompare(a))
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
}

export default function benchmarkStatic(): Plugin {
  let config: ResolvedConfig

  return {
    name: "benchmark-static",

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_ID) {
        return `export const BENCHMARKS = ${JSON.stringify(listBenchmarkVersions())}`
      }
    },

    configResolved(resolved) {
      config = resolved
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        let pathname = (req.url ?? "").split("?")[0]
        if (config.base !== "/") {
          pathname = pathname.startsWith(config.base)
            ? pathname.slice(config.base.length - 1)
            : pathname
        }
        if (!pathname.startsWith("/benchmark/")) {
          next()
          return
        }

        const rel = pathname.slice("/benchmark/".length)
        const file = join(benchmarkRoot, rel)
        if (!file.startsWith(benchmarkRoot) || !existsSync(file) || statSync(file).isDirectory()) {
          next()
          return
        }

        const extension = file.slice(file.lastIndexOf("."))
        res.setHeader("Content-Type", CONTENT_TYPES[extension] ?? "application/octet-stream")
        res.end(readFileSync(file))
      })
    },

    closeBundle() {
      if (!existsSync(benchmarkRoot)) return
      const target = join(config.build.outDir, "benchmark")
      cpSync(benchmarkRoot, target, { recursive: true })
    },
  }
}
