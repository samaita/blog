+++
title = 'How I Benchmark Address Quality'
date = 2026-09-09T17:08:45+07:00
draft = false
tags = ['address-quality']
+++

In the [previous post](https://samaita.com/posts/how-i-built-address-quality-api-to-read-indonesian-addresses/), I wrote about how Address Quality interprets an address. It extracts evidence, builds possible candidates, then ranks them based on how well they match the available evidence.

While building it, I tested the engine with addresses like this:
```text
Jl. Wastukencana No. 2, Babakan Ciamis,
Sumur Bandung, Kota Bandung, Jawa Barat
```
It works.

This is just a happy flow. Another person could input the address in an unexpected or completely different way.
They may abbreviate something, skip part of the administrative hierarchy, put the road name first, or simply write the same address differently from how I would write it.

We could probably still understand it. My engine is not that capable yet. Testing with addresses that I write myself doesn't tell me enough.

**What happens when I give the engine addresses written by other people?**

I needed a larger set of addresses that didn't come from me, together with a way to check whether the engine actually interpreted them correctly.

And once I had that, I wanted to be able to run the same test again whenever I changed the engine. I expect it to be better, or at least not break something that worked before.

## I Needed a Benchmark

I gathered 106 different addresses available online, all from Bandung. Most of them are normal addresses. I didn't intentionally make them messy or fill the dataset with difficult edge cases.

For example:

```text id="xjd2te"
Address:
Jl. Wastukencana No. 2, Babakan Ciamis,
Sumur Bandung, Kota Bandung, Jawa Barat

Expected:
Province: Jawa Barat
City: Kota Bandung
District: Sumur Bandung
Subdistrict: Babakan Ciamis
```

I repeated this for all 106 addresses. At this point I had the input and, based on my manual checking, what I believed the correct answer should be.

That gave me something to compare the engine against.

## Now I Have Two Results to Compare

The benchmark takes each address and sends it to the `/validate` endpoint. The API interprets it and returns the province, city, district, and subdistrict it thinks the address points to.

For every address, I now have two answers:

```text id="c5b2u7"
Address
   │
   ├── Manual label
   │      └── Province → City → District → Subdistrict
   │
   └── API result
          └── Province → City → District → Subdistrict
```

The benchmark compares them. If the API points to the same province, city, district, and subdistrict as my manual label, I count it as an exact match. I also keep the result for each level separately, so I can see where the engine starts getting things wrong.

The benchmark itself is not complicated:

1) get an address
2) label it manually
3) call the API
4) compare label & API result

Repeatable and consistent.

## The First Result: 49.1%
For the main accuracy number, I use an exact match. Province, city, district, and subdistrict all need to point to the same place as my manual label.

After running all 106 addresses through the API, this is what I got:

| Level               |   Correct |
| ------------------- | --------: |
| Province            |     82.1% |
| City                |     76.4% |
| District            |     71.7% |
| Subdistrict         |     51.9% |
| **All four levels** | **49.1%** |

Only 52 of the 106 addresses passed that check. Yup, accurate for only **<u>49.1%</u>**. Lower than a coin toss. LOL.

Strangely enough, I was still happy with it. Not because 49.1% is good, but because I finally had something I didn't have before: a baseline.


![Benchmark Result 0.1.0 Alpha](https://samaita.com/projects/address-quality/images/address-quality-benchmark-0.1.0-alpha.png)

The percentage only shows the summary. You can see full report in the [full benchmark and analysis](https://samaita.com/projects/address-quality/benchmark/v0.1.0-alpha)



## Now I Can Run It Again
Before having a benchmark, I could change the matching or ranking logic, try several addresses manually, and decide that the result looked better. The problem is that "_looks better_" doesn't tell me whether the change improved the engine as a whole.

Now I can make a change and run the same benchmark again with one command.

```bash id="gq8a3x"
make benchmark
```

The same 106 addresses go through the same API and get compared against the same labels. If the result changes from 49.1%, I have somewhere to start investigating.

I can check which addresses changed, which administrative level improved, and whether fixing one case broke another. The benchmark doesn't tell me what I should change. It tells me whether my change actually made things better.

That is the loop I wanted:
**change → benchmark → compare**

## But Can I Trust the Benchmark?
There are some obvious limits to the 49.1% number. All 106 addresses are from Bandung, so I cannot use this benchmark to claim that Address Quality has 49.1% accuracy across Indonesia. The number only tells me how the engine performed against these particular addresses and labels.

But there is another assumption that matters even before I think about expanding the dataset.

**I assume my manual labels are correct.**

I labeled 106 addresses by hand. If I made a mistake, the API could return the correct location and the benchmark would count it as wrong. The opposite could happen too: a wrong API result could accidentally agree with a wrong label.

So I had a baseline, but before changing the engine based on that baseline, I needed to know whether I could trust it.
