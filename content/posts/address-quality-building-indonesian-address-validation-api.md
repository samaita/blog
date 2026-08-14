+++
title = 'Building an Indonesian Address Validation API: An Underdog Story That Begins With 49% Accuracy'
date = 2026-08-13T18:00:00+07:00
draft = false
+++

This is the first post in a series about building [Address Quality](https://samaita.com/projects/address-quality/), an API that validates Indonesian addresses. I want to document the real journey: the failures, the measurements, and the changes in thinking. It is not a "nailed it" story yet, because the journey is just on.

This post covers the why and the how. It ends with the first benchmark: **49% accuracy on my own test set.** I will explain later why that number turned out to be useful.

## The problem

Back in my logistics-aggregation days, one of the hardest problems was validating addresses. Three problems stood out:

**Fraud.** A sender could declare a cheap origin to game shipping rates. The origin code is used by the logistic provider, not the user's actual address. So a user's declared address origin could mismatch the actual origin code, and the rate is computed from that code. The mismatch cost real money.

**UX.** Users had to provide either a postal code or a subdistrict in different form inputs of the address. This friction delayed shipping creation. Some users got used to it and typed minimal addresses on purpose: a city name or a subdistrict name. That behavior pollutes the data and risks lost packages.

**Data drift.** Some people have a different memory of the postal code, so their own address is mislabeled after official updates. Take Kedung Waringin, Kota Bogor. People remember a postal code that no longer matches the official data. Many people do not even realize Indonesia has added new provinces over the years.

The common thread: **software assumes addresses arrive clean and structured. In Indonesian, they rarely do.**

## Why Indonesian addresses are difficult

Beyond the business problems, Indonesian addresses are hard by nature. The language creates ambiguity:

**Kota vs Kabupaten.** Many city names are shared between a *kota* (city) and a *kabupaten*. Bandung, Bogor, Cirebon, Sukabumi, and a hundred more pairs. "Jl. Merdeka No. 1, Bogor" is ambiguous between Kota Bogor and Kabupaten Bogor. A human can get confused, let alone a parser. The official hierarchy encodes both: `32.73` is Kota Bandung, `32.04` is Kabupaten Bandung.

**Spelling variants.** The same place gets written multiple ways. Some say "Jogjakarta", some say "Yogyakarta", and the official name is "Daerah Istimewa Yogyakarta". Abbreviations add to it: `DIY`, `Kab`, `Kec`, `Gg`.

**Roman numerals in names.** "IV Koto", "X Koto", "VII Koto" are real names, and people write them as "4 Koto" or "10 Koto". Same place, different text.

**One word, many levels.** The same word can be a province, city, district, and subdistrict in different parts of the country. "Bandung" is a city in Jawa Barat, and also a kecamatan (and a kelurahan) in Tulungagung, Jawa Timur. A word-level lookup cannot tell them apart without hierarchy context.

**Informal conventions.** Addresses carry RT/RW numbers, landmarks, and informal descriptions. Natural for humans, confusing for software that relies on deterministic matching.

**The hierarchy changes.** New provinces are created, postal codes evolve, aliases appear.

These are not edge cases. They are the norm.

## What I tried first

Before building anything, I tried the obvious approaches. All three failed in useful ways.

**Regex rules per word.** Define rules like "Bandung goes to Jawa Barat". The problem: Bandung is also a kecamatan in Jawa Timur. A word-level rule cannot scale to a country where the same name means different administrative things in different places.

**AI / RAG comparison.** Compare the address against a knowledge base using an LLM. The problems: latency dependency, and inconsistent reasoning. The same input could return different reasoning on different calls. For a validation service, this alone rules it out.

**Fuzzy match to a database.** Fuzzy lookup plus extra checks. It worked, but it was complicated and hard to maintain.

The lesson: the engine needs to be **deterministic**. The same address must always produce the same result, with reasons you can inspect.

## Design: collect evidence, contest for the winner

I settled on a principle: **collect evidence, then contest to find the winner.** Every piece of the input is evidence. A district name, a city name, a postal code. The engine resolves each piece to every possible administrative entity it could match, builds candidate locations from those possibilities, and scores each candidate against the evidence.

Calling it "validation" undersells it. The system is closer to an **address resolution engine**. It extracts evidence, resolves administrative entities, generates candidates, reconstructs the hierarchy, evaluates and ranks candidates, and returns the best interpretation. "Is this address valid?" is only part of the output.

The engine does not use an AI/ML model at runtime. It uses deterministic phrase matching against a pre-built, normalized database of Indonesian administrative names. Every result carries the reasons behind it.

## How the pipeline works

1. **Sanitize** the raw input
2. **Normalize:** lowercase, strip administrative prefixes (`kabupaten`, `kota`, `kecamatan`, `kelurahan`, `provinsi`), remove punctuation, collapse extra spaces, keep 5-digit postal codes
3. **Extract evidence:** find postal codes, classify words as road or place evidence
4. **Resolve:** map each piece of evidence to all possible entities (longest-match over a phrase dictionary). Resolution never picks a winner; it collects possibilities
5. **Discover candidates:** one candidate per unique entity at each level
6. **Enrich:** fill upper levels from the hierarchy, attach postal codes
7. **Evaluate:** check hierarchy consistency, measure evidence coverage, detect conflicts, compute confidence, assign status
8. **Rank:** sort by confidence, then filled-level count, then fewer conflicts
9. **Respond:** formatted address plus structured metadata

## The reference data

The engine is only as good as its reference data. The seeder parses roughly 176,000 lines of upstream MySQL dumps: the Kemendagri `wilayah` administrative dump and the `wilayah_kodepos` postal-code dump. It rebuilds them into a normalized SQLite hierarchy:

- **38 provinces**
- **514 cities**
- **7,285 districts**
- **83,762 subdistricts**

joined with postal codes. It has normalized names for phrase matching and a pre-built hierarchy table for fast upper-level lookups. The source project is [wilayah_ref by cahyadsn](https://github.com/cahyadsn/wilayah_ref).

The reference dataset is fully **offline**. No network dependency at validation time. A pure-Go SQLite driver keeps the binary CGO-free and statically linked.

## The build

The backend is AI assisted, the frontend is vibe coded, and the whole thing runs on a 2c4g VPS in Indonesia. Ten phases took it from MVP to production CI/CD: API hardening, containerization, the data layer and seeder, caching and candidate sets, benchmarks and docs, a full evaluation-engine overhaul, Swagger documentation, the frontend, and deployment polish.

Two design decisions worth calling out:

**Two databases, two personalities.** `location.db`, the read-only administrative hierarchy, loaded once into memory. `address.db`, the append-only request log. Separating static reference data from mutable log data keeps the hierarchy safely read-only.

**CI builds, but never deploys.** CI builds and pushes one container image to a registry, and never deploys. Deployment is a manual step on the production VPS. An operator pulls the chosen image tag, recreates the container, waits for the health check, verifies the reverse proxy, and records the deployed tag for one-command rollback. There is no CI-to-production path.

## The benchmark

I built a benchmark against a hand-tagged ground-truth set: **106 addresses, all in Bandung.** Real addresses, tagged with the correct province, city, district, and subdistrict.

The method is simple: run each address through the API, compare the resolved components against the tagged ground truth, and count a record as correct when all four levels match.

**The result: 52/106 exact matches = 49.1%.**

| Level | Correct |
|---|---|
| Province | 82.1% |
| City | 76.4% |
| District | 71.7% |
| **Subdistrict** | **51.9%** |

The subdistrict (kelurahan/desa) is where it falls apart.

49% was not a result to celebrate. It was useful. It gave me a concrete baseline and a set of failure cases to investigate.

The benchmark flagged three challenge areas:

1. **Subdistrict resolution (18.9% of records).** Province, city, and district are correct, but the subdistrict is wrong or empty. The worst part: in the benchmark, a wrong subdistrict came back with **90% confidence and status VALID**. The engine was confidently wrong.
2. **Ambiguous city names (23.6%).** Many names are shared across provinces. Bandung, Sukasari, Sukarasa. "JL. GATOT SUBROTO NO.86 BANDUNG" resolved to **Bandung, Kabupaten Tulungagung, Jawa Timur**. A real kecamatan Bandung in a different province.
3. **Road-level data (20.8%).** Street names are recognized but not resolved. Roads are not part of the reference dataset.

## Two failure cases

### Case 1: a subdistrict the input already contained

Input: "JL. Supratman No.72, Cihuar Geulis, Kec. Cibeunying Kaler, Kota Bandung, Jawa Barat 40114"

The address literally contains the subdistrict name "Cihuar Geulis". The result came back as Cibeunying Kaler, Kota Bandung, Jawa Barat 40114, **status VALID, confidence 0.90**, with no subdistrict resolved.

That exposed a problem in the current implementation. The status logic stamps **VALID** based on province + city + district. **It never checks the subdistrict.** So a result can be fully confident about a location whose weakest level is missing or wrong. The engine has no way to say "I am not sure about the subdistrict". It just does not look at it.

### Case 2: one word, two levels, wrong province

Input: "JL. GATOT SUBROTO NO.86 BANDUNG"

"Bandung" is ambiguous. As a domain fact, the name exists at multiple levels: Kota Bandung (`32.73`), Kabupaten Bandung (`32.04`), and a kecamatan Bandung in Tulungagung, Jawa Timur (`35.04.17`), which also contains a kelurahan named Bandung.

The current implementation resolved this input to Bandung, Bandung, Kabupaten Tulungagung, Jawa Timur 66274, **status AMBIGUOUS, confidence 0.43**. The formatted output shows why: "Bandung, Bandung" means the single token matched two levels at once, the kecamatan and the kelurahan, both in the wrong region. The scorer rewards matched levels, so one ambiguous word counted twice and inflated the score.

The score was misleading because it reflects how much evidence matched, not how likely the interpretation is. A word that exists at many levels is weak evidence, but the current scorer does not treat it that way.

What this suggests for the next iteration: do not let one token fill two levels, and prefer the city interpretation when a name is ambiguous between Kota and Kabupaten. I am testing an alias layer where the seeder normalizes city names and generates one canonical target. For this iteration, Kota is the default. The alias infrastructure already exists in the schema (the `location_alias` table), and the strategy is declared in code but not yet wired into the runtime. The benchmark will determine whether this reduces the false matches.

## What the benchmark showed

The benchmark showed weaknesses in the current approach, not a fundamental flaw in the direction.

- The status definition does not gate on the subdistrict, so the engine can be confidently wrong about the weakest level.
- The scorer rewards per-level matches, and one ambiguous token can match two levels and inflate confidence.
- Roads are not in the reference data, so road-based addresses cannot be fully resolved.

All three are concrete, addressable problems.

## What I will change next

Two changes are in progress:

1. **Gate VALID on the subdistrict.** VALID should require all four levels: province, city, district, and subdistrict. Or it should report which level is missing or uncertain.
2. **A generated alias layer.** When a name is ambiguous between Kota and Kabupaten, the seeder normalizes city names and generates the alias. For this iteration, Kota is the default. I am testing whether that resolves the ambiguity cases the benchmark flagged.

The benchmark will tell whether the number moves.

## Current limitations

The system is early alpha. To be explicit:

- **The API key is manually managed.** One shared key in env, no per-key scoping, no rotation.
- **There are tests, but no observability.** No metrics, no tracing. Just access logs.
- **The benchmark is 106 addresses, all in Bandung.** There is no national-accuracy number yet.
- **The alias and postal discovery strategies are declared but not used at runtime.** Only top-down and any-level matching are active.

## Conclusion

The 49% is not a confession. It is a baseline. It means there is a lot of room to improve, and every improvement is measurable. The next post will cover the scoring fix and the alias layer: what changed, and whether the number moved.

The API is live at [samaita.com/projects/address-quality](https://samaita.com/projects/address-quality/) with a playground. Try it. If an address comes back wrong, that is useful data. Every release comes with a new benchmark update, available under Benchmark on the same page.

*Series: Part 1, why and how (this post). Next: the scoring fix, and what the new number is.*
