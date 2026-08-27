+++
title = 'Where Does Google Maps API Fit in Address Validation?'
date = 2026-08-27T14:21:40+07:00
draft = false
tags = ['address-quality', 'google-maps', 'geocoding']
description = 'Google is very good at finding places. But does that mean it should be the first tool for validating Indonesian addresses? This draft looks at what the benchmark showed and where Google fits in the pipeline.'
series = ['Address Quality']
part = 3
+++

One question keeps coming up while I build [**Address Quality**](https://samaita.com/projects/address-quality/):

**Why not just use Google Maps API?**

If I have a messy address, Google Maps API can turn it into a structured result. It also knows roads, buildings, businesses, and landmarks that my administrative data doesn't. It is the top of mind when we are trying to solve an address problem.

Take this place name:

> Paskal Hyper Square

On its own, that doesn't tell me much about province, city, district, or subdistrict. Yet, Google can still make sense of it.

So, to answer the question, I put Google into the benchmark.

## Google Became My Baseline

I have tested the [Address Quality V1 Validate API](https://samaita.com/projects/address-quality/docs) with a set of address as benchmark. I wanted a useful baseline if I were using Google Maps API instead.

So I took 106 addresses from the evaluation set and resolved them with Google Maps API. Then I compared the result against four administrative levels in the expected address:

- Province
- City
- District
- Subdistrict

Google Maps API returned a result for 104 of the 106 addresses. At first, that looked like a strong baseline. But a returned location was not necessarily the same location described by the input.

When I compared the administrative hierarchy, only 85 addresses matched all four expected levels. That left 21 addresses that did not fully match, including two where Google returned no result.

The raw numbers looked like this:

| Result | Count |
|---|---:|
| Found | 104 / 106 |
| Full hierarchy match | 85 / 106 |
| Did not fully mismatch | 21 / 106 |

That left 21 addresses that did not fully match the expected hierarchy, including two where Google did not return a result.
I don't think that means Google Maps API is wrong 20% of the time.

The benchmark can be wrong. Addresses can use old administrative names. They can contain aliases. They can even contain bad data. Two sources can also disagree about where a boundary belongs.

This was not a formal accuracy test of Google Maps API. It was a comparison against my tagged data, followed by a review of the disagreements.

So I went through the failures one by one. That turned out to be more useful than the accuracy number.

## When Google and Google Disagree

One of the failed address was this:

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

I sent the address address to Google Maps API' Geocoding API v4. It returned:

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

My first suspicion was the benchmark. If Google Maps API disagrees with my label, I should check the label first. But then I checked Google Maps itself.

I also send the identical address to [Address Quality V1 Validate API](https://samaita.com/projects/address-quality/docs)

Using the same address, Google Maps showed Citarum, Bandung Wetan, 40115. So my label is only align to Google Maps, but not the Google Maps API, Geocoding V4.

![Google can't agree on where is LLRE Martadinata No.97](https://samaita.com/projects/address-quality/images/address-quality-google-maps-api-llre-martadinata-case.png)

So I was no longer comparing my resolver against Google Maps API. I was looking at two Google products surfaces giving different administrative information for the same address.

I am not sure which one is right. Both results look reasonable.

## A Successful Geocode Is Not the Same as a Validated Address

That is where the difference matters. A geocoder is trying to answer a simple question:

```code
Where is this address?
```

[**Address Quality**](https://samaita.com/projects/address-quality/) has to answer another one too:

```code
Does this address agree with itself?
```

Take another example, the Cihampelas No. 7.
```text
JL. Cihampelas No.7, Pasir Kaliki, Kec. Cicendo, Kota Bandung, Jawa Barat 40171
```

The input already gives me:

- Pasir Kaliki
- Cicendo
- Kota Bandung
- Jawa Barat
- 40171

Those are not random words. They are evidence.

If I have Indonesian administrative data, I can check whether Cicendo belongs to Kota Bandung, whether the subdistrict belongs to that district, and whether the postal code supports that location.

Google Maps API gave me a different interpretation:

```text
Jl. Dr. Hatta Jl. Cihampelas No.7A,
Tamansari,
Kec. Bandung Wetan,
Kota Bandung,
Jawa Barat 40116
```

That does not look broken on its own.

But compare it with the input:

| Input / Expected | Geocoding API |
|---|---|
| Jl. Cihampelas No.7 | Jl. Cihampelas No.7A |
| Pasir Kaliki | Tamansari |
| Cicendo | Bandung Wetan |
| Kota Bandung | Kota Bandung |
| 40171 | 40116 |

It just is not consistent with several useful parts of the input. That is a different kind of failure.
It is not "not found", but something else entirely.

![Google somehow decide Cihampelas 7 Pasir Kaliki is Cihampelas 7A Tamansari](https://samaita.com/projects/address-quality/images/address-quality-google-maps-api-cihampelas-case.png)

## But I Cannot Inspect Why

I don't expect Google to explain its internals to me. Who am I, the Pentagon?

But that result from Google Maps API becomes a limitation for address validation. When the API pick Jl. Cihampelas No.7 as No.7A, I can't see why. When it chooses LLRE Martadinata as Cihapit instead of Citarum, no clue. It is what it is, a mytery.

I also cannot tell whether Pasir Kaliki and 40171 were considered and rejected, or whether they never influenced the result at all.

For many products, that is fine. You only need the final place.

For [**Address Quality**](https://samaita.com/projects/address-quality/) project, I want more than that.

I want the system to show me the evidence it used. I want to know when the input supported the result, when it only partly supported it, and even when it disagreed. **I need the WHY**.

Something like this:

```text
Input evidence:
Cicendo
40171

External result:
Bandung Wetan
40116

Result:
conflicting_evidence
```

That kind of output is useful even before I know which side is correct.

## Google Maps Solves a Different Problem

This benchmark is not to convince me to stop using Google Maps API. It made its role clearer.

Consider a case like this:

```text
MALL PASKAL L1-10, 10T, L12
```

the [**Address Quality**](https://samaita.com/projects/address-quality/) has almost nothing to work with, yet.

No evidence of province, city, district, and subdistrict.
Not even a useful postal code.

But there is one useful clue: `MALL PASKAL`. [**Address Quality**](https://samaita.com/projects/address-quality/) administrative data does not know what Paskal is. Google does.

It knows places, businesses, and landmarks that an administrative dataset was never meant to model. Trying to rebuild that in [**Address Quality**](https://samaita.com/projects/address-quality/) would turn the project into something else.

It is not to replace Google Maps API, but to help when needed.

## Local First, Google Maps API Later

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

When the address already contains province, city, district, and subdistrict, I can check those pieces against a hierarchy I control. When the address is thin, messy, or landmark-based, I can hand it off to a geocoder that has broader place knowledge. And when the two disagree, that disagreement becomes a signal instead of noise.

There are practical benefits too.

Fewer external requests mean less API cost, less network dependency, and less exposure to quotas or behavior changes. But that is not the main reason. The main reason is control. I want the evidence to stay visible and testable.

After running the benchmark, my answer is simpler than before: **I probably should use Google Maps API. Just not for everything**.

The local resolver can first check the administrative evidence already present in the address. Google can help when that evidence is not enough. And when the two disagree, I do not have to silently pick one. The disagreement itself can become part of the result.

The next thing I need to figure out is the boundary: when is local evidence enough to trust, and when should I ask Google for help?