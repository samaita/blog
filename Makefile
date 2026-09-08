SHELL := /bin/bash
# Hugo binary; override like `make dev HUGO_BIN=/tmp/hugo` (matches scripts/build.sh).
HUGO_BIN ?= hugo
PROJECTS := $(wildcard projects/*/package.json)

.PHONY: dev projects

# Local dev: rebuild every Vite project (into static/projects/<name>) then
# serve the site with Hugo's dev server.
dev: projects
	$(HUGO_BIN) server

# Rebuild all Vite projects. Each project outputs to ../../static/projects/<name>
# per the rules in projects/README.md.
projects:
	@set -e; for p in $(PROJECTS); do \
		dir="$$(dirname "$$p")"; \
		echo "==> vite build: $$dir"; \
		(cd "$$dir" && npm run build); \
	done
	@echo "==> all vite projects built"
