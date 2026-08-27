+++
title = 'Why Not Just Use Google Maps?'
date = 2026-08-27T14:21:40+07:00
draft = true
tags = ['address-quality', 'google-maps', 'geocoding']
description = 'Google is very good at finding places. But does that mean it should be the first tool for validating Indonesian addresses? This draft looks at what the benchmark showed and where Google fits in the pipeline.'
series = ['Address Quality']
part = 3
+++

One question keeps coming up while I build [Address Quality](https://samaita.com/projects/address-quality/):

Why not just use Google Maps?

If I have a messy address, Google can often turn it into a structured result. It also knows roads, buildings, businesses, and landmarks that my administrative data does not.

Take this place name:

> Paskal Hyper Square

On its own, that does not tell me much about province, city, district, or subdistrict.

Google can still make sense of it.

So I stopped treating the question as a distraction. I put Google into the benchmark.

## I started with Google as a baseline

Before I tested my own resolver, I wanted a useful baseline.

So I took 106 addresses from the evaluation set and resolved them with Google Maps. Then I compared the result against four administrative levels in the expected address:

- Province
- City
- District
- Subdistrict

Google found a result for 104 of the 106 addresses.

That part did not surprise me.

What surprised me was what happened next.

Only 85 addresses matched all four expected administrative levels. That left 21 addresses where at least one level disagreed.

The raw numbers looked like this:

| Result | Count |
|---|---:|
| Found | 104 / 106 |
| Full hierarchy match | 85 / 106 |
| Hierarchy mismatch | 21 / 106 |

I do not think that means Google Maps is wrong 20% of the time.

The benchmark can be wrong. Addresses can use old administrative names. They can contain aliases. They can even contain bad data. Two sources can also disagree about where a boundary belongs.

This was not a formal accuracy test of Google Maps. It was a comparison against my tagged data, followed by a review of the disagreements.

So I went through the failures one by one.

That turned out to be more useful than the accuracy number.

## When Google and Google disagree

One failed address was this:

```text
JL. LLRE MARTADINATA ST NO.97,
CITARUM,
BANDUNG WETAN,
BANDUNG CITY,
WEST JAVA 40115
```

The expected hierarchy was:

- Jawa Barat
- Kota Bandung
- Bandung Wetan
- Citarum
- 40115

My first suspicion was the benchmark.

If Google disagrees with my label, I should check the label first.

So I sent the address to Google's Geocoding API v4.

It returned:

```json
{
  "postalCode": "40113",
  "administrativeArea": "West Java",
  "locality": "Bandung Wetan, Bandung City",
  "sublocality": "Cihapit",
  "addressLines": [
    "LLRE Martadinata St No.97"
  ]
}
```

Now the comparison looked like this:

| Input / expected | Geocoding API |
|---|---|
| Citarum | Cihapit |
| Bandung Wetan | Bandung Wetan |
| 40115 | 40113 |

That was plausible.

But then I checked Google Maps itself.

Google Maps showed Citarum, Bandung Wetan, 40115.

So I was no longer comparing my resolver against Google.

I was looking at two Google surfaces giving different administrative information for the same address.

[IMAGE PLACEHOLDER. Side-by-side screenshot showing the Google Maps result for LLRE Martadinata No.97 and the Geocoding API v4 response. Highlight Citarum/40115 versus Cihapit/40113.]

I am not sure which one is right.

That is the point. Both results look reasonable.

## A successful geocode is not the same as a validated address

That is where the difference matters.

A geocoder is trying to answer a simple question:

Where is this address?

Address Quality has to answer another one too:

Does this address agree with itself?

Take the Cihampelas example.

The input already gives me:

- Pasir Kaliki
- Cicendo
- Kota Bandung
- Jawa Barat
- 40171

Those are not random words. They are evidence.

If I have Indonesian administrative data, I can check whether Cicendo belongs to Kota Bandung, whether the subdistrict belongs to that district, and whether the postal code fits.

Google's API gave me a different interpretation:

```text
Jl. Dr. Hatta Jl. Cihampelas No.7A,
Tamansari,
Kec. Bandung Wetan,
Kota Bandung,
Jawa Barat 40116
```

That does not look broken on its own.

But compare it with the input:

| Input | Geocoding API |
|---|---|
| No.7 | No.7A |
| Pasir Kaliki | Tamansari |
| Cicendo | Bandung Wetan |
| 40171 | 40116 |

The result is valid-looking.

It just is not consistent with several useful parts of the input.

That is a different kind of failure.

It is not "not found."

It is "found something else that also looks real."

[IMAGE PLACEHOLDER. Comparison of the original Cihampelas No.7 input, Google Maps result, and Geocoding API result. Highlight No.7 vs No.7A, Cicendo vs Bandung Wetan, and 40171 vs 40116.]

## The black box is the limitation

I do not expect Google to explain its internals to me.

That would be a strange request.

But for address validation, the black box is a real limit.

When the API changes No.7 into No.7A, I cannot see why.

When it chooses Bandung Wetan instead of Cicendo, I cannot see which clue mattered more.

I also cannot tell whether Pasir Kaliki and 40171 were considered and rejected, or whether they never influenced the result at all.

For many products, that is fine. You only need the final place.

For this project, I want more than that.

I want the system to show me the evidence it used.

I want to know when the input supported the result, when it only partly supported it, and when it disagreed.

Something like this:

```text
Input evidence:
Cicendo
40171

External result:
Bandung Wetan
40116

Result:
conflicting evidence
```

That kind of output is useful even before I know which side is correct.

## Google still solves a different problem

This benchmark did not convince me to stop using Google.

It made its role clearer.

Consider a case like this:

```text
MALL PASKAL L1-10, 10T, L12
```

My administrative resolver has almost nothing to work with.

No province.
No city.
No district.
No subdistrict.
Not even a useful postal code.

But there is a place name.

That is where Google has a huge advantage.

It knows places, businesses, and landmarks that an administrative dataset was never meant to model.

Trying to rebuild that in Address Quality would turn the project into something else.

I do not need another Google Maps.

I need to know when I actually need Google Maps.

## Maybe Google belongs after local evidence, not before it

That changes the shape of the pipeline.

Instead of starting every address with an external geocoder:

```text
Address
  -> Google
  -> Structured address
```

I can start by asking what the address already tells me:

```text
Address
  -> Extract administrative evidence
  -> Check hierarchy
  -> If enough evidence, resolve locally
  -> If not enough evidence, call external geocoder
```

That lets the local resolver do the work it is good at.

When the address already contains province, city, district, and subdistrict, I can check those pieces against a hierarchy I control.

When the address is thin, messy, or landmark-based, I can hand it off to a geocoder that has broader place knowledge.

And when the two disagree, that disagreement becomes a signal instead of noise.

There are practical benefits too.

Fewer external requests mean less API cost, less network dependency, and less exposure to quotas or behavior changes.

But that is not the main reason.

The main reason is control.

I want the evidence to stay visible and testable.

## So why not just use Google Maps?

After running the benchmark, my answer is simpler than before:

I probably should use Google.

Just not for everything.

Google is good at places, roads, businesses, and landmarks.

My local resolver is designed to check whether an address already contains consistent administrative evidence.

Google gives me broader place knowledge. The local resolver gives me evidence I can inspect and test.

That is why the real question is not whether Google can help.

It can.

The real question is where it should sit in the pipeline, and what I do when it disagrees with the address that already exists in front of me.

That is the part I want Address Quality to solve.

The next step is not to replace Google.

It is to decide when to trust local evidence, when to ask Google, and when to treat the mismatch itself as useful information.
