+++
title = 'Address Quality: Building an Indonesian Address Validation API, and Measuring It at 49%'
date = 2026-08-13T18:00:00+07:00
draft = false
+++

This is the first post in a series about building [Address Quality](https://samaita.com/projects/address-quality/), an API that validates Indonesian addresses. I want to document the real journey: the failures, the measurements, and the changes in thinking. Not a polished "we nailed it" story.

This post covers the **why** and the **how**, and ends with the benchmark that told me how far the engine still has to go: **49% accuracy on my own test set.** Spoiler: that number is the best thing that happened to the project.

## Why Indonesian addresses are hard

Back in my logistics-aggregation days, one of the hardest problems was validating addresses. Three problems stood out:

**Fraud.** A sender could declare a cheap origin to game shipping rates. They claimed an address in one city while the actual pickup point was elsewhere. The aggregator's rate is computed from the declared origin code, so the mismatch cost real money.

**UX.** Users filling an address had to provide either a postal code or a subdistrict. Even when they filled everything out completely, the system still asked them to fill another form. Complete addresses were rejected for not matching a rigid format.

**Data drift.** People remember postal codes that no longer match the official data. Someone in Cimanggu remembers `16164`, but the official code changed to `16163`. Their memory does not update. Many people do not even realize Indonesia has added new provinces over the years.

The common thread: **software assumes addresses arrive clean and structured. In Indonesian, they rarely do.**

Beyond the business problems, Indonesian addresses are hard by nature. The language itself creates ambiguity:

**Kota vs Kabupaten.** Many city names are shared between a *kota* (city) and a *kabupaten* (regency). Bandung, Bogor, Cirebon, Sukabumi, and a hundred more pairs. "Jl. Merdeka No. 1, Bogor" is ambiguous between Kota Bogor and Kabupaten Bogor. A human can get confused, let alone a parser. The official hierarchy encodes both: `32.73` is Kota Bandung, `32.04` is Kabupaten Bandung.

**Spelling variants.** The same place gets written multiple ways. Some say "Jogjakarta", some say "Yogyakarta", and the official name is "Daerah Istimewa Yogyakarta". Abbreviations add to it: `DIY` for Daerah Istimewa Yogyakarta, `Kab` for Kabupaten, `Kec` for Kecamatan, `Gg` for Gang.

**Roman numerals in names.** Administrative names often contain Roman numerals. "IV Koto", "X Koto", "VII Koto" are real names, and people write them as "4 Koto" or "10 Koto". Same place, different text.

**One word, many levels.** The same word can be a province, city, district, and village in different parts of the country. "Bandung" is a city in Jawa Barat, and also a kecamatan (and a kelurahan) in Tulungagung, Jawa Timur. A word-level lookup cannot tell them apart without hierarchy context.

**Informal conventions.** Addresses carry RT/RW numbers, landmarks, and informal descriptions. Natural for humans, confusing for software that relies on deterministic matching.

**The hierarchy changes.** New provinces are created, postal codes evolve, aliases appear. People's memory does not update with the official data.

These are not edge cases. They are the norm. An address like "Jl. Merdeka No. 1, Bogor" is ambiguous between Kota Bogor and Kabupaten Bogor. A human can get confused, let alone a parser.

## What I tried first (and why each failed)

Before building anything, I tried the obvious approaches. All three failed in useful ways.

**Regex rules per word.** The idea: define rules like "Bandung goes to Jawa Barat". The problem: Bandung is also a kecamatan (subdistrict) in Jawa Timur. A word-level rule cannot scale to a country where the same name means different administrative things in different places.

**AI / RAG comparison.** Compare the address against a knowledge base using an LLM. The problems: latency dependency, and inconsistent reasoning. The same input could return different reasoning on different calls. For a validation service, this alone rules it out.

**Fuzzy match to a database.** Fuzzy lookup plus extra checks. It worked, but it was complicated and hard to maintain.

The lesson: a validation engine needs to be **deterministic**. The same address must always produce the same result, with reasons you can inspect.

## The design principle: collect evidence, contest for the winner

I settled on a principle: **collect evidence, then contest to find the winner.** Every piece of the input is evidence. A district name, a city name, a postal code. The engine resolves each piece to every possible administrative entity it could match, builds candidate locations from those possibilities, and then scores each candidate against the evidence.

The engine is deliberately **not** an AI/ML model at runtime. It uses deterministic phrase matching against a pre-built, normalized database of Indonesian administrative names. No black box. Every result carries the reasons behind it.

The pipeline, in order:

1. **Sanitize** the raw input
2. **Normalize:** lowercase, strip administrative prefixes (`kabupaten`, `kota`, `kecamatan`, `kelurahan`, `provinsi`), remove punctuation, collapse extra spaces, keep 5-digit postal codes
3. **Extract evidence:** find postal codes, classify words as road or place evidence
4. **Resolve:** map each piece of evidence to all possible entities (longest-match over a phrase dictionary). Resolution never picks a winner; it collects possibilities
5. **Discover candidates:** one candidate per unique entity at each level
6. **Enrich:** fill upper levels from the hierarchy, attach postal codes
7. **Evaluate:** check hierarchy consistency, measure evidence coverage, detect conflicts, compute confidence, assign status
8. **Rank:** sort by confidence, then filled-level count, then fewer conflicts
9. **Respond:** formatted address plus structured metadata

## The data: 176,000 lines of government dumps, rebuilt into SQLite

The engine is only as good as its reference data. The seeder parses roughly 176,000 lines of upstream MySQL dumps. The Kemendagri `wilayah` administrative dump and the `wilayah_kodepos` postal-code dump. It rebuilds them into a normalized SQLite hierarchy:

- **38 provinces**
- **514 cities/regencies**
- **7,285 districts**
- **83,762 subdistricts**

joined with postal codes. It has normalized names for phrase matching and a pre-built hierarchy table for fast upper-level lookups.

The reference dataset is fully **offline**. No network dependency at validation time, no external service. A pure-Go SQLite driver keeps the binary CGO-free and statically linked.

## The build

Built over roughly four weeks (July to August 2026), single author, in a linear history of 132 commits. Ten phases: an MVP API, API hardening, containerization and first CI, the data layer and seeder, caching and candidate sets, benchmarks/docs/licensing, a full evaluation-engine overhaul, Swagger documentation, a frontend (later moved to samaita.com), and production CI/CD polish.

Two design decisions worth calling out:

**Two databases, two personalities.** `location.db`, the read-only administrative hierarchy, loaded once into memory. `address.db`, the append-only request log. Separating static reference data from mutable log data keeps the hierarchy safely read-only.

**CI builds, but never deploys.** CI builds and pushes one container image to a registry, and never deploys. Deployment is a manual step on the production VPS. An operator pulls the chosen image tag, recreates the container, waits for the health check, verifies the reverse proxy, and records the deployed tag for one-command rollback. There is no CI-to-production path. Production changes are always deliberate and traceable.

## The benchmark: 49%

I built a benchmark against a hand-tagged ground-truth set: **106 addresses, all in Bandung.** Real addresses, tagged with the correct province, city, district, and subdistrict. The benchmark runs each address through the API and compares.

**The result: 52/106 exact matches = 49.1%.**

Per-level breakdown:

| Level | Correct |
|---|---|
| Province | 82.1% |
| City | 76.4% |
| District | 71.7% |
| **Subdistrict** | **51.9%** |

The subdistrict (kelurahan/desa) is where it falls apart.

The benchmark flagged three challenge areas:

1. **Village resolution (18.9% of records).** Province, city, and district are correct, but the village is wrong or empty. The worst part: in the benchmark, a wrong village came back with **90% confidence and status VALID**. The engine was confidently wrong.
2. **Ambiguous city/regency names (23.6%).** Many names are shared across provinces. Bandung, Sukasari, Sukarasa. "JL. GATOT SUBROTO NO.86 BANDUNG" resolved to **Bandung, Kabupaten Tulungagung, Jawa Timur**. A real kecamatan Bandung in a different province.
3. **Road-level data (20.8%).** Street names are recognized but not resolved. Roads are not part of the reference dataset.

## What the benchmark taught me

The 90% confident wrong village case exposed a structural bug, not a tuning issue. The status logic stamps **VALID** based on province + city + district. **It never checks the subdistrict.** So the engine can be fully confident about a location whose weakest level is wrong or missing. It has no way to doubt the village.

The Bandung case exposed the second bug. A single "Bandung" token can match two levels at once. The kecamatan Bandung and the kelurahan Bandung in Tulungagung. This increases the matched-level count and the confidence. One ambiguous word tricked the scoring.

## The fix direction

Two changes are coming:

1. **The status definition must gate on the subdistrict.** VALID should require all four levels: province, city, district, and subdistrict. Or it should report which level is missing or uncertain.
2. **A generated alias layer with a default-preference rule.** When a name is ambiguous between Kota and Kabupaten (Bandung, Bogor, Cirebon. There are a hundred of these pairs), the seeder normalizes city names and generates the alias. There can only be one. Kota is the default. The alias infrastructure already exists in the schema (the `location_alias` table). The strategy is declared in code but not yet wired into the runtime. The benchmark proved why it needs to exist.

## The system is not perfect

Let me be explicit about the limitations, because they are part of the story:

- **The API key is manually managed.** One shared key in env, no per-key scoping, no rotation.
- **There are tests, but no observability.** No metrics, no tracing. Just access logs.
- **The benchmark is 100 addresses, all in Bandung.** There is no national-accuracy number yet.
- **The alias and postal discovery strategies are declared but not used at runtime.** Only top-down and any-level matching are active.

The engine began with a lot of limitations. That is the point of this series: measure, find the gaps, fix them, measure again.

## What's next

The 49% is not a confession. It is a **baseline**. It means there is a lot of room to improve, and every improvement is measurable. The next post will cover the scoring fix and the alias layer: what changed, and whether the number moved.

The API is live at [samaita.com/projects/address-quality](https://samaita.com/projects/address-quality/) with a playground. Try it. If an address comes back wrong, that is useful data.

*Series: Part 1, why and how (this post). Next: the scoring fix, and what the new number is.*
