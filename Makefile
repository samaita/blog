SHELL := /bin/bash
# Hugo binary; override like `make dev HUGO_BIN=/tmp/hugo` (matches scripts/build.sh).
HUGO_BIN ?= hugo
PROJECTS := $(wildcard projects/*/package.json)

.PHONY: dev projects

# Local dev: rebuild every Vite project (into static/projects/<name>) then
# serve the site with Hugo's dev server. --noHTTPCache sends
# Cache-Control: no-store on every response so the browser (which otherwise
# heuristic-caches ~16MB of PGlite wasm/data + wilayah-seed.json under
# /projects/*/) always picks up fresh builds on a normal tab.
dev: projects
	$(HUGO_BIN) server --noHTTPCache

# Rebuild all Vite projects. Each project outputs to ../../static/projects/<name>
# per the rules in projects/README.md.
projects:
	@set -e; for p in $(PROJECTS); do \
		dir="$$(dirname "$$p")"; \
		echo "==> vite build: $$dir"; \
		(cd "$$dir" && npm run build); \
	done
	@echo "==> all vite projects built"
