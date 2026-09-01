+++
title = 'How I Built Address Quality API to Read Indonesian Addresses'
date = 2026-08-31T18:15:20+07:00
draft = true
tags = ['address-quality', 'engineering', 'indonesia']
description = 'I built Address Quality API to find possible locations in an Indonesian address, then rank them by how well they match the available evidence.'
series = ['Address Quality']
part = 4
+++

In the previous post, I asked [why address forms still make you select information you have already typed](https://samaita.com/posts/why-are-we-still-asked-to-fill-our-address-twice/).

My proposed solution was to move that effort into an API. You provide the address, the API interprets it, then you confirm the result.

So I built [Address Quality](https://samaita.com/projects/address-quality/), an experiment for turning free-text Indonesian addresses into structured administrative data.

The first alpha version tries to answer two questions:

1. Which parts of the address can it recognize?
2. Which possible location matches those parts best?

That sounds simple. But something that sounds simple isn't always easy to solve.

![Address Quality landing page](https://samaita.com/projects/address-quality/images/landing-page.png)

## How Humans and Computers Read Addresses Differently

Take this address:

```text
JL. LLRE MARTADINATA ST NO.97, CITARUM, Kec. BANDUNG WETAN,
KOTA BANDUNG, JAWA BARAT 40115
```

It contains almost everything we need:

```text
Jawa Barat     ✓
Kota Bandung   ✓
Bandung Wetan  ✓
Citarum        ✓
40115          ✓
```

A person familiar with Indonesian addresses can read it without much effort.

Software needs more work. Which words actually matter? Are they related to each other?

I call a non overlap phrase as **evidence**, when the engine can recognize it and find it in the reference data.

Evidence isn't always helpful. A common name may point to many places. But at least the engine knows that the phrase exists and what it may refer to.

The alpha version uses Kemendagri administrative data as its reference. It knows provinces, cities, districts, subdistricts, and their postal codes. It doesn't know roads yet.

That means `Citarum`, `Bandung Wetan`, `Kota Bandung`, `Jawa Barat`, and `40115` may help resolve the address.

`LLRE Martadinata` cannot help yet because road names cannot be found in the Kemendagri data.

## Why Matching Individual Words isn't Enough

Before matching begins, the engine normalizes the address. It standardizes the text and removes administrative prefixes such as `kota` and `kecamatan`.

A basic matcher could then split the address by spaces and search for every word. This logic works for `Citarum`. A simple exact match can find it in the reference data.

But how about `Bandung Wetan`? Splitting the phrase by spaces gives us:
```text
Bandung
Wetan
```

`Bandung` exists at several administrative levels and in several locations. `Wetan` doesn't identify the district on its own.
The original phrase was clear. Splitting it created weaker evidence.

So the engine checks whether nearby words form a longer name found in the reference data. When it finds `Bandung Wetan`, it keeps the complete phrase instead of also taking `Bandung` from the same position.

This is **longest-phrase matching**. The idea is simpler than the name: if several words form one known place name, keep them together.

After this step, the engine has a collection of recognized phrases and the administrative entities they may refer to. At this point, no location chosen yet.

## One Phrase Can Point to Several Locations

Finding a name isn't the same as knowing which place the writer meant.

Each recognized phrase may point to one or more administrative entities. The engine compares their hierarchies and groups compatible matches into unique candidates.

`Citarum`, `Bandung Wetan`, `Kota Bandung`, and `Jawa Barat` belong to the same administrative chain. Together, they form one candidate:

```text
Jawa Barat
└── Kota Bandung
    └── Bandung Wetan
        └── Citarum
```

Different evidence may discover the same hierarchy more than once. The engine removes those duplicates before scoring, so one consistent hierarchy remains one candidate.

`Bandung` behaves differently. The name exists at several administrative levels and under different hierarchies. In the current reference data, that single phrase produces 19 unique candidates.

Some examples are can be seen here:

![Bandung at every level of the hierarchy](https://samaita.com/projects/address-quality/images/address-quality-find-bandung-every-level-hierarchy.png)

Every row is a different candidate, even though they all started from the same recognized phrase: `Bandung`.

The engine cannot choose one just because its name matched. It needs other evidence, such as a district, city, province, or postal code, to determine which hierarchy is more compatible with the complete address.

Postal codes work a little differently. They can help find matching subdistricts and support an existing candidate, but they do not start a normal candidate in this part of the pipeline.

## Which Candidate Explains the Address Best?

Now the engine compares every candidate with all available evidence.

![High-confidence candidate comparison](https://samaita.com/projects/address-quality/images/address-quality-confidence-high-example.png)

For the expected candidate, the pieces agree:

```text
Citarum belongs to Bandung Wetan
Bandung Wetan belongs to Kota Bandung
Kota Bandung belongs to Jawa Barat
40115 supports Citarum
```

A different candidate may also match `Citarum` or `Bandung`.

That makes it possible, but it doesn't make it equally strong. If it cannot explain the district, city, province, or postal code, its compatibility with the whole address is lower.

The confidence score combines several signals:

- whether the engine found an exact match
- whether the hierarchy is valid
- which administrative levels match the evidence
- whether the postal code supports the candidate
- whether several pieces of evidence support the same hierarchy

The candidate with the highest confidence ranks first.

If two candidates have the same score, the engine prefers the one with more administrative levels filled, then the one with fewer conflicts.

If the top two valid candidates are less than `0.1` apart, the alpha marks the result as ambiguous instead of hiding the close result.

The score isn't proof that a location is correct. It answers a narrower question:

> Which candidate is most compatible with all the evidence the engine can recognize?

That is stronger than trusting the first name match, but it still depends on the evidence available.

## What If the Useful Evidence Is Missing?

Now consider this address:

```text
JL. GATOT SUBROTO NO.86 BANDUNG
```

A person may assume it points to Kota Bandung. The alpha version cannot safely make that assumption.

`Gatot Subroto` is a road name. Since the Kemendagri data doesn't contain roads, the alpha cannot use it to resolve the location.

`No.86` is a house number, not administrative evidence.

The only recognized administrative evidence is `Bandung`. That evidence is valid, but not very helpful. `Bandung` can refer to several entities and produce several candidates.

There is no recognized district, subdistrict, province, or postal code to make one candidate clearly more compatible than the others.

![Low-confidence candidate comparison](https://samaita.com/projects/address-quality/images/address-quality-confidence-low-example.png)

The engine can still rank the candidates. Kota Bandung may appear first because it has the highest score among the available options.

But the API returns the result as `INCOMPLETE`, with low confidence and sets of code reason that explain of what is missing.

The first candidate is the best available interpretation. It isn't proof that the address has been fully resolved.

Scoring the same weak evidence more carefully cannot create information that the address and reference data don't provide.

That is where the current alpha version met its definition of done.

[Address Quality](https://samaita.com/projects/address-quality/) can keep `Bandung Wetan` together, build possible hierarchies, remove duplicates, and rank them against the available evidence.

It still cannot use a road name to solve an address that only provides `Bandung` as administrative evidence.

## What's Next?

Having a working API for a few addresses doesn't mean it is useful yet.

Two clean examples can make the logic look better than it really is.

Real addresses aren't that simple. People skip districts, mix old and new names, use road names as landmarks, mistype subdistricts, or include postal codes that conflict with the rest of the address.

So the next question is:

> How often does the engine choose the correct hierarchy across many messy addresses?

The alpha version is useful as a starting point. It can find evidence, build candidates, remove duplicates, and rank the most compatible hierarchy.

Now I need to test it against more addresses, find where it fails, and separate three things:

- cases the engine resolves correctly
- cases the engine should mark as uncertain
- cases where the benchmark or expected answer is wrong

That is where the next part begins: measuring the engine against real data, not just trusting the examples that make it look good.