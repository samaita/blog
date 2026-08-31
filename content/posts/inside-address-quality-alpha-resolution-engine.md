+++
title = 'Inside Address Quality Alpha: How the Resolution Engine Picks a Winner'
date = 2026-08-31T18:15:20+07:00
draft = true
tags = ['address-quality', 'go', 'engineering']
description = 'A look inside the deterministic algorithm, Go stack, data model, scoring system, and trade-offs behind the Address Quality public alpha.'
series = ['Address Quality']
part = 4
+++

One word can send an address resolver in the wrong direction.

Take this input:

```text
JL. GATOT SUBROTO NO.86 BANDUNG
```

A person will probably read Bandung as Kota Bandung. The data does not make that choice so easy. Bandung is also a city, a district, and a subdistrict name in different parts of Indonesia.

The first version of [Address Quality](https://samaita.com/projects/address-quality/) followed all of those possibilities. One of them ended in Kabupaten Tulungagung, Jawa Timur. The input had one useful place name, but the engine found enough matching levels in the wrong hierarchy to make that candidate look reasonable.

I wrote about that failure in the [first Address Quality post](https://samaita.com/posts/address-quality-building-indonesian-address-validation-api/). This post opens the engine and looks at the engineering behind the public alpha: the algorithm, the stack, why I chose them, and where the current design still falls short.

## This is not a string lookup

The simplest version of address validation sounds like a database query:

```text
Find "Bandung" in the location table.
```

That works until the query returns many rows. Picking the first row only hides the ambiguity. Fuzzy matching does not solve it either. It can find a similar spelling, but it still has to decide which place that spelling means.

I needed the engine to consider the whole administrative path.

A province contains cities. A city contains districts. A district contains subdistricts. Postal codes sit at the subdistrict level. If an input mentions Cibeunying Kaler, Kota Bandung, and Jawa Barat, those pieces should support each other. If it mentions Cibeunying Kaler and Kabupaten Bandung, the hierarchy should expose the conflict.

That led to the main rule behind the algorithm:

> Collect evidence, build possible locations, then let the candidates compete.

The engine is closer to an address resolution engine than a yes-or-no validator. It does not ask only whether a word exists. It asks which complete interpretation is best supported by the input.

## The algorithm in one view

The current V1 pipeline is deterministic:

```text
Raw address
  -> sanitize and normalize
  -> extract evidence
  -> resolve every possible entity
  -> build candidates
  -> restore each candidate's hierarchy
  -> compare candidates with the input
  -> detect conflicts
  -> score and rank
  -> return the winner and the reasons
```

There is no AI or ML model in this runtime path. The same code, reference data, and input should return the same result.

That matters for debugging. If a result is wrong, I can inspect which evidence matched, which candidates were built, and why one score beat another. I do not have to ask a model to explain a decision it may not reproduce on the next call.

## Following one address through the engine

Consider a complete input:

```text
Jl. Supratman No.72, Cihaur Geulis, Kec. Cibeunying Kaler,
Kota Bandung, Jawa Barat 40122
```

It contains road text, three administrative names, and a postal code. Here is what happens inside the alpha.

### 1. Normalize without losing the postal code

The normalizer lowercases the text, removes punctuation, strips prefixes such as `kota`, `kecamatan`, and `kelurahan`, and collapses extra spaces. Five-digit postal codes are preserved separately and added back after punctuation removal.

The goal is not to rewrite the address for display. It is to create a stable form for matching. `Kec. Cibeunying Kaler` and `Kecamatan Cibeunying Kaler` should reach the same lookup path.

This is intentionally conservative. Normalization removes known administrative wrappers, but it does not guess that every similar word is the same place.

### 2. Turn the input into evidence

The engine extracts the postal code and breaks the remaining text into possible place tokens. It also marks tokens that follow road prefixes such as `Jl`, `Jalan`, `Gg`, and `Gang` as road context.

At this point the engine has clues, not conclusions. The longest-phrase matcher can group adjacent tokens back into administrative names:

```text
cihaur + geulis       possible subdistrict phrase
cibeunying + kaler    possible district phrase
bandung                possible place at several levels
jawa + barat           possible province phrase
40122                   postal evidence
supratman               road context
```

Road names are not resolved by the local V1 dataset yet. They can help describe the input, but they cannot produce an administrative candidate.

### 3. Keep every possible meaning

The resolver uses longest-phrase matching against a dictionary built from normalized administrative names. A phrase can map to more than one entity.

That last detail is important. Resolution does not pick a winner. If `bandung` exists at several levels and in several hierarchies, the resolver keeps those possibilities for the next step.

Picking early would make the algorithm simpler, but it would also make a local lookup mistake decide the whole result. The current design delays that decision until more context is available.

### 4. Build a candidate from each starting point

The engine creates candidates from every unique province, city, district, and subdistrict entity it resolved.

A candidate that starts from Cihaur Geulis only knows its subdistrict at first. The hierarchy cache fills in its parents:

```text
Cihaur Geulis
  -> Cibeunying Kaler
  -> Kota Bandung
  -> Jawa Barat
  -> 40122
```

A candidate that starts from a different Bandung gets a different path. This turns one ambiguous word into several complete interpretations that can be compared using the rest of the input.

The hierarchy is doing more than filling empty fields. It gives the scorer a way to test whether the evidence agrees with itself.

### 5. Score support and expose disagreement

Each candidate is evaluated against the evidence. The current score combines signals such as:

- at least one exact administrative match
- a valid parent-child hierarchy
- direct province, city, district, and subdistrict matches
- postal-code support, including partial prefix matches
- repeated evidence supporting the same entity
- a penalty for evidence the candidate did not use

The weights are plain Go constants. They are not learned by a model. That makes them easy to test, but it also means they are tuning choices rather than universal truth.

The latest alpha subtracts `0.03` for each unused piece of evidence. The idea is simple: a candidate should not receive the same score when it explains one clue and ignores four others. This is still an experiment. The benchmark has to show whether the penalty improves ranking without punishing normal address noise too much.

The evaluator also records conflicts. A city under the wrong province, a district under the wrong city, or a postal code that disagrees with the subdistrict should not disappear inside one confidence number.

### 6. Rank, then admit when the answer is close

Candidates are sorted by confidence. Ties fall back to the number of filled administrative levels, then the number of conflicts.

If the top candidate is `VALID` but the top two scores are less than `0.1` apart, the final status becomes `AMBIGUOUS`.

This threshold is another explicit engineering choice. It is visible, testable, and likely to change as the benchmark grows.

The response includes the winning location, confidence, status, matched and missing components, conflicts, unused evidence, candidate count, and the reasons used by the scorer. The caller can accept the result, ask for confirmation, or send it to manual review.

## A small rule for the Bandung problem

A general candidate contest still needs domain rules when the input does not provide enough context.

The current alpha builds a city-priority table during seeding. It contains city names that also exist at district or subdistrict level. When one of those names is the only resolved location evidence, the resolver suppresses its lower-level meanings and keeps the city candidates. If both Kota and Kabupaten exist, Kota is preferred.

So an input containing only `Bandung` follows the city path instead of winning through a district or subdistrict in another province.

The rule stops applying when other useful evidence exists. A resolved district, subdistrict, or postal code may point to another Bandung, so the engine keeps the wider candidate set and lets the hierarchy decide.

This is not a claim that Kota is always correct. It is a fallback for an under-specified input. The rule is narrow because broad rules are difficult to undo once they start overriding good evidence.

## Why a deterministic engine instead of an LLM

I tried AI and retrieval-based comparison before settling on this design. It was useful for exploring the problem, but it was not a good fit for the core validation path.

The reasons were practical:

### The answer needs to repeat

A validation API should not interpret the same address differently across calls. Deterministic matching makes regressions easier to reproduce.

### The reason needs to be inspectable

A confidence score is not enough. I need to know which input supported Kota Bandung and which part was ignored or rejected.

### Most of the useful structure already exists

Indonesia has an administrative hierarchy. If the input names a district and city, a relational check can tell me whether they belong together. I do not need a model to rediscover that relationship on every request.

### The local path should work without a network call

The V1 engine resolves administrative evidence from a local database. That avoids an external request, API quota, and variable upstream latency for addresses that already contain enough information.

An external geocoder still has a role. The separate V0 endpoint can call Google Maps for roads, buildings, businesses, and landmarks that the administrative dataset does not know. Its responses are cached in SQLite by a SHA-256 hash of the request body after its whitespace is made consistent. The point is not to replace one system with the other. It is to keep the local evidence path and external place lookup as separate tools.

## The stack follows the problem

The backend stack is small on purpose.

### Go and Echo

The API is written in Go, with Echo handling HTTP routing and middleware. The public surface is small: health, Swagger, the local V1 validator, and the cached Google-backed V0 geocoder.

Go fits the service because the work is mostly text processing, map lookups, ranking, and database access. It also produces a single static server binary for the Linux container.

The API middleware adds body limits, API-key authentication, rate limiting, CORS, request IDs, recovery, and structured logging. These are not part of the matching algorithm, but they are part of making the algorithm usable as a service.

### SQLite for reference data and request state

The project uses a pure-Go SQLite driver, so the binary does not need CGO.

The reference hierarchy is seeded from the [wilayah_ref](https://github.com/cahyadsn/wilayah_ref) administrative and postal-code dumps. The seeder turns that source into normalized location rows and a pre-built parent hierarchy.

On the first V1 request, the service loads provinces, cities, districts, subdistricts, city-priority rules, and hierarchy maps into memory. Request-time resolution after that mostly becomes map and phrase-dictionary lookup instead of repeated joins over the full location table.

SQLite also stores request records and the Google Maps lazy cache. Keeping the location data local makes the service portable, but it creates an operational responsibility: reference updates require a deliberate reseed and release process.

### Containers without automatic production deployment

CI runs `go vet`, unit tests, and a build smoke check. On main, it builds an immutable container image and pushes it to GHCR.

CI does not deploy production. Deployment uses Podman on the VPS. The script pulls a chosen tag, recreates the API, waits for the container health check, verifies the reverse proxy, and records the deployed tag for rollback.

That split is less convenient than automatic deployment, but the production step stays explicit. For an early service with evolving data and scoring behavior, I prefer a visible release decision over a hidden path from merge to production.

## The benchmark is part of the algorithm

The scorer cannot improve through intuition alone.

The first V1 benchmark used 106 tagged Bandung addresses. A record counted as accurate only when province, city, district, and subdistrict all matched the expected hierarchy. The first result was 52 out of 106, or 49.1%.

That number was a baseline, not proof that the design worked. Its value was in the failure cases. It exposed the Bandung level collision, missing subdistrict matches, road-data gaps, and confidence that did not always reflect how much of the input the winner explained.

The repository keeps unit tests around exact scoring behavior, k6 smoke and load tests around the HTTP service, and benchmark scripts around resolution accuracy. They answer different questions:

- Unit tests ask whether one rule still behaves as designed.
- Load tests ask whether the API keeps serving requests under traffic.
- The benchmark asks whether the winner matches tagged real addresses.

A fast wrong answer is still wrong. An accurate resolver that changes behavior without explanation is also difficult to operate. The alpha needs all three kinds of feedback.

## What "alpha" still means

The deterministic design does not remove uncertainty. It only makes the uncertainty easier to see.

The current implementation still has clear limits:

### Exact matching misses human spelling mistakes

`Cihaur Geulis` and `Cihuar Geulis` swap two letters. The local resolver treats them as different. A controlled alias layer could help, but general alias matching is not wired into the current runtime and it would need evidence and maintenance.

### Roads are recognized but not resolved locally

V1 can detect road context, but the administrative reference data does not contain a road graph. That is one reason an external geocoder remains useful.

### VALID does not yet mean all four levels matched

The current status logic requires province, city, and district, but it does not require a subdistrict. That means a result can be `VALID` while its most specific administrative level is missing. The response exposes missing components, but the status definition still needs work.

### The weights are hand-tuned

The scorer uses explicit constants and a small ambiguity threshold. That is better than hiding the choices, but the choices still need broader data. One Bandung-heavy benchmark is not a national accuracy claim.

### More evidence can also mean more noise

Penalizing unused evidence may help reject candidates that explain only one word. It may also punish addresses full of road numbers, building names, and landmarks that the local dataset cannot resolve. The next benchmark should show where that balance breaks.

## The useful part is not the confidence number

The algorithm is not interesting because it produces a number between zero and one. It is interesting because the number comes with a path I can inspect:

```text
input evidence
  -> possible entities
  -> candidate hierarchies
  -> matched and unused evidence
  -> conflicts
  -> score
  -> winner or ambiguity
```

That path lets me change one rule and measure what moved. It also lets a caller decide that an ambiguous answer is more useful than a confident guess.

The next engineering question is not whether local data or Google Maps wins. It is where the boundary should sit. When does the address contain enough administrative evidence to trust the local resolver, and when should the system ask an external geocoder for help?

That boundary will come from failure cases, not from architecture diagrams.
