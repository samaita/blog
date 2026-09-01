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

My proposed solution was to put the effort to an API. You provide the address, the API interprets it, then you confirm the result.

So I built [Address Quality](https://samaita.com/projects/address-quality/), an experiment for turning free-text Indonesian addresses into structured administrative data.

The first alpha version tries to answer two questions:

1. Which parts of the address can it recognize?
2. Which possible location matches those parts best?

That sounds simple. But something simple doesn't always easy to solve.

![Address Quality landing page](https://samaita.com/projects/address-quality/images/landing-page.png)


## The Different Way of Human and Computer In Understanding Address

Take this address:

```text
JL. LLRE MARTADINATA ST NO.97, CITARUM, Kec. BANDUNG WETAN,
KOTA BANDUNG, JAWA BARAT 40115
```

It contains almost everything we need:

```text
- Jawa Barat :check:
- Kota Bandung :check:
- Bandung Wetan :check:
- Citarum :check:
- 40115 as Postal Code :check:
```

A person familiar with Indonesia's address can read it without much effort.
However, software need more efforts. Which words trully matter? Does each words related to each other? 

I call a phrase **evidence** when the engine can recognize it and find it in the reference data. Evidence doesn't always help. A common name may point to many places. But at least the engine knows that the phrase exists and what it may refer to.

The alpha version uses Kemendagri administrative data as its reference. It knows provinces, cities, districts, subdistricts, and their postal codes. It doesn't know roads yet.

That means `Citarum`, `Bandung Wetan`, `Kota Bandung`, `Jawa Barat`, and `40115` may help resolve the address actual location. `LLRE Martadinata` cannot help, because road names can't be found in Kemendagri administrative data.

## Exact Matching vs Longest Phrase Matching

Before any algorithm run, it is only make sense to do Normalization. During normalization, administrative prefixes such as `kota` and `kecamatan` are removed. The remaining place name is then matched against the reference data. It might work as clue, but I want to test wether without those prefix, the API can fulfill it purpose.

Then a basic matcher could split the address by spaces and search for every word.

That would work for `Citarum`, simple exact match would match to data reference. It wouldn't work well for `Bandung Wetan`.

Splitting the phrase by space gives us:

```text
Bandung
Wetan
```

`Bandung` exists at several administrative levels and in several locations. `Wetan` doesn't identify the district on its own.
The original phrase was clear. Splitting it created a weaker clue.

So the engine checks whether nearby words form a longer name found in the reference data. When it finds `Bandung Wetan`, it keeps the full phrase instead of also taking `Bandung` from the same position.

This is **longest-phrase matching**. The idea is simpler than the name: if several words form one known place name, keep them together.

After this step, the engine has recognized phrases and every administrative entity they may refer to. Bandung for example, it would list all location that related to Bandung as City, District, and Subdistrict. The algorithm has not chosen a specific location.

## One phrase can point to several locations

Finding a name isn't the same as knowing which place the writer meant.

Suppose `Citarum` matches more than one entity in the reference data. Each match belongs to its own district, city, and province. Choosing the first database row would only hide that ambiguity.

Instead, every unique administrative entity can start a **candidate**.

A candidate is one possible interpretation of the address. It may contain only the level where it was found:

Citarum only found as subdistrict, so Citarum generate only one candidate to calculate. Another example is Bandung. It generate a lot of candidates. Bandung is listed as city, district, and subdistrict.

![Bandung's At Every Level of Hierarchy](https://samaita.com/projects/address-quality/images/address-quality-find-bandung-every-level-hierarchy.png)

The engine builds one candidate for each unique province, city, district, or subdistrict entity it finds. The same phrase can therefore create several candidates when it matches several entities.

Postal code works a little differently. It can resolve matching subdistricts and later support a candidate, but it doesn't start a normal candidate in this part of the pipeline.

## Which candidate explains the address best?

Now the engine compares every candidate with all available evidence.

![High Confidence Example](https://samaita.com/projects/address-quality/images/address-quality-confidence-high-example.png)

For the expected candidate, the pieces agree:

```text
Citarum belongs to Bandung Wetan
Bandung Wetan belongs to Kota Bandung
Kota Bandung belongs to Jawa Barat
40115 supports Citarum
```

A different candidate may also match `Citarum` or `Bandung`. That makes it possible, but it doesn't make it equally strong. If it cannot explain the district, city, province, or postal code, its compatibility with the whole address is lower.

The confidence score combines several signals:

- whether the engine found an exact match
- whether the hierarchy is valid
- which administrative levels match the evidence
- whether the postal code supports the candidate
- whether several pieces of evidence support the same entity

The candidate with the highest confidence ranks first. If two candidates have the same score, the engine prefers the one with more administrative levels filled, then the one with fewer conflicts.

If the top two valid candidates are less than `0.1` apart, the alpha marks the result as ambiguous instead of hiding the close result.

The score isn't proof that a location is correct. It answers a narrower question:

> Which candidate is most compatible with all the evidence it can recognize?

That is stronger than trusting the first name match, but it still depends on the evidence available.

## What if the useful evidence is missing?

Now consider this address:

```text
JL. GATOT SUBROTO NO.86 BANDUNG
```

A person may assume it points to Kota Bandung. The alpha version cannot safely make that assumption.

`Gatot Subroto` is a road name. Since the Kemendagri data doesn't contain roads, the alpha cannot resolve it to a location. The only recognized administrative evidence is `Bandung`.

That evidence is valid, but not very helpful. `Bandung` can refer to several entities and produce several candidates. There is no recognized district, subdistrict, province, or postal code to make one of them clearly more compatible than the others.

![Bandung is Everywhere](https://samaita.com/projects/address-quality/images/address-quality-find-bandung-every-level-hierarchy.png)

The engine can still rank the candidates. But scoring the same weak evidence more carefully cannot create information that the address and reference data don't provide. However, it still return result with low confidence with it own reason.

That is where the current alpha version stops.

[Address Quality](https://samaita.com/projects/address-quality/) can keep `Bandung Wetan` together, build possible locations, remove duplicates, and rank them against the evidence. It still cannot use a road name to solve an address that only says `Bandung`.

![Low Confidence Example](https://samaita.com/projects/address-quality/images/address-quality-confidence-low-example.png)

## What's next?

Having a working API for a few addresses doesn't mean it is useful yet.

Two clean examples can make the logic look better than it is. Real addresses aren't that simple. People skip districts, mix old and new names, write road names as landmarks, mistype subdistricts, or include postal codes that don't match with the rest of the address.

So the next question is:

> How accurate does it choose the right hierarchy across many messy addresses?

The alpha version is already useful as a starting point. It can find evidence, build candidates, remove duplicates, and rank the most compatible hierarchy. I need to test it against more addresses, find where it fails, and separate three things:

- cases the engine resolves correctly
- cases the engine should mark as uncertain
- cases where the benchmark or expected answer is wrong

That is where the next part begins: measuring the engine against real data, not just trusting the examples that make it look good.